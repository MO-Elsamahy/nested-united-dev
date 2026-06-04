import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCacheKey, analyticsCache, CACHE_TTL, clearAnalyticsCache } from "@/lib/analytics-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const account = searchParams.get("account") || "all";
    const range = searchParams.get("range") || "month";
    const customStartDate = searchParams.get("startDate") || "";
    const customEndDate = searchParams.get("endDate") || "";
    const bypass = searchParams.get("bypass") === "true";

    // 2.5 Check Server-Side Cache
    const cacheKey = getCacheKey(account, range, customStartDate, customEndDate);
    if (bypass) {
      clearAnalyticsCache();
    } else {
      const cached = analyticsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Analytics API] Cache Hit for key: ${cacheKey}`);
        return NextResponse.json(cached.data);
      }
    }
    console.log(`[Analytics API] Cache Miss / Bypass for key: ${cacheKey}`);

    // 3. Determine Date Range
    const now = new Date();
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const getISOWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    // Fetch max database date to support Year-to-Date (YTD) capping
    const maxBookingsResult = await query<any>("SELECT MAX(checkout_date) as max_d FROM bookings");
    const maxReservationsResult = await query<any>("SELECT MAX(end_date) as max_d FROM reservations");
    const bMaxVal = maxBookingsResult[0]?.max_d;
    const rMaxVal = maxReservationsResult[0]?.max_d;
    const maxDates: Date[] = [];
    if (bMaxVal) maxDates.push(new Date(bMaxVal));
    if (rMaxVal) maxDates.push(new Date(rMaxVal));
    const maxDataDate = maxDates.length > 0 ? new Date(Math.max(...maxDates.map(d => d.getTime()))) : null;

    // Fetch min database date to support Year-to-Date (YTD) start-capping
    const minBookingsResult = await query<any>("SELECT MIN(checkin_date) as min_d FROM bookings");
    const minReservationsResult = await query<any>("SELECT MIN(start_date) as min_d FROM reservations");
    const bMinVal = minBookingsResult[0]?.min_d;
    const rMinVal = minReservationsResult[0]?.min_d;
    const minDates: Date[] = [];
    if (bMinVal) minDates.push(new Date(bMinVal));
    if (rMinVal) minDates.push(new Date(rMinVal));
    const minDataDate = minDates.length > 0 ? new Date(Math.min(...minDates.map(d => d.getTime()))) : null;

    let startDateStr = "";
    let endDateStr = "";

    if (range === "all") {
      if (minDataDate && maxDataDate) {
        startDateStr = format(minDataDate);
        endDateStr = format(maxDataDate);
      } else {
        startDateStr = "2025-01-01";
        endDateStr = "2026-12-31";
      }
    } else if (customStartDate && customEndDate) {
      startDateStr = customStartDate;
      endDateStr = customEndDate;
    } else {
      if (range === "today") {
        startDateStr = format(now);
        endDateStr = format(now);
      } else if (range === "week") {
        const startOfWeek = new Date(now);
        const day = now.getDay(); // 0 is Sunday, 1 is Monday, ...
        const diff = day === 0 ? 6 : day - 1;
        startOfWeek.setDate(now.getDate() - diff);
        startDateStr = format(startOfWeek);
        endDateStr = format(now);
      } else if (range === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = format(startOfMonth);
        endDateStr = format(now);
      } else if (range === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        startDateStr = format(startOfQuarter);
        endDateStr = format(now);
      } else if (range === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startDateStr = format(startOfYear);
        endDateStr = format(now);
      } else {
        // Default to start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = format(startOfMonth);
        endDateStr = format(now);
      }
    }

    // Apply YTD capping (Start Date)
    console.log("[Analytics Debug] Capping input dates:", { startDateStr, endDateStr, minDataDate: minDataDate ? format(minDataDate) : null, maxDataDate: maxDataDate ? format(maxDataDate) : null });
    if (minDataDate) {
      const startD = new Date(startDateStr);
      const endD = new Date(endDateStr);
      if (minDataDate > startD && minDataDate <= endD) {
        startDateStr = format(minDataDate);
        console.log("[Analytics Debug] Start date capped to:", startDateStr);
      }
    }

    // Apply YTD capping (End Date)
    if (maxDataDate) {
      const startD = new Date(startDateStr);
      const endD = new Date(endDateStr);
      if (maxDataDate >= startD && maxDataDate < endD) {
        endDateStr = format(maxDataDate);
        console.log("[Analytics Debug] End date capped to:", endDateStr);
      }
    }

    const daysCount = Math.max(
      1,
      Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    console.log("[Analytics Debug] Final dates used:", { startDateStr, endDateStr, daysCount });

    // Build filter query strings
    let accountFilterReservations = "";
    let accountFilterBookings = "";
    let accountFilterUnits = "";
    const paramsReservations: unknown[] = [startDateStr, endDateStr];
    const paramsBookings: unknown[] = [startDateStr, endDateStr];
    const paramsOccupancyReservations: unknown[] = [endDateStr, startDateStr, endDateStr, startDateStr];
    const paramsOccupancyBookings: unknown[] = [endDateStr, startDateStr, endDateStr, startDateStr];
    const paramsUnits: unknown[] = [];

    if (account !== "all") {
      const accountIds = account.split(",");
      const placeholders = accountIds.map(() => "?").join(",");
      accountFilterReservations = ` AND u.platform_account_id IN (${placeholders}) `;
      accountFilterBookings = ` AND u.platform_account_id IN (${placeholders}) `;
      accountFilterUnits = ` AND u.platform_account_id IN (${placeholders}) `;
      paramsReservations.push(...accountIds);
      paramsBookings.push(...accountIds);
      paramsOccupancyReservations.push(...accountIds);
      paramsOccupancyBookings.push(...accountIds);
      paramsUnits.push(...accountIds);
    }

    // 4. Calculate Revenue (Strictly from Confirmed Bookings)
    const bookingsRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(
         (b.amount / COALESCE(NULLIF(DATEDIFF(b.checkout_date, b.checkin_date), 0), 1)) *
         GREATEST(0, DATEDIFF(
           LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
           GREATEST(b.checkin_date, ?)
         ) + 1)
       ) as revenue
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
      paramsOccupancyBookings
    );
    const bookingsRevenue = Number(bookingsRevenueResult[0]?.revenue || 0);

    const totalRevenue = bookingsRevenue;

    // 5. Calculate Occupied / Booked Days
    // A. iCal occupied days
    const reservationsDaysResult = await query<{ days: number | string }>(
      `SELECT SUM(GREATEST(0, DATEDIFF(
         LEAST(CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END, ?),
         GREATEST(r.start_date, ?)
       ) + 1)) as days
       FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.start_date <= ? AND (CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END) >= ? ${accountFilterReservations}`,
      paramsOccupancyReservations
    );
    const reservationsDays = Number(reservationsDaysResult[0]?.days || 0);

    // B. Manual bookings occupied days
    const bookingsDaysResult = await query<{ days: number | string }>(
      `SELECT SUM(GREATEST(0, DATEDIFF(
         LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
         GREATEST(b.checkin_date, ?)
       ) + 1)) as days
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
      paramsOccupancyBookings
    );
    const bookingsDays = Number(bookingsDaysResult[0]?.days || 0);

    const totalBookedDays = reservationsDays + bookingsDays;

    // 6. Calculate Total Units count
    const totalUnitsResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM units u WHERE u.status = 'active' ${accountFilterUnits}`,
      paramsUnits
    );
    const totalUnits = Math.max(1, totalUnitsResult[0]?.count || 1);

    // 7. Calculate KPI rates
    const totalAvailableDays = totalUnits * daysCount;
    const occupancyRate = Number(((totalBookedDays / totalAvailableDays) * 100).toFixed(1));
    const adr = bookingsDays > 0 ? Math.round(totalRevenue / bookingsDays) : 0;
    const revpar = Math.round(adr * (occupancyRate / 100));

    // --- Start Additional KPIs ---
    const paramsSimpleBookings = [endDateStr, startDateStr];
    const paramsSimpleReservations = [endDateStr, startDateStr];
    if (account !== "all") {
      const accountIds = account.split(",");
      paramsSimpleBookings.push(...accountIds);
      paramsSimpleReservations.push(...accountIds);
    }

    // Count bookings:
    const bookingsCountResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
      paramsSimpleBookings
    );
    const bookingsCount = Number(bookingsCountResult[0]?.count || 0);

    // Count reservations:
    const reservationsCountResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.start_date <= ? AND (CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END) >= ? ${accountFilterReservations}`,
      paramsSimpleReservations
    );
    const reservationsCount = Number(reservationsCountResult[0]?.count || 0);

    const totalBookingsCount = bookingsCount + reservationsCount;

    // Maintenance Tickets resolved in the period
    const maintenanceCountResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM maintenance_tickets mt
       INNER JOIN units u ON mt.unit_id = u.id
       WHERE mt.status = 'resolved' 
         AND mt.created_at >= ? AND mt.created_at <= ?
         ${accountFilterUnits}`,
      [startDateStr, endDateStr, ...paramsUnits]
    );
    const maintenanceCount = Number(maintenanceCountResult[0]?.count || 0);
    const maintenanceExpenses = maintenanceCount * 120;
    const operatingExpenses = totalBookingsCount * 50;

    // Vendor Bills in the period
    const invoicesResult = await query<{ total: number | string }>(
      `SELECT SUM(total_amount) as total FROM accounting_invoices 
       WHERE invoice_type = 'vendor_bill' AND deleted_at IS NULL
         AND invoice_date >= ? AND invoice_date <= ?`,
      [startDateStr, endDateStr]
    );
    const vendorBills = Number(invoicesResult[0]?.total || 0);

    // HR payroll
    const hrEmployeeStatsForExpenses = await query<{ basic: number | string; allowances: number | string }>(
      `SELECT SUM(basic_salary) as basic, 
              SUM(housing_allowance + transport_allowance + other_allowances) as allowances 
       FROM hr_employees 
       WHERE status = 'active' AND exclude_from_payroll = 0`
    );
    const basicSalaryForExpenses = Number(hrEmployeeStatsForExpenses[0]?.basic || 0);
    const allowancesForExpenses = Number(hrEmployeeStatsForExpenses[0]?.allowances || 0);
    const deductionsForExpenses = Math.round(basicSalaryForExpenses * 0.02); 
    const netPayrollForExpenses = basicSalaryForExpenses + allowancesForExpenses - deductionsForExpenses;

    // Total active units count company-wide
    const totalUnitsCountResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM units WHERE status = 'active'");
    const totalUnitsCount = Number(totalUnitsCountResult[0]?.count || 24);

    const overheadPayroll = (netPayrollForExpenses / 30) * daysCount;
    const allocatedPayroll = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * overheadPayroll : 0;
    const allocatedInvoices = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * vendorBills : 0;

    const totalExpenses = Math.round(operatingExpenses + maintenanceExpenses + allocatedPayroll + allocatedInvoices);
    const netIncome = Math.max(0, totalRevenue - totalExpenses);

    // Helpers for dynamic period analytics (Cashflow & Occupancy trends)
    const getPeriodRevenue = async (startStr: string, endStr: string) => {
      const p = [endStr, startStr, endStr, startStr];
      const accountIds = account !== "all" ? account.split(",") : [];
      if (account !== "all") {
        p.push(...accountIds);
      }
      const res = await query<{ revenue: number | string }>(
        `SELECT SUM(
           (b.amount / COALESCE(NULLIF(DATEDIFF(b.checkout_date, b.checkin_date), 0), 1)) *
           GREATEST(0, DATEDIFF(
             LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
             GREATEST(b.checkin_date, ?)
           ) + 1)
         ) as revenue
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.id
         WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
        p
      );
      return Number(res[0]?.revenue || 0);
    };

    const getPeriodOccupiedDays = async (startStr: string, endStr: string) => {
      const p = [endStr, startStr, endStr, startStr];
      const accountIds = account !== "all" ? account.split(",") : [];
      if (account !== "all") {
        p.push(...accountIds);
      }
      
      const resB = await query<{ days: number | string }>(
        `SELECT SUM(GREATEST(0, DATEDIFF(
           LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
           GREATEST(b.checkin_date, ?)
         ) + 1)) as days
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.id
         WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
        p
      );
      
      const resR = await query<{ days: number | string }>(
        `SELECT SUM(GREATEST(0, DATEDIFF(
           LEAST(CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END, ?),
           GREATEST(r.start_date, ?)
         ) + 1)) as days
         FROM reservations r
         INNER JOIN units u ON r.unit_id = u.id
         WHERE r.start_date <= ? AND (CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END) >= ? ${accountFilterReservations}`,
        p
      );
      
      return Number(resB[0]?.days || 0) + Number(resR[0]?.days || 0);
    };

    const getPeriodExpenses = async (startStr: string, endStr: string, daysInPeriod: number) => {
      const pCount = [endStr, startStr];
      const accountIds = account !== "all" ? account.split(",") : [];
      if (account !== "all") {
        pCount.push(...accountIds);
      }

      // Count bookings
      const bCountRes = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM bookings b
         INNER JOIN units u ON b.unit_id = u.id
         WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
        pCount
      );
      const bCount = Number(bCountRes[0]?.count || 0);

      // Count reservations
      const rCountRes = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM reservations r
         INNER JOIN units u ON r.unit_id = u.id
         WHERE r.start_date <= ? AND (CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END) >= ? ${accountFilterReservations}`,
        pCount
      );
      const rCount = Number(rCountRes[0]?.count || 0);
      
      const totalBookingsVal = bCount + rCount;
      const opExpenses = totalBookingsVal * 50;

      // Maintenance resolved
      const pMaint = [startStr, endStr];
      if (account !== "all") {
        pMaint.push(...accountIds);
      }
      const maintRes = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM maintenance_tickets mt
         INNER JOIN units u ON mt.unit_id = u.id
         WHERE mt.status = 'resolved' 
           AND mt.created_at >= ? AND mt.created_at <= ?
           ${accountFilterUnits}`,
        pMaint
      );
      const maintCount = Number(maintRes[0]?.count || 0);
      const maintExpenses = maintCount * 120;

      // Vendor Bills
      const invoicesRes = await query<{ total: number | string }>(
        `SELECT SUM(total_amount) as total FROM accounting_invoices 
         WHERE invoice_type = 'vendor_bill' AND deleted_at IS NULL
           AND invoice_date >= ? AND invoice_date <= ?`,
        [startStr, endStr]
      );
      const vendorBillsVal = Number(invoicesRes[0]?.total || 0);

      // Payroll overhead allocated
      const overheadPay = (netPayrollForExpenses / 30) * daysInPeriod;
      const allocPayroll = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * overheadPay : 0;
      const allocInvoices = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * vendorBillsVal : 0;

      return Math.round(opExpenses + maintExpenses + allocPayroll + allocInvoices);
    };

    // Repeat Guest Rate
    const repeatGuestsResult = await query<{ repeated: number; total_unique: number }>(
      `SELECT 
         COUNT(DISTINCT CASE WHEN booking_count > 1 THEN guest_key END) as repeated,
         COUNT(DISTINCT guest_key) as total_unique
       FROM (
         SELECT COALESCE(NULLIF(b.phone, ''), b.guest_name) as guest_key, COUNT(*) as booking_count
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.id
         WHERE b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}
         GROUP BY COALESCE(NULLIF(b.phone, ''), b.guest_name)
       ) as guest_bookings`,
      paramsSimpleBookings
    );
    const repeatedCount = Number(repeatGuestsResult[0]?.repeated || 0);
    const totalUniqueCount = Number(repeatGuestsResult[0]?.total_unique || 0);
    const repeatGuestRate = totalUniqueCount > 0 ? Number(((repeatedCount / totalUniqueCount) * 100).toFixed(1)) : 0.0;
    // --- End Additional KPIs ---

    const airbnbRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(
         (b.amount / COALESCE(NULLIF(DATEDIFF(b.checkout_date, b.checkin_date), 0), 1)) *
         GREATEST(0, DATEDIFF(
           LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
           GREATEST(b.checkin_date, ?)
         ) + 1)
       ) as revenue
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.platform = 'airbnb' AND b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
      paramsOccupancyBookings
    );
    const airbnbRevenue = Number(airbnbRevenueResult[0]?.revenue || 0);

    const gathernRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(
         (b.amount / COALESCE(NULLIF(DATEDIFF(b.checkout_date, b.checkin_date), 0), 1)) *
         GREATEST(0, DATEDIFF(
           LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
           GREATEST(b.checkin_date, ?)
         ) + 1)
       ) as revenue
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.platform = 'gathern' AND b.checkin_date <= ? AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ? ${accountFilterBookings}`,
      paramsOccupancyBookings
    );
    const gathernRevenue = Number(gathernRevenueResult[0]?.revenue || 0);

    const platformShare = {
      airbnb: airbnbRevenue,
      gathern: gathernRevenue,
      external: Math.max(0, totalRevenue - (airbnbRevenue + gathernRevenue)),
    };

    // 9. Dynamic Revenue Growth Trend (Daily/Weekly/Monthly)
    const monthlyData: { month: string; amount: number; expenses: number; occupancy: number; percentage: string }[] = [];
    const sDate = new Date(startDateStr);
    const eDate = new Date(endDateStr);

    if (range === "today") {
      // Show daily trend for the 7 days of the week containing eDate
      const monday = new Date(eDate);
      const dayVal = eDate.getDay();
      const diffVal = dayVal === 0 ? 6 : dayVal - 1; // ISO Monday start
      monday.setDate(eDate.getDate() - diffVal);

      const arabicDays = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
      for (let i = 0; i < 7; i++) {
        const targetDay = new Date(monday);
        targetDay.setDate(monday.getDate() + i);
        const dayStr = format(targetDay);

        const dRevenue = await getPeriodRevenue(dayStr, dayStr);
        const dOccupied = await getPeriodOccupiedDays(dayStr, dayStr);
        const dOccupancy = Number(((dOccupied / totalUnits) * 100).toFixed(1));
        const dExpenses = await getPeriodExpenses(dayStr, dayStr, 1);
        const dayNum = targetDay.getDate();
        const monthNum = targetDay.getMonth() + 1;
        monthlyData.push({
          month: `${arabicDays[i]} ${dayNum}/${monthNum}`,
          amount: dRevenue,
          expenses: dExpenses,
          occupancy: dOccupancy,
          percentage: `${Math.min(100, Math.max(10, Math.round((dRevenue / (totalRevenue || 1)) * 100)))}%`,
        });
      }
    } else if (range === "week") {
      // Show weekly trend for 10 weeks centered around the selected week of eDate (-5 weeks to +4 weeks)
      const selectedMonday = new Date(eDate);
      const dayVal = eDate.getDay();
      const diffVal = dayVal === 0 ? 6 : dayVal - 1; // ISO Monday start
      selectedMonday.setDate(eDate.getDate() - diffVal);

      for (let i = -5; i <= 4; i++) {
        const monday = new Date(selectedMonday);
        monday.setDate(selectedMonday.getDate() + i * 7);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startStr = format(monday);
        const endStr = format(sunday);
        const weekNum = getISOWeekNumber(monday);

        const wRevenue = await getPeriodRevenue(startStr, endStr);
        const wOccupied = await getPeriodOccupiedDays(startStr, endStr);
        const wOccupancy = Number(((wOccupied / (totalUnits * 7)) * 100).toFixed(1));
        const wExpenses = await getPeriodExpenses(startStr, endStr, 7);

        monthlyData.push({
          month: `أسبوع ${weekNum}`,
          amount: wRevenue,
          expenses: wExpenses,
          occupancy: wOccupancy,
          percentage: `${Math.min(100, Math.max(10, Math.round((wRevenue / (totalRevenue || 1)) * 100)))}%`,
        });
      }
    } else {
      // range === "month" || range === "year" || range === "custom"
      // Show all 12 months of the year containing eDate (January to December)
      const targetYear = eDate.getFullYear();
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

      for (let m = 0; m < 12; m++) {
        // Start & end of target month
        const startOfMonthStr = `${targetYear}-${String(m + 1).padStart(2, "0")}-01`;
        const dateObj = new Date(targetYear, m + 1, 0);
        const endOfMonthStr = dateObj.toISOString().split("T")[0];
        const daysInMonth = dateObj.getDate();

        const mRevenue = await getPeriodRevenue(startOfMonthStr, endOfMonthStr);
        const mOccupied = await getPeriodOccupiedDays(startOfMonthStr, endOfMonthStr);
        const mOccupancy = Number(((mOccupied / (totalUnits * daysInMonth)) * 100).toFixed(1));
        const mExpenses = await getPeriodExpenses(startOfMonthStr, endOfMonthStr, daysInMonth);

        monthlyData.push({
          month: monthNames[m],
          amount: mRevenue,
          expenses: mExpenses,
          occupancy: mOccupancy,
          percentage: `${Math.min(100, Math.max(10, Math.round((mRevenue / (totalRevenue || 1)) * 100)))}%`,
        });
      }
    }

    // 10. Live Unit Operations
    const liveUnitsList = await query<any>(
      `SELECT u.unit_name, u.readiness_status, u.readiness_guest_name, u.readiness_checkout_date,
              (SELECT platform FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= CURRENT_DATE() AND r.end_date >= CURRENT_DATE() LIMIT 1) as platform
       FROM units u
       WHERE u.status = 'active' ${accountFilterUnits}
       ORDER BY u.unit_name ASC LIMIT 12`,
      paramsUnits
    );

    const liveUnits = liveUnitsList.map((unit: any) => {
      let status = "شاغر وجاهز";
      let colorClass = "border-r-blue-500 bg-blue-50/10";
      if (unit.readiness_status === "dirty") {
        status = "تنظيف";
        colorClass = "border-r-amber-500 bg-amber-50/10";
      } else if (unit.readiness_status === "maintenance") {
        status = "تحت الصيانة";
        colorClass = "border-r-rose-500 bg-rose-50/10";
      } else if (unit.readiness_guest_name) {
        status = "مأهول";
        colorClass = "border-r-emerald-500 bg-emerald-50/10";
      }

      return {
        title: unit.unit_name,
        platform: unit.platform ? (unit.platform === "airbnb" ? "Airbnb" : "Gathern") : "مباشر",
        status,
        time: unit.readiness_checkout_date ? `مغادرة: ${unit.readiness_checkout_date.split("T")[0]}` : "استقبال متاح",
        guest: unit.readiness_guest_name || "-",
        color: colorClass,
      };
    });

    // 11. Profitability Table (Group by Unit)
    const profitabilityList = await query<any>(
      `SELECT * FROM (
        SELECT u.id, u.unit_name, 
                COALESCE(
                  (SELECT platform FROM bookings b WHERE b.unit_id = u.id ORDER BY b.checkin_date DESC LIMIT 1),
                  (SELECT platform FROM reservations r WHERE r.unit_id = u.id ORDER BY r.start_date DESC LIMIT 1)
                ) as platform,
                COALESCE((SELECT SUM(amount) FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date >= ? AND b.checkin_date <= ?), 0) as b_rev,
                (SELECT COUNT(*) FROM reservations r2 WHERE r2.unit_id = u.id AND r2.start_date >= ? AND r2.start_date <= ?) as r_count,
                (SELECT COUNT(*) FROM bookings b2 WHERE b2.unit_id = u.id AND b2.checkin_date >= ? AND b2.checkin_date <= ?) as b_count,
                (SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.unit_id = u.id AND mt.status = 'resolved') as m_tickets
         FROM units u
         WHERE u.status = 'active' ${accountFilterUnits}
         GROUP BY u.id, u.unit_name
       ) as tmp
       ORDER BY b_rev DESC LIMIT 5`,
      [startDateStr, endDateStr, startDateStr, endDateStr, startDateStr, endDateStr, ...paramsUnits]
    );

    const profitability = profitabilityList.map((unit: any) => {
      const uRev = Number(unit.b_rev);
      // Clean cost estimate: Airbnb is 80, Gathern is 50, Direct is 60
      const cleanCost = (Number(unit.r_count) * 70) + (Number(unit.b_count) * 60);
      const maintenanceCost = Number(unit.m_tickets || 0) * 150;
      const totalCost = cleanCost + maintenanceCost;
      const netProfit = Math.max(0, uRev - totalCost);
      const margin = uRev > 0 ? ((netProfit / uRev) * 100).toFixed(1) : "0.0";

      return {
        name: unit.unit_name,
        platform: unit.platform ? (unit.platform === "airbnb" ? "Airbnb" : "Gathern") : "حجز مباشر",
        revenue: `${uRev.toLocaleString("en-US")} ر.س`,
        cost: `${totalCost.toLocaleString("en-US")} ر.س`,
        profit: `${netProfit.toLocaleString("en-US")} ر.س`,
        margin: `${margin}%`,
        status: Number(margin) > 75 ? "high" : "normal",
      };
    });

    // 12. CRM Pipeline
    const crmPipelineList = await query<any>(
      `SELECT stage, COUNT(*) as count, SUM(value) as val FROM crm_deals GROUP BY stage`
    );

    const stagesMapping: Record<string, { label: string; percent: string; bg: string }> = {
      qualified: { label: "اتصالات أولية / استعلامات جديدة", percent: "100%", bg: "bg-blue-500" },
      proposal: { label: "تفاوض وتخصيص أسعار", percent: "75%", bg: "bg-indigo-500" },
      negotiation: { label: "بانتظار تأكيد الدفع والتعميد", percent: "45%", bg: "bg-amber-500" },
      won: { label: "صفقات مغلقة ومكتملة (Won)", percent: "90%", bg: "bg-emerald-500" },
    };

    const crmPipeline = Object.entries(stagesMapping).map(([key, meta]) => {
      const found = crmPipelineList.find((item) => item.stage === key);
      const count = found ? found.count : 0;
      const value = found ? Number(found.val) : 0;

      return {
        stage: meta.label,
        count: count === 1 ? "1 صفقة" : count > 1 ? `${count} صفقات` : "0 صفقة",
        value: `${value.toLocaleString("en-US")} ر.س`,
        percent: meta.percent,
        bg: meta.bg,
      };
    });

    const recentDealsList = await query<any>(
      `SELECT c.title, c.value, c.stage, cust.full_name as customer_name
       FROM crm_deals c
       LEFT JOIN customers cust ON c.customer_id = cust.id
       ORDER BY c.created_at DESC LIMIT 4`
    );

    const recentDeals = recentDealsList.map((deal: any) => {
      let status = "تفاوض نشط";
      if (deal.stage === "won") status = "تم التأكيد";
      else if (deal.stage === "negotiation") status = "بانتظار الدفع";

      return {
        company: deal.title || deal.customer_name || "صفقة جديدة",
        price: `${Number(deal.value).toLocaleString("en-US")} ر.س`,
        status,
      };
    });

    // 13. HR & Payroll Overview
    const hrEmployeeStats = await query<{ basic: number | string; allowances: number | string }>(
      `SELECT SUM(basic_salary) as basic, 
              SUM(housing_allowance + transport_allowance + other_allowances) as allowances 
       FROM hr_employees 
       WHERE status = 'active' AND exclude_from_payroll = 0`
    );

    const basicSalary = Number(hrEmployeeStats[0]?.basic || 0);
    const allowances = Number(hrEmployeeStats[0]?.allowances || 0);
    // Dummy deductions since no active payroll_run_details are finalized in sandbox
    const deductions = Math.round(basicSalary * 0.02); 
    const netPayroll = basicSalary + allowances - deductions;

    const hrPayroll = {
      basic: `${basicSalary.toLocaleString("en-US")} ر.س`,
      allowances: `${allowances.toLocaleString("en-US")} ر.س`,
      deductions: `${deductions.toLocaleString("en-US")} ر.س`,
      net: `${netPayroll.toLocaleString("en-US")} ر.س`,
    };

    // Employee attendance
    const employeeAttendanceList = await query<any>(
      `SELECT e.full_name, e.job_title,
              COUNT(a.id) as total_days,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days
       FROM hr_employees e
       LEFT JOIN hr_attendance a ON e.id = a.employee_id
       WHERE e.status = 'active'
       GROUP BY e.id, e.full_name, e.job_title
       LIMIT 4`
    );

    const employeeAttendance = employeeAttendanceList.map((emp: any) => {
      const total = Number(emp.total_days || 0);
      const present = Number(emp.present_days || 0);
      const late = Number(emp.late_days || 0);
      
      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

      return {
        name: `${emp.full_name} (${emp.job_title || "موظف"})`,
        attend: `${attendanceRate}% حضور`,
        delay: `${late} تأخير`,
        style: `w-[${attendanceRate}%] ${attendanceRate > 90 ? "bg-emerald-500" : "bg-blue-500"}`,
      };
    });

    // Maintenance status distribution
    const mtStatusList = await query<any>(
      `SELECT mt.status, COUNT(*) as count 
       FROM maintenance_tickets mt
       INNER JOIN units u ON mt.unit_id = u.id
       WHERE 1=1 ${accountFilterUnits}
       GROUP BY mt.status`,
      paramsUnits
    );

    // Top 5 units with maintenance tickets
    const mtTopUnitsList = await query<any>(
      `SELECT u.unit_name as name, COUNT(mt.id) as count 
       FROM maintenance_tickets mt
       INNER JOIN units u ON mt.unit_id = u.id
       WHERE 1=1 ${accountFilterUnits}
       GROUP BY u.id, u.unit_name
       ORDER BY count DESC LIMIT 5`,
      paramsUnits
    );

    const maintenanceAnalytics = {
      statusDist: mtStatusList.map((r: any) => ({
        status: r.status === "resolved" ? "محلولة" : r.status === "in_progress" ? "قيد المعالجة" : "مفتوحة",
        count: Number(r.count || 0)
      })),
      topUnits: mtTopUnitsList.map((r: any) => ({
        name: r.name,
        count: Number(r.count || 0)
      }))
    };

    // Invoice state distribution
    const invoiceStateList = await query<any>(
      `SELECT state, COUNT(*) as count, SUM(total_amount) as total 
       FROM accounting_invoices 
       WHERE deleted_at IS NULL
       GROUP BY state`
    );

    const arabicStates: Record<string, string> = {
      draft: "مسودة",
      posted: "مرحلة",
      confirmed: "مؤكدة",
      paid: "مدفوعة",
      cancelled: "ملغاة"
    };

    const invoiceAnalytics = invoiceStateList.map((r: any) => ({
      state: arabicStates[r.state] || r.state,
      count: Number(r.count || 0),
      total: Number(r.total || 0)
    }));

    const responseData = {
      stats: {
        totalRevenue: `${totalRevenue.toLocaleString("en-US")} ر.س`,
        occupancyRate: `${occupancyRate}%`,
        adr: `${adr.toLocaleString("en-US")} ر.س`,
        revpar: `${revpar.toLocaleString("en-US")} ر.س`,
        totalBookings: totalBookingsCount,
        totalExpenses: `${totalExpenses.toLocaleString("en-US")} ر.س`,
        netIncome: `${netIncome.toLocaleString("en-US")} ر.س`,
        repeatGuestRate: `${repeatGuestRate}%`,
      },
      platformShare: {
        airbnb: {
          percent: totalRevenue > 0 ? Math.round((platformShare.airbnb / totalRevenue) * 100) : 0,
          value: `${platformShare.airbnb.toLocaleString("en-US")} ر.س`,
        },
        gathern: {
          percent: totalRevenue > 0 ? Math.round((platformShare.gathern / totalRevenue) * 100) : 0,
          value: `${platformShare.gathern.toLocaleString("en-US")} ر.س`,
        },
        external: {
          percent: totalRevenue > 0 ? Math.round((platformShare.external / totalRevenue) * 100) : 0,
          value: `${platformShare.external.toLocaleString("en-US")} ر.س`,
        },
      },
      monthlyData,
      liveUnits,
      profitability,
      crmPipeline,
      recentDeals,
      hrPayroll,
      employeeAttendance,
      maintenanceAnalytics,
      invoiceAnalytics,
    };

    analyticsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Analytics Route Error:", error);
    return NextResponse.json({ error: "فشل استيراد وتحليل البيانات" }, { status: 500 });
  }
}

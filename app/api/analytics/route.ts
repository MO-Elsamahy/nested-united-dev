import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
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
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDateStr = format(startOfWeek);
        endDateStr = format(endOfWeek);
      } else if (range === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDateStr = format(startOfMonth);
        endDateStr = format(endOfMonth);
      } else if (range === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        startDateStr = format(startOfQuarter);
        endDateStr = format(endOfQuarter);
      } else if (range === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        startDateStr = format(startOfYear);
        endDateStr = format(endOfYear);
      } else {
        // Default to start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDateStr = format(startOfMonth);
        endDateStr = format(endOfMonth);
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
    const maintenanceExpenses = maintenanceCount * 0;
    const operatingExpenses = totalBookingsCount * 0;

    // Vendor Bills in the period
    const invoicesResult = await query<{ total: number | string }>(
      `SELECT SUM(total_amount) as total FROM accounting_invoices 
       WHERE invoice_type = 'vendor_bill' AND deleted_at IS NULL
         AND invoice_date >= ? AND invoice_date <= ?`,
      [startDateStr, endDateStr]
    );
    const vendorBills = Number(invoicesResult[0]?.total || 0);

    // HR payroll - Fetched and calculated dynamically by hire_date
    interface EmployeeRow {
      basic_salary: number | string;
      housing_allowance: number | string;
      transport_allowance: number | string;
      other_allowances: number | string;
      hire_date: string | null;
      salary_currency: string | null;
    }
    const employees = await query<EmployeeRow>(
      `SELECT basic_salary, housing_allowance, transport_allowance, other_allowances, hire_date, salary_currency 
       FROM hr_employees 
       WHERE status = 'active' AND exclude_from_payroll = 0`
    );

    const calculatePayrollForPeriod = (startStr: string, endStr: string) => {
      const start = new Date(startStr);
      const end = new Date(endStr);
      let totalPayroll = 0;

      for (const emp of employees) {
        const hireDate = emp.hire_date ? new Date(emp.hire_date) : null;
        if (hireDate && hireDate > end) {
          continue;
        }

        const currency = emp.salary_currency || 'SAR';
        let basic = Number(emp.basic_salary || 0);
        let allowances = Number(emp.housing_allowance || 0) + 
                           Number(emp.transport_allowance || 0) + 
                           Number(emp.other_allowances || 0);

        // Convert EGP to SAR (Exchange rate: 1 SAR = 13.80 EGP -> 1 EGP = 0.0725 SAR)
        if (currency.toUpperCase() === 'EGP') {
          basic = basic * 0.0725;
          allowances = allowances * 0.0725;
        }

        const deductions = Math.round(basic * 0.02);
        const monthlyNet = basic + allowances - deductions;

        if (!hireDate || hireDate <= start) {
          const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          totalPayroll += (monthlyNet / 30) * days;
        } else {
          const days = Math.max(1, Math.ceil((end.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          totalPayroll += (monthlyNet / 30) * days;
        }
      }
      return Math.round(totalPayroll);
    };

    // Total active units count company-wide
    const totalUnitsCountResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM units WHERE status = 'active'");
    const totalUnitsCount = Number(totalUnitsCountResult[0]?.count || 24);

    const allocatedPayroll = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * calculatePayrollForPeriod(startDateStr, endDateStr) : 0;
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
      const opExpenses = totalBookingsVal * 0;

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
      const maintExpenses = maintCount * 0;

      // Vendor Bills
      const invoicesRes = await query<{ total: number | string }>(
        `SELECT SUM(total_amount) as total FROM accounting_invoices 
         WHERE invoice_type = 'vendor_bill' AND deleted_at IS NULL
           AND invoice_date >= ? AND invoice_date <= ?`,
        [startStr, endStr]
      );
      const vendorBillsVal = Number(invoicesRes[0]?.total || 0);

      // Payroll overhead allocated
      const periodPayroll = calculatePayrollForPeriod(startStr, endStr);
      const allocPayroll = totalUnitsCount > 0 ? (totalUnits / totalUnitsCount) * periodPayroll : 0;
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

    // 10. Live Unit Operations (Synced with Unit Readiness Page Logic)
    const calNow = new Date();
    const todayStr = `${calNow.getFullYear()}-${String(calNow.getMonth() + 1).padStart(2, '0')}-${String(calNow.getDate()).padStart(2, '0')}`;
    const currentMonthStart = `${calNow.getFullYear()}-${String(calNow.getMonth() + 1).padStart(2, '0')}-01`;
    const calLastDay = new Date(calNow.getFullYear(), calNow.getMonth() + 1, 0).getDate();
    const currentMonthEnd = `${calNow.getFullYear()}-${String(calNow.getMonth() + 1).padStart(2, '0')}-${String(calLastDay).padStart(2, '0')}`;

    const activeBookings = await query<any>(
      `SELECT unit_id, checkin_date as start_date, checkout_date as end_date FROM bookings
       WHERE checkout_date >= ? AND checkin_date <= ?`,
      [currentMonthStart, currentMonthEnd]
    );

    const activeReservations = await query<any>(
      `SELECT unit_id, start_date, end_date FROM reservations
       WHERE end_date >= ? AND start_date <= ?`,
      [currentMonthStart, currentMonthEnd]
    );

    const liveUnitsList = await query<any>(
      `SELECT u.*,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date = ? LIMIT 1) as manual_checkin_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.start_date = ? LIMIT 1) as ical_checkin_guest,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkout_date = ? LIMIT 1) as manual_checkout_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.end_date = ? LIMIT 1) as ical_checkout_guest,
              (SELECT b.checkin_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date = ? LIMIT 1) as manual_checkin_date,
              (SELECT r.start_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date = ? LIMIT 1) as ical_checkin_date,
              (SELECT b.checkout_date FROM bookings b WHERE b.unit_id = u.id AND b.checkout_date = ? LIMIT 1) as manual_checkout_date,
              (SELECT r.end_date FROM reservations r WHERE r.unit_id = u.id AND r.end_date = ? LIMIT 1) as ical_checkout_date,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_guest,
              (SELECT b.checkin_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_checkin,
              (SELECT r.start_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_checkin,
              (SELECT b.checkout_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_checkout,
              (SELECT r.end_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_checkout,
              (SELECT b.notes FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_notes,
              (SELECT platform FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= CURRENT_DATE() AND r.end_date >= CURRENT_DATE() LIMIT 1) as platform,
              COALESCE((SELECT SUM(amount) FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date >= ? AND b.checkin_date <= ?), 0) as total_revenue,
              (SELECT COUNT(*) FROM bookings b2 WHERE b2.unit_id = u.id AND b2.checkin_date >= ? AND b2.checkin_date <= ?) as bookings_count,
              (SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.unit_id = u.id AND mt.status != 'resolved') as active_maint_tickets
       FROM units u
       WHERE u.status = 'active' ${accountFilterUnits}
       ORDER BY u.unit_name ASC`,
      [
        todayStr, todayStr, todayStr, todayStr, todayStr, todayStr, todayStr, todayStr, // Today checkin/checkout flags
        todayStr, todayStr, // active_manual_guest
        todayStr, todayStr, // active_ical_guest
        todayStr, todayStr, // active_manual_checkin
        todayStr, todayStr, // active_ical_checkin
        todayStr, todayStr, // active_manual_checkout
        todayStr, todayStr, // active_ical_checkout
        todayStr, todayStr, // active_manual_notes
        startDateStr, endDateStr, startDateStr, endDateStr,
        ...paramsUnits
      ]
    );

    const liveUnits = liveUnitsList.map((unit: any) => {
      // 1. Sync from active booking if present and staff hasn't manually overridden it
      const activeGuest = unit.active_manual_guest || unit.active_ical_guest;
      const activeCheckinDate = unit.active_manual_checkin || unit.active_ical_checkin;

      let readinessGuest = unit.readiness_guest_name;
      let readinessCheckin = unit.readiness_checkin_date;
      let readinessCheckout = unit.readiness_checkout_date;
      let readinessNotes = unit.readiness_notes;

      if (activeGuest) {
        const bookingStart = activeCheckinDate ? new Date(activeCheckinDate) : null;
        const lastManualUpdate = unit.readiness_updated_at ? new Date(unit.readiness_updated_at) : null;
        const staffOverrodeAfterBooking = lastManualUpdate && bookingStart && lastManualUpdate > bookingStart;

        if (!staffOverrodeAfterBooking) {
          readinessGuest = activeGuest;
          readinessCheckin = activeCheckinDate;
          readinessCheckout = unit.active_manual_checkout || unit.active_ical_checkout;
          readinessNotes = unit.active_manual_notes || unit.readiness_notes || (unit.active_ical_guest ? `iCal: ${unit.active_ical_guest}` : null);
        }
      }

      // 2. Compute dynamic Today flags
      const hasCheckinToday = !!(unit.manual_checkin_date || unit.ical_checkin_date);
      const hasCheckoutToday = !!(unit.manual_checkout_date || unit.ical_checkout_date);
      
      const updatedAt = unit.readiness_updated_at ? new Date(unit.readiness_updated_at) : null;
      const wasUpdatedToday = updatedAt && 
        `${updatedAt.getFullYear()}-${String(updatedAt.getMonth() + 1).padStart(2, '0')}-\${String(updatedAt.getDate()).padStart(2, '0')}` === todayStr;
      
      let computed = unit.readiness_status || "ready";

      if (!wasUpdatedToday || !unit.readiness_status) {
        if (hasCheckoutToday && (computed === "occupied" || !unit.readiness_status)) {
          computed = "checkout_today";
        } else if (hasCheckinToday && (computed === "ready" || computed === "booked" || !unit.readiness_status)) {
          computed = "checkin_today";
        }
      }

      // Map computed status to Arabic text and matching classes
      let status = "شاغر وجاهز";
      let colorClass = "border-r-blue-500 bg-blue-50/10";
      
      if (computed === "dirty" || computed === "awaiting_cleaning" || computed === "cleaning_in_progress") {
        status = "تنظيف";
        colorClass = "border-r-amber-500 bg-amber-50/10";
      } else if (computed === "maintenance") {
        status = "تحت الصيانة";
        colorClass = "border-r-rose-500 bg-rose-50/10";
      } else if (computed === "occupied") {
        status = "مأهول";
        colorClass = "border-r-emerald-500 bg-emerald-50/10";
      } else if (computed === "booked") {
        status = "إشغال";
        colorClass = "border-r-indigo-500 bg-indigo-50/10";
      } else if (computed === "checkout_today") {
        status = "خروج اليوم";
        colorClass = "border-r-purple-500 bg-purple-50/10";
      } else if (computed === "checkin_today") {
        status = "دخول اليوم";
        colorClass = "border-r-sky-500 bg-sky-50/10";
      } else if (computed === "guest_not_checked_out") {
        status = "لم يغادر";
        colorClass = "border-r-rose-500 bg-rose-50/10";
      }

      // Calculate booked days for calendar (Timezone-safe YYYY-MM-DD string comparison)
      const bookedDays = new Set<number>();
      const unitBookings = activeBookings.filter((b: any) => b.unit_id === unit.id);
      const unitReservations = activeReservations.filter((r: any) => r.unit_id === unit.id);
      
      const parseToYYYYMMDD = (val: any) => {
        if (!val) return "";
        if (val instanceof Date) {
          const year = val.getFullYear();
          const month = String(val.getMonth() + 1).padStart(2, '0');
          const day = String(val.getDate()).padStart(2, '0');
          return `${year}-${month}-\${day}`;
        }
        if (typeof val === 'string') {
          return val.split('T')[0];
        }
        return "";
      };

      const allIntervals = [
        ...unitBookings.map((b: any) => ({ start: parseToYYYYMMDD(b.start_date), end: parseToYYYYMMDD(b.end_date) })),
        ...unitReservations.map((r: any) => ({ start: parseToYYYYMMDD(r.start_date), end: parseToYYYYMMDD(r.end_date) }))
      ];

      const calYear = calNow.getFullYear();
      const calMonthStr = String(calNow.getMonth() + 1).padStart(2, '0');

      for (let day = 1; day <= calLastDay; day++) {
        const checkDateStr = `${calYear}-${calMonthStr}-${String(day).padStart(2, '0')}`;
        for (const interval of allIntervals) {
          if (interval.start && interval.end) {
            if (checkDateStr >= interval.start && checkDateStr <= interval.end) {
              bookedDays.add(day);
              break;
            }
          }
        }
      }

      return {
        id: unit.id,
        title: unit.unit_name,
        unitCode: unit.unit_code || null,
        platform: unit.platform ? (unit.platform === "airbnb" ? "Airbnb" : "Gathern") : "مباشر",
        status,
        readinessStatus: computed,
        guest: readinessGuest || null,
        checkinDate: readinessCheckin ? (typeof readinessCheckin === 'string' ? readinessCheckin.split("T")[0] : readinessCheckin.toISOString().split("T")[0]) : null,
        checkoutDate: readinessCheckout ? (typeof readinessCheckout === 'string' ? readinessCheckout.split("T")[0] : readinessCheckout.toISOString().split("T")[0]) : null,
        notes: readinessNotes || null,
        updatedAt: unit.readiness_updated_at ? (typeof unit.readiness_updated_at === 'string' ? unit.readiness_updated_at : unit.readiness_updated_at.toISOString()) : null,
        revenue: Number(unit.total_revenue),
        bookingsCount: Number(unit.bookings_count),
        activeMaintTickets: Number(unit.active_maint_tickets),
        bookedDays: Array.from(bookedDays),
        color: colorClass,
      };
    });

    // 11. Profitability Table (Group by Unit) - Synced with Date Filters and Hospitality Metrics (ADR, Occupancy, RevPAR)
    const profitabilityList = await query<any>(
      `SELECT * FROM (
        SELECT u.id, u.unit_name, 
                COALESCE(
                  (SELECT platform FROM bookings b WHERE b.unit_id = u.id ORDER BY b.checkin_date DESC LIMIT 1),
                  (SELECT platform FROM reservations r WHERE r.unit_id = u.id ORDER BY r.start_date DESC LIMIT 1)
                ) as platform,
                COALESCE(
                  (SELECT SUM(
                     (b.amount / COALESCE(NULLIF(DATEDIFF(b.checkout_date, b.checkin_date), 0), 1)) *
                     GREATEST(0, DATEDIFF(
                       LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
                       GREATEST(b.checkin_date, ?)
                     ) + 1)
                   )
                   FROM bookings b
                   WHERE b.unit_id = u.id 
                     AND b.checkin_date <= ? 
                     AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ?
                  ), 0
                ) as b_rev,
                COALESCE(
                  (SELECT SUM(GREATEST(0, DATEDIFF(
                     LEAST(CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END, ?),
                     GREATEST(b.checkin_date, ?)
                   ) + 1))
                   FROM bookings b
                   WHERE b.unit_id = u.id 
                     AND b.checkin_date <= ? 
                     AND (CASE WHEN b.checkout_date = b.checkin_date THEN b.checkout_date ELSE b.checkout_date - INTERVAL 1 DAY END) >= ?
                  ), 0
                ) as b_days,
                COALESCE(
                  (SELECT SUM(GREATEST(0, DATEDIFF(
                     LEAST(CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END, ?),
                     GREATEST(r.start_date, ?)
                   ) + 1))
                   FROM reservations r
                   WHERE r.unit_id = u.id 
                     AND r.start_date <= ? 
                     AND (CASE WHEN r.end_date = r.start_date THEN r.end_date ELSE r.end_date - INTERVAL 1 DAY END) >= ?
                  ), 0
                ) as r_days,
                (SELECT COUNT(*) FROM reservations r2 WHERE r2.unit_id = u.id AND r2.start_date <= ? AND (CASE WHEN r2.end_date = r2.start_date THEN r2.end_date ELSE r2.end_date - INTERVAL 1 DAY END) >= ?) as r_count,
                (SELECT COUNT(*) FROM bookings b2 WHERE b2.unit_id = u.id AND b2.checkin_date <= ? AND (CASE WHEN b2.checkout_date = b2.checkin_date THEN b2.checkout_date ELSE b2.checkout_date - INTERVAL 1 DAY END) >= ?) as b_count,
                (SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.unit_id = u.id AND mt.status = 'resolved' AND mt.created_at >= ? AND mt.created_at <= ?) as m_tickets
         FROM units u
         WHERE u.status = 'active' ${accountFilterUnits}
         GROUP BY u.id, u.unit_name
       ) as tmp
       ORDER BY b_rev DESC`,
      [
        endDateStr, startDateStr, endDateStr, startDateStr, // b_rev
        endDateStr, startDateStr, endDateStr, startDateStr, // b_days
        endDateStr, startDateStr, endDateStr, startDateStr, // r_days
        endDateStr, startDateStr, // r_count
        endDateStr, startDateStr, // b_count
        startDateStr, endDateStr, // m_tickets
        ...paramsUnits
      ]
    );

    const profitability = profitabilityList.map((unit: any) => {
      const uRev = Number(unit.b_rev);
      const bDays = Number(unit.b_days);
      const rDays = Number(unit.r_days);
      const occupiedDays = bDays + rDays;
      const availableDays = daysCount;

      const occupancy = availableDays > 0 ? Math.min(100, Math.round((occupiedDays / availableDays) * 100)) : 0;
      const adr = bDays > 0 ? Math.round(uRev / bDays) : 0;
      const revpar = availableDays > 0 ? Math.round(uRev / availableDays) : 0;

      // Clean cost estimate: Set to 0 per user instruction
      const cleanCost = 0;
      const totalCost = 0;
      const netProfit = Math.max(0, uRev - totalCost);
      const margin = uRev > 0 ? ((netProfit / uRev) * 100).toFixed(1) : "0.0";

      return {
        name: unit.unit_name,
        platform: unit.platform ? (unit.platform === "airbnb" ? "Airbnb" : "Gathern") : "حجز مباشر",
        revenueVal: uRev,
        costVal: totalCost,
        profitVal: netProfit,
        marginVal: Number(margin),
        occupancyVal: occupancy,
        adrVal: adr,
        revparVal: revpar,
        revenue: `${uRev.toLocaleString("en-US")} ر.س`,
        cost: `${totalCost.toLocaleString("en-US")} ر.س`,
        profit: `${netProfit.toLocaleString("en-US")} ر.س`,
        margin: `${margin}%`,
        occupancy: `${occupancy}%`,
        adr: `${adr.toLocaleString("en-US")} ر.س`,
        revpar: `${revpar.toLocaleString("en-US")} ر.س`,
        status: Number(margin) > 75 ? "high" : "normal",
      };
    });

    // 12. CRM Pipeline & Analytics with Date and Unit/Account filters
    let crmAccountFilter = "";
    const paramsCrm: unknown[] = [startDateStr + " 00:00:00", endDateStr + " 23:59:59"];
    if (account !== "all") {
      const accountIds = account.split(",");
      const placeholders = accountIds.map(() => "?").join(",");
      crmAccountFilter = ` AND c.unit_id IN (SELECT id FROM units WHERE platform_account_id IN (${placeholders})) `;
      paramsCrm.push(...accountIds);
    }

    const crmStats = await queryOne<any>(
      `SELECT 
         COUNT(*) as total_deals,
         SUM(CASE WHEN c.status = 'open' THEN 1 ELSE 0 END) as open_count,
         COALESCE(SUM(CASE WHEN c.status = 'open' THEN c.value ELSE 0 END), 0) as open_value,
         SUM(CASE WHEN c.status = 'closed' AND c.stage IN ('completed', 'management') THEN 1 ELSE 0 END) as won_count,
         COALESCE(SUM(CASE WHEN c.status = 'closed' AND c.stage IN ('completed', 'management') THEN c.value ELSE 0 END), 0) as won_value,
         SUM(CASE WHEN c.stage = 'lost' THEN 1 ELSE 0 END) as lost_count,
         COALESCE(AVG(CASE WHEN c.value > 0 THEN c.value ELSE NULL END), 0) as avg_value
       FROM crm_deals c
       WHERE c.created_at >= ? AND c.created_at <= ? ${crmAccountFilter}`,
      paramsCrm
    );

    const totalCustomersRes = await queryOne<any>("SELECT COUNT(*) as count FROM customers");
    const totalCustomersCount = Number(totalCustomersRes?.count || 0);

    const totalResolved = Number(crmStats?.won_count || 0) + Number(crmStats?.lost_count || 0);
    const crmKPIs = {
      pipelineValue: `${Number(crmStats?.open_value || 0).toLocaleString("en-US")} ر.س`,
      wonValue: `${Number(crmStats?.won_value || 0).toLocaleString("en-US")} ر.س`,
      avgDealValue: `${Math.round(Number(crmStats?.avg_value || 0)).toLocaleString("en-US")} ر.س`,
      conversionRate: totalResolved > 0 
        ? `${((Number(crmStats?.won_count || 0) / totalResolved) * 100).toFixed(1)}%` 
        : "0.0%",
      totalCustomers: totalCustomersCount.toLocaleString("en-US"),
      openCount: Number(crmStats?.open_count || 0),
      wonCount: Number(crmStats?.won_count || 0),
      lostCount: Number(crmStats?.lost_count || 0),
    };

    const crmStatusDistribution = [
      { name: "صفقات نشطة", value: Number(crmStats?.open_count || 0), color: "#3b82f6" },
      { name: "صفقات مؤكدة", value: Number(crmStats?.won_count || 0), color: "#10b981" },
      { name: "صفقات خاسرة", value: Number(crmStats?.lost_count || 0), color: "#ef4444" },
    ].filter(item => item.value > 0);

    const crmPipelineList = await query<any>(
      `SELECT c.stage, COUNT(*) as count, SUM(c.value) as val 
       FROM crm_deals c 
       WHERE c.status = 'open' AND c.created_at >= ? AND c.created_at <= ? ${crmAccountFilter}
       GROUP BY c.stage`,
      paramsCrm
    );

    const stagesMapping: Record<string, { label: string; percent: string; bg: string }> = {
      negotiation: { label: "مفاوضات وبانتظار الدفع", percent: "30%", bg: "bg-blue-500" },
      partial_payment: { label: "تم دفع عربون / دفعة جزئية", percent: "60%", bg: "bg-amber-500" },
      completed: { label: "صفقات مكتملة ومؤكدة", percent: "90%", bg: "bg-emerald-500" },
      management: { label: "تحت التشغيل والإدارة", percent: "100%", bg: "bg-indigo-500" },
    };

    const crmPipeline = Object.entries(stagesMapping).map(([key, meta]) => {
      const found = crmPipelineList.find((item) => item.stage === key);
      const count = found ? found.count : 0;
      const value = found ? Number(found.val) : 0;

      return {
        stage: meta.label,
        count: count === 1 ? "1 صفقة" : count > 1 ? `${count} صفقات` : "0 صفقة",
        value: `${value.toLocaleString("en-US")} ر.س`,
        rawValue: value,
        rawCount: count,
        percent: meta.percent,
        bg: meta.bg,
      };
    });

    const recentDealsList = await query<any>(
      `SELECT c.id, c.title, c.value, c.stage, c.priority, c.expected_close_date, cust.full_name as customer_name
       FROM crm_deals c
       LEFT JOIN customers cust ON c.customer_id = cust.id
       WHERE c.created_at >= ? AND c.created_at <= ? ${crmAccountFilter}
       ORDER BY c.created_at DESC`,
      paramsCrm
    );

    const recentDeals = recentDealsList.map((deal: any) => {
      let status = "تفاوض نشط";
      if (deal.stage === "completed" || deal.stage === "management") status = "تم التأكيد";
      else if (deal.stage === "negotiation") status = "بانتظار الدفع";
      else if (deal.stage === "partial_payment") status = "دفعة جزئية";

      return {
        id: deal.id,
        title: deal.title || "صفقة جديدة",
        customer: deal.customer_name || "عميل عام",
        value: Number(deal.value),
        price: `${Number(deal.value).toLocaleString("en-US")} ر.س`,
        stage: deal.stage,
        priority: deal.priority || "medium",
        expectedClose: deal.expected_close_date ? deal.expected_close_date.toString().slice(0, 10) : "غير محدد",
        status,
      };
    });

    // 13. HR & Payroll Overview (Detailed currency breakdown and advanced metrics)
    const hrActiveEmployees = await query<any>(
      `SELECT basic_salary, housing_allowance, transport_allowance, other_allowances, hire_date, salary_currency 
       FROM hr_employees 
       WHERE status = 'active' AND (hire_date IS NULL OR hire_date <= ?)`,
      [endDateStr]
    );

    let sarBasic = 0;
    let sarAllowances = 0;
    let egpBasic = 0;
    let egpAllowances = 0;
    let sarDeductions = 0;
    let egpDeductions = 0;

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    for (const emp of hrActiveEmployees) {
      const hireDate = emp.hire_date ? new Date(emp.hire_date) : null;
      const b = Number(emp.basic_salary || 0);
      const a = Number(emp.housing_allowance || 0) + 
                Number(emp.transport_allowance || 0) + 
                Number(emp.other_allowances || 0);
      const d = Math.round(b * 0.02);

      // Prorate by days in period
      let days = periodDays;
      if (hireDate && hireDate > start) {
        days = Math.max(1, Math.ceil((end.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }

      const factor = days / 30;
      const proratedB = b * factor;
      const proratedA = a * factor;
      const proratedD = d * factor;

      if (emp.salary_currency?.toUpperCase() === 'EGP') {
        egpBasic += proratedB;
        egpAllowances += proratedA;
        egpDeductions += proratedD;
      } else {
        sarBasic += proratedB;
        sarAllowances += proratedA;
        sarDeductions += proratedD;
      }
    }

    const sarNet = Math.round(sarBasic + sarAllowances - sarDeductions);
    const egpNet = Math.round(egpBasic + egpAllowances - egpDeductions);

    // Convert EGP to SAR for the unified expenses and cashflow calculation
    const convertedEgpNet = egpNet * 0.0725;
    const totalPayrollSAR = Math.round(sarNet + convertedEgpNet);

    const hrPayroll = {
      basic: `${Math.round(sarBasic + egpBasic * 0.0725).toLocaleString("en-US")} ر.س`,
      allowances: `${Math.round(sarAllowances + egpAllowances * 0.0725).toLocaleString("en-US")} ر.س`,
      deductions: `${Math.round(sarDeductions + egpDeductions * 0.0725).toLocaleString("en-US")} ر.س`,
      net: `${totalPayrollSAR.toLocaleString("en-US")} ر.س`,
    };

    const hrPayrollDetails = {
      sar: {
        basic: `${Math.round(sarBasic).toLocaleString("en-US")} ر.س`,
        allowances: `${Math.round(sarAllowances).toLocaleString("en-US")} ر.س`,
        deductions: `${Math.round(sarDeductions).toLocaleString("en-US")} ر.س`,
        net: `${sarNet.toLocaleString("en-US")} ر.س`,
        rawNet: sarNet,
      },
      egp: {
        basic: `${Math.round(egpBasic).toLocaleString("en-US")} ج.م`,
        allowances: `${Math.round(egpAllowances).toLocaleString("en-US")} ج.م`,
        deductions: `${Math.round(egpDeductions).toLocaleString("en-US")} ج.م`,
        net: `${egpNet.toLocaleString("en-US")} ج.م`,
        rawNet: egpNet,
      },
      activeEmployeesSAR: hrActiveEmployees.filter((e: any) => e.salary_currency?.toUpperCase() !== 'EGP').length,
      activeEmployeesEGP: hrActiveEmployees.filter((e: any) => e.salary_currency?.toUpperCase() === 'EGP').length,
      totalActiveEmployees: hrActiveEmployees.length,
    };

    // Employee list with shift information (filtered by date range)
    const employeeList = await query<any>(
      `SELECT e.id, e.full_name, e.job_title, e.salary_currency, e.basic_salary,
              e.housing_allowance, e.transport_allowance, e.other_allowances, e.hire_date,
              s.days_off
       FROM hr_employees e
       LEFT JOIN hr_shifts s ON e.shift_id = s.id
       WHERE e.status = 'active' AND (e.hire_date IS NULL OR e.hire_date <= ?)`,
      [endDateStr]
    );

    // Active approved leave requests overlapping with selected range
    const activeLeaves = await query<any>(
      `SELECT employee_id, start_date, end_date
       FROM hr_requests
       WHERE status = 'approved' AND start_date <= ? AND end_date >= ?`,
      [endDateStr, startDateStr]
    );

    // Attendance logs inside selected range
    const attendanceRecords = await query<any>(
      `SELECT employee_id, date, status
       FROM hr_attendance
       WHERE date >= ? AND date <= ?`,
      [startDateStr, endDateStr]
    );

    const getDatesInRange = (startStr: string, endStr: string) => {
      const dates: string[] = [];
      const current = new Date(startStr);
      const last = new Date(endStr);
      while (current <= last) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, "0");
        const day = String(current.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    // Map attendance records for rapid lookup
    const attendanceMap: Record<string, Record<string, string>> = {};
    for (const att of attendanceRecords) {
      const empId = att.employee_id;
      const dateStr = att.date instanceof Date 
        ? att.date.toISOString().split("T")[0] 
        : String(att.date).split(" ")[0];
      if (!attendanceMap[empId]) {
        attendanceMap[empId] = {};
      }
      attendanceMap[empId][dateStr] = att.status;
    }

    let globalPresent = 0;
    let globalLate = 0;
    let globalAbsent = 0;
    let globalLeave = 0;

    const employeeAttendance = employeeList.map((emp: any) => {
      let empStart = startDateStr;
      if (emp.hire_date) {
        const hireStr = emp.hire_date instanceof Date 
          ? emp.hire_date.toISOString().split("T")[0] 
          : String(emp.hire_date).split(" ")[0];
        if (hireStr > startDateStr) {
          empStart = hireStr;
        }
      }

      let empEnd = endDateStr < todayStr ? endDateStr : todayStr;

      let expected = 0;
      let present = 0;
      let late = 0;
      let absent = 0;
      let leave = 0;

      const basic = Number(emp.basic_salary || 0);
      const allowances = Number(emp.housing_allowance || 0) + 
                         Number(emp.transport_allowance || 0) + 
                         Number(emp.other_allowances || 0);
      const deductions = Math.round(basic * 0.02);
      const net = basic + allowances - deductions;

      if (empStart <= empEnd) {
        const dates = getDatesInRange(empStart, empEnd);
        const daysOff = emp.days_off ? emp.days_off.split(",").map(Number) : [5]; // Default Friday (5)
        const empLeaves = activeLeaves.filter((l: any) => l.employee_id === emp.id);

        for (const dStr of dates) {
          const dateObj = new Date(dStr);
          const dayOfWeek = dateObj.getDay();

          // 1. Check weekly day off
          if (daysOff.includes(dayOfWeek)) {
            continue;
          }

          // 2. Check approved leaves
          const onLeave = empLeaves.some((l: any) => {
            const lStart = l.start_date instanceof Date ? l.start_date.toISOString().split("T")[0] : String(l.start_date).split(" ")[0];
            const lEnd = l.end_date instanceof Date ? l.end_date.toISOString().split("T")[0] : String(l.end_date).split(" ")[0];
            return dStr >= lStart && dStr <= lEnd;
          });

          if (onLeave) {
            leave++;
            continue;
          }

          // 3. Expected working day
          expected++;

          const attStatus = attendanceMap[emp.id]?.[dStr];
          if (attStatus) {
            if (attStatus === 'present') {
              present++;
            } else if (attStatus === 'late') {
              present++;
              late++;
            } else if (attStatus === 'absent') {
              absent++;
            } else if (attStatus === 'leave' || attStatus === 'holiday') {
              expected--;
              leave++;
            }
          } else {
            // Missing check-in -> Absent
            absent++;
          }
        }
      }

      globalPresent += present;
      globalLate += late;
      globalAbsent += absent;
      globalLeave += leave;

      const attendanceRate = expected > 0 ? Math.round((present / expected) * 100) : 100;

      return {
        id: emp.id,
        name: emp.full_name,
        jobTitle: emp.job_title || "موظف",
        currency: emp.salary_currency || "SAR",
        basic,
        allowances,
        deductions,
        net,
        totalDays: expected,
        presentDays: present,
        lateDays: late,
        absentDays: absent,
        leaveDays: leave,
        attendanceRate,
        attend: `${attendanceRate}% حضور`,
        delay: `${late} تأخير`,
      };
    });

    const attendanceStats = [
      { status: "حاضر", count: globalPresent },
      { status: "متأخر", count: globalLate },
      { status: "غائب", count: globalAbsent },
      { status: "إجازة", count: globalLeave }
    ].filter(item => item.count > 0);

    // Job Title distribution count (filtered by date range)
    const jobTitleStatsList = await query<any>(
      `SELECT job_title, COUNT(*) as count 
       FROM hr_employees 
       WHERE status = 'active' AND (hire_date IS NULL OR hire_date <= ?)
       GROUP BY job_title`,
      [endDateStr]
    );
    const jobTitleStats = jobTitleStatsList.map((r: any) => ({
      name: r.job_title || "غير محدد",
      value: Number(r.count || 0),
    }));

    // Active Leave Requests (filtered by date range overlap)
    const leaveRequestsList = await query<any>(
      `SELECT r.id, r.request_type, r.start_date, r.end_date, r.days_count, r.reason, r.status, e.full_name as employee_name
       FROM hr_requests r
       INNER JOIN hr_employees e ON r.employee_id = e.id
       WHERE (r.start_date <= ? AND r.end_date >= ?)
       ORDER BY r.created_at DESC`,
      [endDateStr, startDateStr]
    );

    const arabicRequestTypes: Record<string, string> = {
      annual_leave: "إجازة سنوية",
      sick_leave: "إجازة مرضية",
      unpaid_leave: "إجازة بدون راتب",
      emergency_leave: "إجازة طارئة",
    };

    const arabicRequestStatuses: Record<string, string> = {
      pending: "معلقة",
      approved: "معتمدة",
      rejected: "مرفوضة",
    };

    const leaveRequests = leaveRequestsList.map((r: any) => ({
      id: r.id,
      employeeName: r.employee_name,
      type: arabicRequestTypes[r.request_type] || r.request_type,
      startDate: r.start_date ? (typeof r.start_date === 'string' ? r.start_date.split("T")[0] : r.start_date.toISOString().split("T")[0]) : "",
      endDate: r.end_date ? (typeof r.end_date === 'string' ? r.end_date.split("T")[0] : r.end_date.toISOString().split("T")[0]) : "",
      daysCount: parseFloat(r.days_count || 0),
      reason: r.reason || "لا يوجد سبب محدد",
      status: r.status,
      statusLabel: arabicRequestStatuses[r.status] || r.status,
    }));

    // Maintenance status distribution
    const mtStatusList = await query<any>(
      `SELECT mt.status, COUNT(*) as count 
       FROM maintenance_tickets mt
       INNER JOIN units u ON mt.unit_id = u.id
       WHERE mt.created_at >= ? AND mt.created_at <= ? ${accountFilterUnits}
       GROUP BY mt.status`,
      [startDateStr + " 00:00:00", endDateStr + " 23:59:59", ...paramsUnits]
    );

    // Top 5 units with maintenance tickets
    const mtTopUnitsList = await query<any>(
      `SELECT u.unit_name as name, COUNT(mt.id) as count 
       FROM maintenance_tickets mt
       INNER JOIN units u ON mt.unit_id = u.id
       WHERE mt.created_at >= ? AND mt.created_at <= ? ${accountFilterUnits}
       GROUP BY u.id, u.unit_name
       ORDER BY count DESC LIMIT 5`,
      [startDateStr + " 00:00:00", endDateStr + " 23:59:59", ...paramsUnits]
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
         AND invoice_date >= ? AND invoice_date <= ?
       GROUP BY state`,
      [startDateStr, endDateStr]
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
      crmKPIs,
      crmStatusDistribution,
      hrPayroll,
      hrPayrollDetails,
      employeeAttendance,
      attendanceStats,
      leaveRequests,
      jobTitleStats,
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

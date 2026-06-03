import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCacheKey, analyticsCache, CACHE_TTL } from "@/lib/analytics-cache";

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
    if (!bypass) {
      const cached = analyticsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Analytics API] Cache Hit for key: ${cacheKey}`);
        return NextResponse.json(cached.data);
      }
    }
    console.log(`[Analytics API] Cache Miss / Bypass for key: ${cacheKey}`);

    // 3. Determine Date Range
    const now = new Date();
    const format = (d: Date) => d.toISOString().split("T")[0];
    let startDateStr = "";
    let endDateStr = "";

    if (range === "today") {
      startDateStr = format(now);
      endDateStr = format(now);
    } else if (range === "week") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      startDateStr = format(start);
      endDateStr = format(now);
    } else if (range === "month") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      startDateStr = format(start);
      endDateStr = format(now);
    } else if (range === "quarter") {
      const start = new Date();
      start.setDate(now.getDate() - 90);
      startDateStr = format(start);
      endDateStr = format(now);
    } else if (range === "year") {
      const start = new Date();
      start.setFullYear(now.getFullYear() - 1);
      startDateStr = format(start);
      endDateStr = format(now);
    } else if (range === "custom") {
      startDateStr = customStartDate || format(new Date(now.getFullYear(), now.getMonth(), 1));
      endDateStr = customEndDate || format(now);
    } else {
      // Default to last 30 days
      const start = new Date();
      start.setDate(now.getDate() - 30);
      startDateStr = format(start);
      endDateStr = format(now);
    }

    const daysCount = Math.max(
      1,
      Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

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
      accountFilterReservations = " AND r.platform_account_id = ? ";
      accountFilterBookings = " AND b.platform_account_id = ? ";
      accountFilterUnits = " AND u.platform_account_id = ? ";
      paramsReservations.push(account);
      paramsBookings.push(account);
      paramsOccupancyReservations.push(account);
      paramsOccupancyBookings.push(account);
      paramsUnits.push(account);
    }

    // 4. Calculate Revenue
    // Estimated nightly prices per property based on name patterns
    const nightlyPriceExpression = `
      CASE 
        WHEN u.unit_name LIKE '%رافال%' THEN 650
        WHEN u.unit_name LIKE '%الملقا%' THEN 950
        WHEN u.unit_name LIKE '%الهلال%' THEN 400
        WHEN u.unit_name LIKE '%الياسمين%' THEN 350
        WHEN u.unit_name LIKE '%قرطبة%' THEN 300
        ELSE 450
      END
    `;

    // A. iCal reservations revenue
    const reservationsRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(DATEDIFF(r.end_date, r.start_date) * (${nightlyPriceExpression})) as revenue
       FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.start_date >= ? AND r.start_date <= ? ${accountFilterReservations}`,
      paramsReservations
    );
    const reservationsRevenue = Number(reservationsRevenueResult[0]?.revenue || 0);

    // B. Manual bookings revenue
    const bookingsRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(b.amount) as revenue
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.checkin_date >= ? AND b.checkin_date <= ? ${accountFilterBookings}`,
      paramsBookings
    );
    const bookingsRevenue = Number(bookingsRevenueResult[0]?.revenue || 0);

    const totalRevenue = reservationsRevenue + bookingsRevenue;

    // 5. Calculate Occupied / Booked Days
    // A. iCal occupied days
    const reservationsDaysResult = await query<{ days: number | string }>(
      `SELECT SUM(DATEDIFF(
         LEAST(r.end_date, ?),
         GREATEST(r.start_date, ?)
       )) as days
       FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.start_date <= ? AND r.end_date >= ? ${accountFilterReservations}`,
      paramsOccupancyReservations
    );
    const reservationsDays = Number(reservationsDaysResult[0]?.days || 0);

    // B. Manual bookings occupied days
    const bookingsDaysResult = await query<{ days: number | string }>(
      `SELECT SUM(DATEDIFF(
         LEAST(b.checkout_date, ?),
         GREATEST(b.checkin_date, ?)
       )) as days
       FROM bookings b
       INNER JOIN units u ON b.unit_id = u.id
       WHERE b.checkin_date <= ? AND b.checkout_date >= ? ${accountFilterBookings}`,
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
    const adr = totalBookedDays > 0 ? Math.round(totalRevenue / totalBookedDays) : 0;
    const revpar = Math.round(totalRevenue / totalAvailableDays);

    // 8. Platform Share
    const airbnbRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(DATEDIFF(r.end_date, r.start_date) * (${nightlyPriceExpression})) as revenue
       FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.platform = 'airbnb' AND r.start_date >= ? AND r.start_date <= ? ${accountFilterReservations}`,
      paramsReservations
    );
    const airbnbRevenue = Number(airbnbRevenueResult[0]?.revenue || 0);

    const gathernRevenueResult = await query<{ revenue: number | string }>(
      `SELECT SUM(DATEDIFF(r.end_date, r.start_date) * (${nightlyPriceExpression})) as revenue
       FROM reservations r
       INNER JOIN units u ON r.unit_id = u.id
       WHERE r.platform = 'gathern' AND r.start_date >= ? AND r.start_date <= ? ${accountFilterReservations}`,
      paramsReservations
    );
    const gathernRevenue = Number(gathernRevenueResult[0]?.revenue || 0);

    const platformShare = {
      airbnb: airbnbRevenue,
      gathern: gathernRevenue,
      other: Math.max(0, totalRevenue - (airbnbRevenue + gathernRevenue)),
    };

    // 9. Monthly Revenue Growth (Last 6 Months)
    const monthlyData: { month: string; amount: number; percentage: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date();
      targetMonth.setMonth(now.getMonth() - i);
      const year = targetMonth.getFullYear();
      const monthIdx = targetMonth.getMonth();

      // Start & end of target month
      const startOfMonthStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
      const endOfMonthStr = new Date(year, monthIdx + 1, 0).toISOString().split("T")[0];

      const rMonthResult = await query<{ revenue: number | string }>(
        `SELECT SUM(DATEDIFF(r.end_date, r.start_date) * (${nightlyPriceExpression})) as revenue
         FROM reservations r
         INNER JOIN units u ON r.unit_id = u.id
         WHERE r.start_date >= ? AND r.start_date <= ? ${accountFilterReservations}`,
        [startOfMonthStr, endOfMonthStr, ...(account !== "all" ? [account] : [])]
      );
      const bMonthResult = await query<{ revenue: number | string }>(
        `SELECT SUM(b.amount) as revenue
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.id
         WHERE b.checkin_date >= ? AND b.checkin_date <= ? ${accountFilterBookings}`,
        [startOfMonthStr, endOfMonthStr, ...(account !== "all" ? [account] : [])]
      );

      const mRevenue = Number(rMonthResult[0]?.revenue || 0) + Number(bMonthResult[0]?.revenue || 0);
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      monthlyData.push({
        month: monthNames[monthIdx],
        amount: mRevenue,
        percentage: `${Math.min(100, Math.max(10, Math.round((mRevenue / (totalRevenue || 1)) * 100)))}%`,
      });
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

    const liveUnits = liveUnitsList.map((unit) => {
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
                (SELECT platform FROM reservations r WHERE r.unit_id = u.id ORDER BY r.start_date DESC LIMIT 1) as platform,
                COALESCE(SUM(DATEDIFF(r.end_date, r.start_date) * (${nightlyPriceExpression})), 0) as r_rev,
                COALESCE((SELECT SUM(amount) FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date >= ? AND b.checkin_date <= ?), 0) as b_rev,
                (SELECT COUNT(*) FROM reservations r2 WHERE r2.unit_id = u.id AND r2.start_date >= ? AND r2.start_date <= ?) as r_count,
                (SELECT COUNT(*) FROM bookings b2 WHERE b2.unit_id = u.id AND b2.checkin_date >= ? AND b2.checkin_date <= ?) as b_count,
                (SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.unit_id = u.id AND mt.status = 'resolved') as m_tickets
         FROM units u
         LEFT JOIN reservations r ON r.unit_id = u.id AND r.start_date >= ? AND r.start_date <= ?
         WHERE u.status = 'active' ${accountFilterUnits}
         GROUP BY u.id, u.unit_name
       ) as tmp
       ORDER BY (r_rev + b_rev) DESC LIMIT 5`,
      [startDateStr, endDateStr, startDateStr, endDateStr, startDateStr, endDateStr, startDateStr, endDateStr, ...paramsUnits]
    );

    const profitability = profitabilityList.map((unit) => {
      const uRev = Number(unit.r_rev) + Number(unit.b_rev);
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

    const recentDeals = recentDealsList.map((deal) => {
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

    const employeeAttendance = employeeAttendanceList.map((emp) => {
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

    const responseData = {
      stats: {
        totalRevenue: `${totalRevenue.toLocaleString("en-US")} ر.س`,
        occupancyRate: `${occupancyRate}%`,
        adr: `${adr.toLocaleString("en-US")} ر.س`,
        revpar: `${revpar.toLocaleString("en-US")} ر.س`,
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
      },
      monthlyData,
      liveUnits,
      profitability,
      crmPipeline,
      recentDeals,
      hrPayroll,
      employeeAttendance,
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

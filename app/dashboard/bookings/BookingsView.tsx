"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Phone, User, DollarSign, Home, Layers, List, Grid3x3, Table, Edit, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { EditBookingButton } from "./EditBookingButton";
import { DeleteBookingButton } from "./DeleteBookingButton";

type ViewType = "list" | "grid" | "table";

interface Booking {
  id: string;
  type?: "manual" | "ical";
  guest_name: string;
  phone?: string | null;
  checkin_date: string;
  checkout_date: string;
  amount?: number | null;
  currency?: string | null;
  platform?: string | null;
  platform_account_id?: string | null;
  notes?: string | null;
  needs_update?: boolean;
  unit?: {
    id: string;
    unit_name: string;
    unit_code?: string | null;
  } | null;
  platform_account?: {
    id: string;
    account_name: string;
    platform: string;
  } | null;
}

interface BookingsViewProps {
  bookings: Booking[];
  canEdit?: boolean;
  showAmount?: boolean;
}

// ----------------------------------------------------------------------
// دالة المعالجة السحرية لتجاهل الوقت تماماً
// ----------------------------------------------------------------------
function formatArDate(dateStr: string | Date) {
  if (!dateStr) return "";

  // Handle Date objects from MySQL
  let dateString: string;
  if (dateStr instanceof Date) {
    // Correctly get YYYY-MM-DD from local date to avoid timezone shifts
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    dateString = `${y}-${m}-${d}`;
  } else if (typeof dateStr === "string") {
    dateString = dateStr.split("T")[0]; // Handle ISO strings with time
  } else {
    return "";
  }

  // نفكك التاريخ القادم (2025-12-16) إلى أرقام
  const [y, m, d] = dateString.split("-");

  // ننشئ تاريخاً محلياً يبدأ من منتصف الليل بتوقيت جهاز المستخدم
  // هذا يضمن أن اليوم يظل ثابتاً ولا يتأثر بـ UTC
  const date = new Date(Number(y), Number(m) - 1, Number(d));

  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "numeric", // أو "long" لو عايز اسم الشهر بالعربي
    year: "numeric"
  });
}

export function BookingsView({ bookings, canEdit = false, showAmount = false }: BookingsViewProps) {
  const [view, setView] = useState<ViewType>("list");

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("bookings-view") as ViewType;
    if (savedView && ["list", "grid", "table"].includes(savedView)) {
      setView(savedView);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    localStorage.setItem("bookings-view", newView);
  };

  if (bookings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500 text-lg">لا توجد حجوزات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 ml-3">طريقة العرض:</span>
          <button
            onClick={() => handleViewChange("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === "list"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
              }`}
          >
            <List className="w-4 h-4" />
            <span>قائمة</span>
          </button>
          <button
            onClick={() => handleViewChange("grid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === "grid"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
              }`}
          >
            <Grid3x3 className="w-4 h-4" />
            <span>شبكة</span>
          </button>
          <button
            onClick={() => handleViewChange("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === "table"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
              }`}
          >
            <Table className="w-4 h-4" />
            <span>جدول</span>
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {bookings.length} حجز
        </div>
      </div>

      {/* Render based on selected view */}
      {view === "list" && <ListView bookings={bookings} canEdit={canEdit} showAmount={showAmount} />}
      {view === "grid" && <GridView bookings={bookings} canEdit={canEdit} showAmount={showAmount} />}
      {view === "table" && <TableView bookings={bookings} canEdit={canEdit} showAmount={showAmount} />}
    </div>
  );
}

// List View Component
function ListView({ bookings, canEdit, showAmount }: BookingsViewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="divide-y">
        {bookings.map((b) => (
          <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{b.guest_name}</h3>
                    {b.needs_update && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        يحتاج تعديل
                      </span>
                    )}
                    {b.type === "ical" && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        iCal
                      </span>
                    )}
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Phone className="w-3 h-3" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-left">
                  {showAmount && (
                    <div className="text-lg font-bold text-green-600">
                      {b.amount || 0} {b.currency || "SAR"}
                    </div>
                  )}
                  {b.platform && (
                    <div className="text-xs text-gray-500 mt-1">
                      {b.platform}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 border-r pr-2 mr-2">
                    <EditBookingButton bookingId={b.id} canEdit={canEdit} />
                    <DeleteBookingButton bookingId={b.id} canEdit={canEdit} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <span>
                  <span className="font-medium">دخول:</span> {formatArDate(b.checkin_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <span>
                  <span className="font-medium">خروج:</span> {formatArDate(b.checkout_date)}
                </span>
              </div>
              {b.unit && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-400" />
                  <span>
                    {b.unit.unit_name}
                    {b.unit.unit_code && <span className="text-gray-400"> ({b.unit.unit_code})</span>}
                  </span>
                </div>
              )}
              {b.platform_account && (
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span>
                    <span className="font-medium">الحساب:</span> {b.platform_account.account_name}
                  </span>
                </div>
              )}
            </div>

            {b.notes && (
              <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {b.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Grid View Component
function GridView({ bookings, canEdit, showAmount }: BookingsViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{b.guest_name}</h3>
                  {b.needs_update && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      يحتاج تعديل
                    </span>
                  )}
                  {b.type === "ical" && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      iCal
                    </span>
                  )}
                </div>
                {b.phone && (
                  <p className="text-xs text-gray-500 mt-1">{b.phone}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {b.platform && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {b.platform}
                </span>
              )}
              {canEdit && (
                <div className="flex items-center gap-1">
                  <EditBookingButton bookingId={b.id} canEdit={canEdit} />
                  <DeleteBookingButton bookingId={b.id} canEdit={canEdit} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span>
                {formatArDate(b.checkin_date)} → {formatArDate(b.checkout_date)}
              </span>
            </div>
            {b.unit && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Home className="w-4 h-4 text-gray-400" />
                <span>
                  {b.unit.unit_name}
                  {b.unit.unit_code && <span className="text-gray-400"> ({b.unit.unit_code})</span>}
                </span>
              </div>
            )}
            {b.platform_account && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Layers className="w-4 h-4 text-gray-400" />
                <span>{b.platform_account.account_name}</span>
              </div>
            )}
            {showAmount && (
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <DollarSign className="w-4 h-4" />
                <span>
                  {b.amount || 0} {b.currency || "SAR"}
                </span>
              </div>
            )}
          </div>

          {b.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
              {b.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Table View Component
function TableView({ bookings, canEdit, showAmount }: BookingsViewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الضيف</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الهاتف</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الدخول</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الخروج</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الوحدة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحساب</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنصة</th>
              {showAmount && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المبلغ</th>}
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ملاحظات</th>
              {canEdit && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{b.guest_name}</span>
                    {b.needs_update && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        يحتاج تعديل
                      </span>
                    )}
                    {b.type === "ical" && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        iCal
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.phone || "-"}</td>

                {/* تم تعديل طريقة عرض التواريخ هنا لتستخدم الدالة الموحدة */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatArDate(b.checkin_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatArDate(b.checkout_date)}
                </td>

                <td className="px-4 py-3 text-sm text-gray-600">
                  {b.unit ? (
                    <>
                      {b.unit.unit_name}
                      {b.unit.unit_code && <span className="text-gray-400"> ({b.unit.unit_code})</span>}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {b.platform_account ? (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {b.platform_account.account_name}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {b.platform ? (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{b.platform}</span>
                  ) : (
                    "-"
                  )}
                </td>
                {showAmount && (
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    {b.amount || 0} {b.currency || "SAR"}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {b.notes || "-"}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EditBookingButton bookingId={b.id} canEdit={canEdit} />
                      <DeleteBookingButton bookingId={b.id} canEdit={canEdit} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
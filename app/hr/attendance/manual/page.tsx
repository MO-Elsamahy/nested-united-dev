"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Plus, X, Save, Clock, CheckCircle, AlertTriangle, Loader2, Calendar } from "lucide-react";
import type { ReactNode } from "react";

interface EmployeeAttendance {
    id: string;
    full_name: string;
    department: string | null;
    job_title: string | null;
    attendance_id: string | null;
    check_in: string | null;
    check_out: string | null;
    status: string | null;
    late_minutes: number | null;
    overtime_minutes: number | null;
    notes: string | null;
    shift_start: string | null;
    shift_end: string | null;
}

function formatTimeFromDB(datetimeStr: string | null): string {
    if (!datetimeStr) return "";
    // datetimeStr: "2026-05-18 09:00:00" or ISO
    const t = datetimeStr.replace("T", " ");
    return t.slice(11, 16); // HH:MM
}

function getStatusBadge(emp: EmployeeAttendance) {
    // إذا كان في سجل بالداتابيس → نعتمد على حقل status
    if (emp.attendance_id) {
        const map: Record<string, { label: string; cls: string; icon: ReactNode }> = {
            present: { label: "حاضر",  cls: "text-green-600 bg-green-50",  icon: <CheckCircle className="w-3 h-3" /> },
            late:    { label: `متأخر ${emp.late_minutes || 0}د`, cls: "text-yellow-600 bg-yellow-50", icon: <Clock className="w-3 h-3" /> },
            absent:  { label: "غائب",  cls: "text-red-600 bg-red-50",     icon: <AlertTriangle className="w-3 h-3" /> },
            leave:   { label: "إجازة",  cls: "text-blue-600 bg-blue-50",  icon: <CheckCircle className="w-3 h-3" /> },
            holiday: { label: "عطلة",   cls: "text-purple-600 bg-purple-50", icon: <CheckCircle className="w-3 h-3" /> },
        };
        const s = map[emp.status || ""] || { label: emp.status || "غير محدد", cls: "text-gray-600 bg-gray-50", icon: <Clock className="w-3 h-3" /> };
        return (
            <span className={`flex items-center gap-1 ${s.cls} px-2 py-1 rounded text-xs`}>
                {s.icon} {s.label}
            </span>
        );
    }
    // لو مافيش سجل خالص → غائب بالكامل
    return (
        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
            <AlertTriangle className="w-3 h-3" /> غائب
        </span>
    );
}

interface EditModalProps {
    employee: EmployeeAttendance;
    date: string;
    onClose: () => void;
    onSaved: () => void;
}

function EditModal({ employee, date, onClose, onSaved }: EditModalProps) {
    const [checkIn, setCheckIn] = useState(formatTimeFromDB(employee.check_in));
    const [checkOut, setCheckOut] = useState(formatTimeFromDB(employee.check_out));
    const [status, setStatus] = useState(employee.status || "present");
    const [notes, setNotes] = useState(employee.notes || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Derive shift hours from employee data (HH:MM:SS → HH:MM)
    const shiftStart = (employee.shift_start || "09:00").slice(0, 5);
    const shiftEnd   = (employee.shift_end   || "17:00").slice(0, 5);

    function applyFullDay() {
        setCheckIn(shiftStart);
        setCheckOut(shiftEnd);
        setStatus("present");
        if (!notes) setNotes("تسجيل يدوي — دوام كامل");
    }

    async function handleSave() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/hr/attendance/manual", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: employee.id,
                    date,
                    check_in: checkIn || null,
                    check_out: checkOut || null,
                    status,
                    notes: notes || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "حدث خطأ");
            onSaved();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">تعديل سجل الحضور</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{employee.full_name} — {date}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Full Day Quick Button */}
                    <button
                        type="button"
                        onClick={applyFullDay}
                        className="w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-2.5 rounded-xl font-medium text-sm transition"
                    >
                        <CheckCircle className="w-4 h-4" />
                        دوام كامل ({shiftStart} — {shiftEnd})
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                        <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-white px-2">أو أدخل الأوقات يدوياً</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">وقت الحضور</label>
                            <input
                                type="time"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">وقت الانصراف</label>
                            <input
                                type="time"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="present">حاضر</option>
                            <option value="late">متأخر</option>
                            <option value="absent">غائب</option>
                            <option value="leave">إجازة</option>
                            <option value="holiday">عطلة</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="مثال: تسجيل يدوي لفترة ما قبل استخدام النظام"
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-medium transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ التغييرات
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 transition"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ManualAttendancePage() {
    const today = new Date().toISOString().split("T")[0];
    const [date, setDate] = useState(today);
    const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeAttendance | null>(null);
    const [successMsg, setSuccessMsg] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/attendance/manual?date=${date}`);
            const data = await res.json();
            if (Array.isArray(data)) setEmployees(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function handleSaved() {
        setEditingEmployee(null);
        setSuccessMsg("تم حفظ سجل الحضور بنجاح ✓");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchData();
    }

    const stats = {
        total:   employees.length,
        present: employees.filter((e) => e.attendance_id && (e.status === "present" || e.status === "late")).length,
        absent:  employees.filter((e) => !e.attendance_id || e.status === "absent").length,
        late:    employees.filter((e) => e.status === "late").length,
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تعديل الحضور اليدوي</h1>
                    <p className="text-gray-500 text-sm mt-1">تعديل أو إضافة سجلات حضور للموظفين لأي يوم</p>
                </div>

                {/* Date picker */}
                <div className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2 shadow-sm">
                    <Calendar className="w-5 h-5 text-violet-600" />
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) => setDate(e.target.value)}
                        className="text-sm font-medium text-gray-800 focus:outline-none"
                    />
                </div>
            </div>

            {/* Success message */}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {successMsg}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <p className="text-gray-500 text-sm">إجمالي الموظفين</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                    <p className="text-green-700 text-sm">حاضرين</p>
                    <p className="text-3xl font-bold text-green-700">{stats.present}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                    <p className="text-red-700 text-sm">غائبين</p>
                    <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
                    <p className="text-yellow-700 text-sm">متأخرين</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin ml-2" />
                        جاري التحميل...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">الموظف</th>
                                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">القسم</th>
                                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحالة</th>
                                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحضور</th>
                                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الانصراف</th>
                                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">ملاحظات</th>
                                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-sm">
                                                    {emp.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{emp.full_name}</p>
                                                    <p className="text-gray-400 text-xs">{emp.job_title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{emp.department || "—"}</td>
                                        <td className="px-6 py-4 text-center">{getStatusBadge(emp)}</td>
                                        <td className="px-6 py-4 text-center font-mono text-sm text-gray-900">
                                            {formatTimeFromDB(emp.check_in) || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-sm text-gray-900">
                                            {formatTimeFromDB(emp.check_out) || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-400 max-w-[120px] truncate">
                                            {emp.notes || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setEditingEmployee(emp)}
                                                className="inline-flex items-center gap-1.5 text-sm bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg transition font-medium"
                                            >
                                                {emp.attendance_id ? (
                                                     <><Pencil className="w-3.5 h-3.5" /> تعديل</>
                                                 ) : (
                                                     <><Plus className="w-3.5 h-3.5" /> إضافة</>
                                                 )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {employees.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                <p>لا توجد بيانات لهذا اليوم</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingEmployee && (
                <EditModal
                    employee={editingEmployee}
                    date={date}
                    onClose={() => setEditingEmployee(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}

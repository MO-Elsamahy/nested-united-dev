"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Calendar, Briefcase } from "lucide-react";

interface EmployeeProfile {
    id: string;
    full_name: string;
    job_title: string;
    department: string;
    employee_number: string;
    phone: string | null;
    email: string | null;
    national_id: string | null;
    hire_date: string | null;
    contract_type: string;
    annual_leave_balance: number;
}

export default function EmployeeProfilePage() {
    const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await fetch("/api/hr/employees/me");
                const data = await res.json();
                if (!data.error) setEmployee(data);
            } catch {
                // Ignore error
            } finally {
                setLoading(false);
            }
        };
        void loadProfile();
    }, []);

    if (loading) return <div className="p-12 text-center text-gray-500">جاري التحميل...</div>;
    if (!employee) return <div className="p-12 text-center text-red-500">لا يوجد بيانات موظف</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 text-3xl font-bold">
                    {employee.full_name?.charAt(0)}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
                    <p className="text-violet-600 font-medium">{employee.job_title}</p>
                    <div className="flex flex-wrap gap-4 mt-3 justify-center md:justify-start text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" /> {employee.department}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono">#{employee.employee_number}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">البيانات الشخصية</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">رقم الجوال</p>
                                <p className="text-gray-900" dir="ltr">{employee.phone || "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                                <p className="text-gray-900" dir="ltr">{employee.email || "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">رقم الهوية</p>
                                <p className="text-gray-900">{employee.national_id || "—"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">بيانات العمل</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">تاريخ التعيين</p>
                                <p className="text-gray-900">
                                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("ar-SA") : "—"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Briefcase className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">نوع العقد</p>
                                <p className="text-gray-900">
                                    {employee.contract_type === "full_time" ? "دوام كامل" :
                                        employee.contract_type === "part_time" ? "دوام جزئي" : "عقد"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-400">رصيد الإجازات</p>
                                <p className="text-green-600 font-bold">{employee.annual_leave_balance} يوم</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

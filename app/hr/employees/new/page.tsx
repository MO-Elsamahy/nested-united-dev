"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight,
    Save,
    Loader2,
    User,
    Briefcase,
    DollarSign,
    Building,
    CreditCard,
} from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
}

export default function NewEmployeePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        user_id: "",
        shift_id: "",
        employee_number: "",
        full_name: "",
        national_id: "",
        phone: "",
        email: "",
        department: "",
        job_title: "",
        hire_date: new Date().toISOString().split("T")[0],
        contract_type: "full_time",
        basic_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        annual_leave_balance: 0,
        sick_leave_balance: 0,
        bank_name: "",
        iban: "",
    });

    useEffect(() => {
        // Fetch users for linking
        fetch("/api/users")
            .then((res) => res.json())
            .then((data) => setUsers(data || []))
            .catch(() => setUsers([]));

        // Fetch shifts
        fetch("/api/hr/shifts")
            .then((res) => res.json())
            .then((data) => setShifts(Array.isArray(data) ? data : []))
            .catch(() => setShifts([]));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/hr/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                router.push("/hr/employees");
            } else {
                alert(data.error || "حدث خطأ");
            }
        } catch (error) {
            alert("حدث خطأ في الاتصال");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : value,
        }));
    };

    const totalSalary =
        Number(formData.basic_salary) +
        Number(formData.housing_allowance) +
        Number(formData.transport_allowance) +
        Number(formData.other_allowances);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/hr/employees"
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إضافة موظف جديد</h1>
                    <p className="text-gray-500">أدخل بيانات الموظف</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-violet-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">البيانات الشخصية</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                الاسم الكامل *
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                required
                                value={formData.full_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="أحمد محمد العلي"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رقم الموظف
                            </label>
                            <input
                                type="text"
                                name="employee_number"
                                value={formData.employee_number}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="EMP001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رقم الهوية
                            </label>
                            <input
                                type="text"
                                name="national_id"
                                value={formData.national_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="1xxxxxxxxx"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رقم الجوال
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="05xxxxxxxx"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="example@email.com"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ربط بحساب مستخدم
                            </label>
                            <select
                                name="user_id"
                                value={formData.user_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                            >
                                <option value="">بدون ربط</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Job Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">البيانات الوظيفية</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                القسم
                            </label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="تأجير / محاسبة / موارد بشرية"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                المسمى الوظيفي
                            </label>
                            <input
                                type="text"
                                name="job_title"
                                value={formData.job_title}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="موظف استقبال"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                تاريخ التعيين
                            </label>
                            <input
                                type="date"
                                name="hire_date"
                                value={formData.hire_date}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                نوع العقد
                            </label>
                            <select
                                name="contract_type"
                                value={formData.contract_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                            >
                                <option value="full_time">دوام كامل</option>
                                <option value="part_time">دوام جزئي</option>
                                <option value="contract">عقد مؤقت</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            نظام الدوام (الوردية)
                        </label>
                        <select
                            name="shift_id"
                            value={formData.shift_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                        >
                            <option value="">افتراضي (الإعدادات العامة)</option>
                            {shifts.map((shift) => (
                                <option key={shift.id} value={shift.id}>
                                    {shift.name} ({shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            إذا لم يتم تحديد وردية، سيتم تطبيق الإعدادات العامة للنظام.
                        </p>
                    </div>
                </div>

                {/* Salary Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">بيانات الراتب</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                الراتب الأساسي
                            </label>
                            <input
                                type="number"
                                name="basic_salary"
                                value={formData.basic_salary}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                بدل السكن
                            </label>
                            <input
                                type="number"
                                name="housing_allowance"
                                value={formData.housing_allowance}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                بدل المواصلات
                            </label>
                            <input
                                type="number"
                                name="transport_allowance"
                                value={formData.transport_allowance}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                بدلات أخرى
                            </label>
                            <input
                                type="number"
                                name="other_allowances"
                                value={formData.other_allowances}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                        <span className="text-gray-600">إجمالي الراتب الشهري:</span>
                        <span className="text-2xl font-bold text-green-600">
                            {totalSalary.toLocaleString()} ر.س
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رصيد الإجازات السنوية
                            </label>
                            <input
                                type="number"
                                name="annual_leave_balance"
                                value={formData.annual_leave_balance}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رصيد الإجازات المرضية
                            </label>
                            <input
                                type="number"
                                name="sick_leave_balance"
                                value={formData.sick_leave_balance}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">بيانات البنك</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                اسم البنك
                            </label>
                            <input
                                type="text"
                                name="bank_name"
                                value={formData.bank_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="بنك الراجحي"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رقم IBAN
                            </label>
                            <input
                                type="text"
                                name="iban"
                                value={formData.iban}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="SA..."
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-4">
                    <Link
                        href="/hr/employees"
                        className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition"
                    >
                        إلغاء
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-medium transition disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        حفظ الموظف
                    </button>
                </div>
            </form>
        </div>
    );
}

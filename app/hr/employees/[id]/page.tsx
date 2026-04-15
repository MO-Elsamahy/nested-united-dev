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
    Trash2,
} from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
}

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        hire_date: "",
        contract_type: "full_time",
        basic_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        annual_leave_balance: 0,
        sick_leave_balance: 0,
        bank_name: "",
        iban: "",
        status: "active",
        exclude_from_payroll: false,
    });
    const [id, setId] = useState<string>("");

    useEffect(() => {
        params.then(p => {
            setId(p.id);
            fetchData(p.id);
        });
    }, []);

    const fetchData = async (empId: string) => {
        try {
            const [empRes, usersRes, shiftsRes] = await Promise.all([
                fetch(`/api/hr/employees/${empId}`),
                fetch("/api/users"),
                fetch("/api/hr/shifts"),
            ]);

            if (empRes.ok) {
                const emp = await empRes.json();
                // Format date for input
                if (emp.hire_date) emp.hire_date = emp.hire_date.split("T")[0];
                setFormData(emp);
            } else {
                alert("الموظف غير موجود");
                router.push("/hr/employees");
            }

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(Array.isArray(usersData) ? usersData : []);
            }

            if (shiftsRes.ok) {
                const shiftsData = await shiftsRes.json();
                setShifts(Array.isArray(shiftsData) ? shiftsData : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/hr/employees/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert("تم تحديث بيانات الموظف بنجاح");
                router.refresh();
            } else {
                const data = await response.json();
                alert(data.error || "حدث خطأ");
            }
        } catch (error) {
            alert("حدث خطأ في الاتصال");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;

        try {
            const response = await fetch(`/api/hr/employees/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                router.push("/hr/employees");
            } else {
                alert("حدث خطأ أثناء الحذف");
            }
        } catch (error) {
            alert("خطأ في الاتصال");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : (type === "number" ? parseFloat(value) || 0 : value),
        }));
    };

    const totalSalary =
        Number(formData.basic_salary) +
        Number(formData.housing_allowance) +
        Number(formData.transport_allowance) +
        Number(formData.other_allowances);

    if (loading) return <div className="p-12 text-center">جاري التحميل...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/hr/employees"
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">تعديل بيانات الموظف</h1>
                        <p className="text-gray-500">{formData.full_name}</p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                >
                    <Trash2 className="w-5 h-5" />
                    حذف الموظف
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Status */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">حالة الموظف</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                    >
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط (إجازة طويلة)</option>
                        <option value="terminated">منتهي خدماته</option>
                    </select>
                </div>

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
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ربط بحساب مستخدم
                            </label>
                            <select
                                name="user_id"
                                value={formData.user_id || ""}
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
                            value={formData.shift_id || ""}
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

                    <div className="mt-6 pt-6 border-t font-semibold">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    name="exclude_from_payroll"
                                    checked={formData.exclude_from_payroll}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:inline-start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                استبعاد الموظف من كشوف الرواتب
                            </span>
                        </label>
                        <p className="text-xs text-slate-500 mt-2 mr-14 font-normal">
                            عند تفعيل هذا الخيار، لن يتم إدراج هذا الموظف في مسودات الرواتب الشهرية التلقائية.
                        </p>
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
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-4 p-6 bg-gray-50 rounded-xl">
                    <Link
                        href="/hr/employees"
                        className="px-6 py-2.5 text-gray-700 hover:bg-white rounded-xl transition"
                    >
                        إلغاء التعديلات
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-lg"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        حفظ التغييرات
                    </button>
                </div>
            </form >
        </div >
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, ArrowRight, Loader2, MessageSquare, AlertTriangle, FileWarning, Search } from "lucide-react";
import { Employee } from "@/lib/types/hr";

export default function ComposeMessagePage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        employee_id: "",
        msg_type: "notice",
        title: "",
        content: ""
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch("/api/hr/employees?status=active");
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.employee_id) {
            alert("يرجى اختيار الموظف المستلم");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/hr/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/hr/messages");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "حدث خطأ أثناء الإرسال");
                setSubmitting(false);
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل في الاتصال");
            setSubmitting(false);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
                <Link href="/hr/messages" className="p-2 hover:bg-gray-100 rounded-xl transition">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إرسال رسالة إدارية</h1>
                    <p className="text-gray-500">إرسال لفت نظر، تنبيه، أو مخالفة لموظف</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border">
                
                {/* Message Type */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-900">نوع الرسالة</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                            formData.msg_type === "notice" ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                        }`}>
                            <input 
                                type="radio" 
                                name="type" 
                                className="sr-only"
                                checked={formData.msg_type === "notice"}
                                onChange={() => setFormData({ ...formData, msg_type: "notice" })}
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                formData.msg_type === "notice" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                            }`}>
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">لفت نظر</h3>
                                <p className="text-xs text-gray-500">ملاحظة إدارية للموظف</p>
                            </div>
                        </label>
                        
                        <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                            formData.msg_type === "warning" ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-gray-200"
                        }`}>
                            <input 
                                type="radio" 
                                name="type" 
                                className="sr-only"
                                checked={formData.msg_type === "warning"}
                                onChange={() => setFormData({ ...formData, msg_type: "warning" })}
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                formData.msg_type === "warning" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"
                            }`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">تنبيه</h3>
                                <p className="text-xs text-gray-500">تنبيه لخطأ تم ارتكابه</p>
                            </div>
                        </label>

                        <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                            formData.msg_type === "violation" ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"
                        }`}>
                            <input 
                                type="radio" 
                                name="type" 
                                className="sr-only"
                                checked={formData.msg_type === "violation"}
                                onChange={() => setFormData({ ...formData, msg_type: "violation" })}
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                formData.msg_type === "violation" ? "bg-red-600 text-white" : "bg-red-100 text-red-600"
                            }`}>
                                <FileWarning className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">مخالفة صريحة</h3>
                                <p className="text-xs text-gray-500">إنذار نهائي أو جسيم</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Employee Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-900">الموظف المستلم</label>
                    
                    <div className="relative mb-3">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="ابحث عن موظف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                        {loadingEmployees ? (
                            <div className="col-span-full py-4 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="col-span-full py-4 text-center text-gray-500 text-sm">
                                لا يوجد موظفين نشطين بهذا الاسم
                            </div>
                        ) : (
                            filteredEmployees.map(emp => (
                                <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                    formData.employee_id === emp.id ? "bg-violet-50 border-violet-600 ring-1 ring-violet-600" : "hover:bg-gray-50"
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="employee" 
                                        className="sr-only"
                                        checked={formData.employee_id === emp.id}
                                        onChange={() => setFormData({ ...formData, employee_id: emp.id })}
                                    />
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-shrink-0 items-center justify-center font-bold text-gray-600 text-sm">
                                        {emp.full_name?.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{emp.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate">{emp.department} - {emp.job_title}</p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">عنوان الرسالة</label>
                    <input
                        type="text"
                        required
                        placeholder="مثال: غياب متكرر بدون إذن، التأخر المستمر، الخ..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500"
                    />
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">النص والتفاصيل</label>
                    <textarea
                        required
                        rows={6}
                        placeholder="اكتب تفاصيل الإجراء الإداري الموجه للموظف..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 resize-none"
                    ></textarea>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-violet-200 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        <span>إرسال الرسالة للموظف</span>
                    </button>
                </div>

            </form>
        </div>
    );
}

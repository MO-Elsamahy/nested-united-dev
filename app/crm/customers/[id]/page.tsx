"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight, Phone, Mail, MapPin, Edit,
    Calendar, MessageSquare, PhoneCall, FileText,
    Clock, CheckCircle, AlertCircle, Plus, User, Building2, Trophy, Sparkles
} from "lucide-react";
import CustomerTags from "./CustomerTags";

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activityForm, setActivityForm] = useState({ type: "note", description: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/crm/customers/${id}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                alert("Customer not found");
                router.push("/crm/customers");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activityForm.description) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/crm/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: id,
                    type: activityForm.type,
                    title: activityForm.type === 'note' ? 'ملاحظة' : 'اتصال هاتفي',
                    description: activityForm.description
                })
            });

            if (res.ok) {
                setActivityForm({ type: "note", description: "" });
                fetchData(); // Refresh timeline
            }
        } catch (e) {
            alert("Error adding activity");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center">جاري التحميل...</div>;
    if (!data) return null;

    const { customer, activities, deals } = data;

    return (
        <div className="space-y-6">
            {/* Header / Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${customer.type === 'company' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {customer.type === 'company' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {customer.status === 'active' ? 'نشط' : customer.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-gray-500 text-sm">
                                {deals.length > 0 ? (
                                    <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold border border-amber-200 flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        <span>عميل سابق ({deals.length} صفقات)</span>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        <span>عميل جديد</span>
                                    </div>
                                )}

                                {/* Customer Tags */}
                                <CustomerTags customerId={customer.id} />

                                <div className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    <span dir="ltr">{customer.phone}</span>
                                </div>
                                {customer.email && (
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/crm/deals/new?customer_id=${id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <Plus className="w-4 h-4" />
                            صفقة جديدة
                        </Link>
                        <button className="bg-white border text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition">
                            <Edit className="w-4 h-4" />
                            تعديل
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Right Column: Timeline & Activities */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Activity Input */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-500" />
                            تسجيل نشاط
                        </h3>
                        <form onSubmit={handleAddActivity}>
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: 'note' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activityForm.type === 'note' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    ملاحظة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: 'call' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activityForm.type === 'call' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    اتصال
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: 'meeting' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activityForm.type === 'meeting' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    اجتماع
                                </button>
                            </div>
                            <textarea
                                required
                                value={activityForm.description}
                                onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
                                placeholder="اكتب تفاصيل النشاط هنا..."
                                className="w-full border rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                            ></textarea>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                                >
                                    {submitting ? "جاري الحفظ..." : "تسجيل"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border p-6 relative">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-500" />
                            سجل النشاطات (Timeline)
                        </h3>

                        <div className="space-y-8 relative before:absolute before:inset-0 before:mr-5 before:-ml-px before:h-full before:w-0.5 before:bg-gray-100 before:z-0">
                            {activities.map((activity: any) => (
                                <div key={activity.id} className="relative z-10 flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0 ${activity.type === 'call' ? 'bg-blue-100 text-blue-600' :
                                        activity.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                                            activity.type === 'status_change' ? 'bg-green-100 text-green-600' :
                                                'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {activity.type === 'call' ? <PhoneCall className="w-4 h-4" /> :
                                            activity.type === 'meeting' ? <User className="w-4 h-4" /> :
                                                activity.type === 'status_change' ? <CheckCircle className="w-4 h-4" /> :
                                                    <FileText className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900">{activity.title}</span>
                                            <span className="text-xs text-gray-400" dir="ltr">
                                                {new Date(activity.performed_at).toLocaleString('ar-EG')}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{activity.description}</p>
                                        <div className="mt-2 text-xs text-gray-400">
                                            بواسطة: {activity.performed_by_name || "النظام"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && (
                                <p className="text-center text-gray-400 py-8">لا توجد نشاطات مسجلة بعد</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Left Column: Info & Deals */}
                <div className="space-y-6">
                    {/* Notes Card */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <h3 className="font-bold text-gray-900 mb-3 text-sm">ملاحظات عامة</h3>
                        <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 min-h-[80px]">
                            {customer.notes || "لا توجد ملاحظات"}
                        </p>
                    </div>

                    {/* Active Deals */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 text-sm">الصفقات النشطة</h3>
                            <Link href={`/crm/deals/new?customer_id=${id}`} className="text-blue-600 text-xs hover:underline">
                                + إضافة
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {deals.map((deal: any) => (
                                <div key={deal.id} className="border rounded-lg p-3 hover:bg-gray-50 transition block">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-800">{deal.title}</span>
                                        <span className={`text-[10px] px-2 py-1 rounded-full ${deal.stage === 'won' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {deal.stage}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                                        <span>{deal.value} ر.س</span>
                                        {deal.expected_close_date && (
                                            <span>{new Date(deal.expected_close_date).toLocaleDateString('ar-EG')}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {deals.length === 0 && (
                                <p className="text-center text-gray-400 text-xs py-4">لا توجد صفقات</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

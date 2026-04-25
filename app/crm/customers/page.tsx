"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, User, Building2, Phone, Mail, MoreVertical, Trophy, Tags } from "lucide-react";
import type { CRMCustomer, CrmTag } from "@/lib/types/crm";

function dealCounts(c: CRMCustomer) {
    const total = Number(c.total_deal_count ?? 0) || 0;
    const open = Number(c.open_deal_count ?? 0) || 0;
    return { total, open };
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<CRMCustomer[]>([]);
    const [tags, setTags] = useState<CrmTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [activeDealsFilter, setActiveDealsFilter] = useState("");
    const [dealsTotalFilter, setDealsTotalFilter] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/crm/tags")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setTags(data as CrmTag[]);
                else setTags([]);
            })
            .catch(() => setTags([]));
    }, []);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (typeFilter) params.append("type", typeFilter);
            if (activeDealsFilter) params.append("active_deals", activeDealsFilter);
            if (dealsTotalFilter) params.append("deals_total", dealsTotalFilter);
            if (tagFilter) params.append("tag_id", tagFilter);

            const res = await fetch(`/api/crm/customers?${params}`);
            const data = await res.json();
            if (!res.ok) {
                setCustomers([]);
                setLoadError(
                    typeof data?.error === "string" ? data.error : "تعذّر تحميل قائمة العملاء"
                );
                return;
            }
            setCustomers(Array.isArray(data) ? data : []);
        } catch {
            setCustomers([]);
            setLoadError("تعذّر تحميل قائمة العملاء");
        } finally {
            setLoading(false);
        }
    }, [search, typeFilter, activeDealsFilter, dealsTotalFilter, tagFilter]);

    useEffect(() => {
        const timer = setTimeout(fetchCustomers, 400);
        return () => clearTimeout(timer);
    }, [fetchCustomers]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
                    <p className="text-gray-500">إدارة قاعدة بيانات العملاء والفلترة المتقدمة</p>
                </div>
                <Link
                    href="/crm/customers/new"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>عميل جديد</span>
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الهاتف، أو البريد..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">نوع العميل</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">الكل</option>
                            <option value="individual">فرد</option>
                            <option value="company">شركة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            صفقات نشطة حالياً
                        </label>
                        <select
                            value={activeDealsFilter}
                            onChange={(e) => setActiveDealsFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">الكل</option>
                            <option value="yes">يوجد لديه صفقة (أو أكثر) مفتوحة</option>
                            <option value="no">لا يوجد لديه صفقات مفتوحة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            إجمالي عدد الصفقات
                        </label>
                        <select
                            value={dealsTotalFilter}
                            onChange={(e) => setDealsTotalFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">أي عدد</option>
                            <option value="0">بدون صفقات (0)</option>
                            <option value="1">صفقة واحدة فقط</option>
                            <option value="2-4">من 2 إلى 4 صفقات</option>
                            <option value="5+">5 صفقات فأكثر</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">الوسم</label>
                        <select
                            value={tagFilter}
                            onChange={(e) => setTagFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">كل الوسوم</option>
                            {tags.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border shadow-sm animate-pulse h-40" />
                    ))
                ) : customers.length > 0 ? (
                    customers.map((customer) => {
                        const { total, open } = dealCounts(customer);
                        return (
                            <div
                                key={customer.id}
                                className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition group relative"
                            >
                                <Link href={`/crm/customers/${customer.id}`} className="absolute inset-0 z-0" />

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                                                customer.type === "company"
                                                    ? "bg-purple-100 text-purple-600"
                                                    : "bg-blue-100 text-blue-600"
                                            }`}
                                        >
                                            {customer.type === "company" ? (
                                                <Building2 className="w-6 h-6" />
                                            ) : (
                                                <User className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                                                {customer.full_name}
                                            </h3>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${
                                                    customer.type === "company"
                                                        ? "bg-purple-50 text-purple-700"
                                                        : "bg-blue-50 text-blue-700"
                                                }`}
                                            >
                                                {customer.type === "company" ? "شركة" : "فرد"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                                        aria-label="خيارات"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10 text-xs">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium ${
                                            open > 0
                                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                                : "bg-slate-50 text-slate-600 border border-slate-100"
                                        }`}
                                    >
                                        <Trophy className="w-3.5 h-3.5 shrink-0" />
                                        {open > 0
                                            ? `${open} نشطة من أصل ${total}`
                                            : total === 0
                                              ? "لا صفقات"
                                              : `${total} صفقة (لا نشطة)`}
                                    </span>
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-900 border border-violet-100 max-w-full"
                                        title={customer.tag_labels || undefined}
                                    >
                                        <Tags className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                            {customer.tag_labels?.trim()
                                                ? customer.tag_labels
                                                : "بدون وسوم"}
                                        </span>
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span dir="ltr">{customer.phone || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{customer.email || "—"}</span>
                                    </div>
                                </div>

                                {customer.notes && (
                                    <p className="mt-4 text-xs text-gray-400 line-clamp-2 border-t pt-2">
                                        {customer.notes}
                                    </p>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed">
                        <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium">لا يوجد عملاء مطابقين</p>
                        <p className="text-sm mb-4">جرّب تغيير الفلاتر أو أضف عميلاً جديداً</p>
                        <Link
                            href="/crm/customers/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة عميل
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

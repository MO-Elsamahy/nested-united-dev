"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, User, Building2, Phone, Mail, MoreVertical, AlertCircle } from "lucide-react";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (typeFilter) params.append("type", typeFilter);

            const res = await fetch(`/api/crm/customers?${params}`);
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(fetchCustomers, 500);
        return () => clearTimeout(timer);
    }, [search, typeFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
                    <p className="text-gray-500">إدارة قاعدة بيانات العملاء</p>
                </div>
                <Link
                    href="/crm/customers/new"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>عميل جديد</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الهاتف، أو البريد..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">كل التصنيفات</option>
                    <option value="individual">أفراد</option>
                    <option value="company">شركات</option>
                </select>
            </div>

            {/* Customers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border shadow-sm animate-pulse h-40"></div>
                    ))
                ) : customers.length > 0 ? (
                    customers.map((customer) => (
                        <div key={customer.id} className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition group relative">
                            <Link href={`/crm/customers/${customer.id}`} className="absolute inset-0 z-0"></Link>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${customer.type === 'company' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {customer.type === 'company' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{customer.full_name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${customer.type === 'company' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                            {customer.type === 'company' ? 'شركة' : 'فرد'}
                                        </span>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
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
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed">
                        <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium">لا يوجد عملاء مطابقين</p>
                        <p className="text-sm mb-4">جرب تغيير الفلتر أو اضف عميل جديد</p>
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

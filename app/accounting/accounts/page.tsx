"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FolderOpen, FileText, Folder, Trash2 } from "lucide-react";
import { AccountForm } from "./form";

interface Account {
    id: string;
    code: string;
    name: string;
    type: string;
    is_reconcilable: boolean;
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    async function fetchAccounts() {
        try {
            setLoading(true);
            const res = await fetch("/api/accounting/accounts");
            if (res.ok) {
                setAccounts(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filtered = accounts.filter(
        (acc) =>
            acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.code.includes(searchTerm)
    );

    // Group by type
    const grouped = filtered.reduce((acc, curr) => {
        const type = curr.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(curr);
        return acc;
    }, {} as Record<string, Account[]>);

    const typeLabels: Record<string, string> = {
        asset_receivable: "الأصول المتداولة (مدينون)",
        asset_bank: "النقدية والبنوك",
        asset_current: "أصول متداولة أخرى",
        asset_fixed: "أصول ثابتة",
        liability_payable: "الخصوم المتداولة (دائنون)",
        liability_current: "خصوم متداولة أخرى",
        liability_long_term: "خصوم طويلة الأجل",
        equity: "حقوق الملكية",
        income: "الإيرادات",
        expense: "المصروفات",
        cost_of_sales: "تكلفة المبيعات",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">دليل الحسابات</h1>
                    <p className="text-gray-600 mt-1">شجرة الحسابات والهيكل المالي</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>حساب جديد</span>
                </button>
            </div>

            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="بحث بالكود أو الاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([type, groupAccounts]) => (
                        <div key={type} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-blue-600" />
                                <h3 className="font-semibold text-gray-800">{typeLabels[type] || type}</h3>
                                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{groupAccounts.length}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {groupAccounts.map((account) => (
                                    <div key={account.id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 flex items-center gap-2">
                                                    <span className="font-mono text-gray-500 text-sm bg-gray-50 px-1 rounded">{account.code}</span>
                                                    {account.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
                                                        fetch(`/api/accounting/accounts?id=${account.id}`, { method: 'DELETE' }).then(() => fetchAccounts());
                                                    }
                                                }}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {accounts.length === 0 && (
                        <div className="text-center py-12">
                            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 mb-2">لا توجد حسابات مسجلة.</p>
                            <button onClick={() => setShowForm(true)} className="text-blue-600 underline">أضف حسابك الأول</button>
                        </div>
                    )}
                </div>
            )}

            {showForm && (
                <AccountForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchAccounts(); }}
                />
            )}
        </div>
    );
}

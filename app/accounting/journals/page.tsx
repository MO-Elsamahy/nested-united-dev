"use client";

import { useState, useEffect } from "react";
import { Plus, Book, ArrowRight, Wallet, Building2, ShoppingCart, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { JournalForm } from "./form";

interface Journal {
    id: string;
    name: string;
    code: string;
    type: string;
}

export default function JournalsPage() {
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchJournals();
    }, []);

    async function fetchJournals() {
        try {
            setLoading(true);
            const res = await fetch("/api/accounting/journals");
            if (res.ok) setJournals(await res.json());
        } catch (error) {
        } finally {
            setLoading(false);
        }
    }

    const getJournalIcon = (type: string) => {
        switch (type) {
            case "sale": return <ShoppingBag className="w-6 h-6 text-green-600" />;
            case "purchase": return <ShoppingCart className="w-6 h-6 text-orange-600" />;
            case "bank": return <Building2 className="w-6 h-6 text-blue-600" />;
            case "cash": return <Wallet className="w-6 h-6 text-emerald-600" />;
            default: return <Book className="w-6 h-6 text-gray-600" />;
        }
    };

    const getJournalColor = (type: string) => {
        switch (type) {
            case "sale": return "border-green-500 bg-green-50";
            case "purchase": return "border-orange-500 bg-orange-50";
            case "bank": return "border-blue-500 bg-blue-50";
            case "cash": return "border-emerald-500 bg-emerald-50";
            default: return "border-gray-500 bg-gray-50";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">دفاتر اليومية</h1>
                    <p className="text-gray-600">إدارة الدفاتر المحاسبية</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" /> <span>يومية جديدة</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />)
                ) : (
                    <>
                        {journals.map((journal) => (
                            <div key={journal.id} className="group bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition">
                                <div className={`h-2 w-full ${getJournalColor(journal.type).split(" ")[0].replace("border-", "bg-")}`} />
                                <div className="p-6">
                                    <div className="flex justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${getJournalColor(journal.type).split(" ")[1]}`}>
                                            {getJournalIcon(journal.type)}
                                        </div>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs h-fit">{journal.code}</span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{journal.name}</h3>

                                    <div className="border-t pt-4 mt-4 flex justify-between items-center">
                                        <span className="text-sm text-gray-500">-- قيد</span>
                                        <Link href={`/accounting/journals/${journal.id}`} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                            عرض القيود <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {journals.length === 0 && (
                            <div className="col-span-full py-12 text-center border-dashed border-2 rounded-lg">
                                <p className="text-gray-500 mb-2">لا توجد دفاتر يومية.</p>
                                <button onClick={() => setShowForm(true)} className="text-blue-600 underline">أضف دفترك الأول</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showForm && (
                <JournalForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchJournals(); }}
                />
            )}
        </div>
    );
}

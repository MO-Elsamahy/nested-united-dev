"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

export default function PaymentsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المدفوعات</h1>
                    <p className="text-gray-600 mt-1">إدارة المدفوعات والتحصيلات</p>
                </div>
                <Link
                    href="/accounting/payments/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل دفعة</span>
                </Link>
            </div>

            {/* Placeholder */}
            <div className="bg-white border rounded-xl shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">صفحة المدفوعات قيد التطوير</h2>
                    <p className="text-gray-600 mb-6">
                        سيتم إضافة واجهة تسجيل المدفوعات وعرض سجل الدفعات قريباً.
                        يمكنك حالياً تسجيل الدفعات من خلال API.
                    </p>
                    <p className="text-sm text-gray-500">
                        API متاح في: <code className="bg-gray-100 px-2 py-1 rounded">/api/accounting/payments</code>
                    </p>
                </div>
            </div>
        </div>
    );
}

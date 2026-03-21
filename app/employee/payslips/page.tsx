"use client";

import { useState, useEffect } from "react";
import { Receipt, Download } from "lucide-react";

export default function EmployeePayslipsPage() {
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We'll need a new API endpoint for employee specific payrolls (me)
        // For now, we simulate empty or fetch if we had that endpoint
        // Let's assume user just wants to see the placeholder or basic list
        setLoading(false);
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">كشوف الراتب</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد كشوف راتب</h3>
                <p>ستظهر كشوف الراتب هنا بعد اعتمادها من الموارد البشرية</p>
            </div>
        </div>
    );
}

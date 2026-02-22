"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InvoiceForm } from "@/components/accounting/InvoiceForm";

export default function EditInvoicePage() {
    const params = useParams();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchInvoice();
        }
    }, [params.id]);

    async function fetchInvoice() {
        try {
            const res = await fetch(`/api/accounting/invoices/${params.id}`);
            if (res.ok) {
                setInvoice(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    if (!invoice) {
        return <div className="p-8 text-center text-red-600">الفاتورة غير موجودة</div>;
    }

    if (invoice.state !== "draft") {
        return (
            <div className="p-8 text-center text-red-600">
                لا يمكن تعديل الفاتورة. يمكن تعديل المسودات فقط.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">تعديل الفاتورة {invoice.invoice_number}</h1>
                <p className="text-gray-600 mt-1">تعديل بيانات الفاتورة</p>
            </div>

            <InvoiceForm initialData={invoice} invoiceId={invoice.id} />
        </div>
    );
}

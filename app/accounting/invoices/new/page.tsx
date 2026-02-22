import { InvoiceForm } from "@/components/accounting/InvoiceForm";

export default function NewInvoicePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">فاتورة جديدة</h1>
                <p className="text-gray-600 mt-1">إنشاء فاتورة مبيعات جديدة</p>
            </div>

            <InvoiceForm />
        </div>
    );
}

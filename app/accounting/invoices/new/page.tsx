import { InvoiceForm } from "@/components/accounting/InvoiceForm";

// /accounting/invoices/new?type=vendor_bill  → فاتورة مورد
// /accounting/invoices/new                   → فاتورة عميل (default)
export default async function NewInvoicePage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    const params = await searchParams;
    const isVendorBill = params.type === "vendor_bill";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isVendorBill ? "فاتورة مورد جديدة" : "فاتورة مبيعات جديدة"}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isVendorBill
                        ? "تسجيل فاتورة شراء من مورد"
                        : "إنشاء فاتورة مبيعات للعميل"}
                </p>
            </div>

            <InvoiceForm invoiceType={isVendorBill ? "vendor_bill" : "customer_invoice"} />
        </div>
    );
}

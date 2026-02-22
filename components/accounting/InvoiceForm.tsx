"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";

interface InvoiceLine {
    description: string;
    quantity: number;
    unit_price: number;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    tax_rate: number;
    account_id?: string;
}

interface Partner {
    id: string;
    name: string;
}

interface InvoiceFormProps {
    initialData?: any;
    invoiceId?: string;
}

export function InvoiceForm({ initialData, invoiceId }: InvoiceFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);

    const [formData, setFormData] = useState({
        partner_id: initialData?.partner_id || "",
        invoice_date: initialData?.invoice_date || new Date().toISOString().split("T")[0],
        due_date: initialData?.due_date || "",
        reference: initialData?.reference || "",
        notes: initialData?.notes || "",
        payment_terms: initialData?.payment_terms || "Net 30",
    });

    const [lines, setLines] = useState<InvoiceLine[]>(
        initialData?.lines || [
            {
                description: "",
                quantity: 1,
                unit_price: 0,
                discount_type: "percentage",
                discount_value: 0,
                tax_rate: 15, // Default 15% VAT
            },
        ]
    );

    useEffect(() => {
        fetchPartners();
    }, []);

    async function fetchPartners() {
        const res = await fetch("/api/accounting/partners");
        if (res.ok) {
            const data = await res.json();
            setPartners(data.filter((p: any) => p.type === "customer"));
        }
    }

    const addLine = () => {
        setLines([
            ...lines,
            {
                description: "",
                quantity: 1,
                unit_price: 0,
                discount_type: "percentage",
                discount_value: 0,
                tax_rate: 15,
            },
        ]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: string, value: any) => {
        const updated = [...lines];
        updated[index] = { ...updated[index], [field]: value };
        setLines(updated);
    };

    const calculateLineTotal = (line: InvoiceLine) => {
        const subtotal = line.quantity * line.unit_price;
        let discount = 0;
        if (line.discount_type === "percentage") {
            discount = (subtotal * line.discount_value) / 100;
        } else {
            discount = line.discount_value;
        }
        const afterDiscount = subtotal - discount;
        const tax = (afterDiscount * line.tax_rate) / 100;
        return afterDiscount + tax;
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        lines.forEach((line) => {
            const lineSubtotal = line.quantity * line.unit_price;
            subtotal += lineSubtotal;

            let discount = 0;
            if (line.discount_type === "percentage") {
                discount = (lineSubtotal * line.discount_value) / 100;
            } else {
                discount = line.discount_value;
            }
            totalDiscount += discount;

            const afterDiscount = lineSubtotal - discount;
            const tax = (afterDiscount * line.tax_rate) / 100;
            totalTax += tax;
        });

        return {
            subtotal,
            totalDiscount,
            totalTax,
            total: subtotal - totalDiscount + totalTax,
        };
    };

    const handleSubmit = async (e: React.FormEvent, confirm = false) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = {
                ...formData,
                lines,
            };

            let res;
            if (invoiceId) {
                // Update
                res = await fetch(`/api/accounting/invoices/${invoiceId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                // Create
                res = await fetch("/api/accounting/invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }

            if (res.ok) {
                const invoice = await res.json();

                // If confirm flag is set, confirm the invoice
                if (confirm && invoice.id) {
                    const confirmRes = await fetch(`/api/accounting/invoices/${invoice.id}/confirm`, {
                        method: "POST",
                    });

                    if (!confirmRes.ok) {
                        const error = await confirmRes.json();
                        alert(`فشل التأكيد: ${error.error}`);
                        router.push(`/accounting/invoices/${invoice.id}`);
                        return;
                    }
                }

                router.push(`/accounting/invoices/${invoice.id || invoiceId}`);
            } else {
                const error = await res.json();
                alert(`خطأ: ${error.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Invoice Header */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">معلومات الفاتورة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">العميل *</label>
                        <select
                            required
                            value={formData.partner_id}
                            onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">اختر العميل</option>
                            {partners.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">تاريخ الفاتورة *</label>
                        <input
                            type="date"
                            required
                            value={formData.invoice_date}
                            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق *</label>
                        <input
                            type="date"
                            required
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">المرجع</label>
                        <input
                            type="text"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="رقم أمر الشراء..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">شروط الدفع</label>
                        <input
                            type="text"
                            value={formData.payment_terms}
                            onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Net 30"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="ملاحظات إضافية..."
                        />
                    </div>
                </div>
            </div>

            {/* Invoice Lines */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">بنود الفاتورة</h2>
                    <button
                        type="button"
                        onClick={addLine}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded"
                    >
                        <Plus className="w-4 h-4" />
                        <span>إضافة بند</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-3 py-2 text-right">الوصف *</th>
                                <th className="px-3 py-2 text-right w-24">الكمية</th>
                                <th className="px-3 py-2 text-right w-32">السعر</th>
                                <th className="px-3 py-2 text-right w-32">الخصم</th>
                                <th className="px-3 py-2 text-right w-24">الضريبة %</th>
                                <th className="px-3 py-2 text-right w-32">المجموع</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {lines.map((line, index) => (
                                <tr key={index}>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            required
                                            value={line.description}
                                            onChange={(e) => updateLine(index, "description", e.target.value)}
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="وصف المنتج/الخدمة"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            step="0.01"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                                            className="w-full px-2 py-1 border rounded text-center"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={line.unit_price}
                                            onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.discount_value}
                                                onChange={(e) => updateLine(index, "discount_value", parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                            <select
                                                value={line.discount_type}
                                                onChange={(e) => updateLine(index, "discount_type", e.target.value)}
                                                className="px-1 py-1 border rounded text-xs"
                                            >
                                                <option value="percentage">%</option>
                                                <option value="fixed">ر.س</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={line.tax_rate}
                                            onChange={(e) => updateLine(index, "tax_rate", parseFloat(e.target.value) || 0)}
                                            className="w-full px-2 py-1 border rounded text-center"
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        {calculateLineTotal(line).toFixed(2)} ر.س
                                    </td>
                                    <td className="px-3 py-2">
                                        {lines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLine(index)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                    <div className="w-80 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>المجموع الفرعي:</span>
                            <span className="font-medium">{totals.subtotal.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                            <span>الخصم:</span>
                            <span>-{totals.totalDiscount.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                            <span>الضريبة:</span>
                            <span>+{totals.totalTax.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>الإجمالي:</span>
                            <span>{totals.total.toFixed(2)} ر.س</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={loading}
                >
                    إلغاء
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {loading ? "جاري الحفظ..." : "حفظ كمسودة"}
                </button>
                {!invoiceId && (
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "جاري الحفظ..." : "حفظ وتأكيد"}
                    </button>
                )}
            </div>
        </form>
    );
}

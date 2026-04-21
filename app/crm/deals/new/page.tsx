"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2, DollarSign, UserPlus, Search, Check, X, User } from "lucide-react";
import type { CRMCustomer } from "@/lib/types/crm";

/* ─────────────── Customer Autocomplete Combobox ─────────────── */
function CustomerCombobox({
    customers,
    selectedId,
    onSelect,
    disabled,
    onCustomerCreated,
}: {
    customers: CRMCustomer[];
    selectedId: string;
    onSelect: (id: string) => void;
    disabled?: boolean;
    onCustomerCreated: (c: CRMCustomer) => void;
}) {
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "" });
    const [createError, setCreateError] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Resolve selected customer name
    const selectedCustomer = customers.find((c) => c.id === selectedId);

    // Sync input display when selection changes externally
    useEffect(() => {
        if (selectedCustomer) setInputValue(selectedCustomer.full_name);
    }, [selectedCustomer]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // Restore selected name if user didn't pick anything
                if (selectedCustomer) setInputValue(selectedCustomer.full_name);
                else setInputValue("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedCustomer]);

    // Filter customers based on input
    const filtered = inputValue.trim()
        ? customers.filter((c) =>
              c.full_name.toLowerCase().includes(inputValue.trim().toLowerCase()) ||
              (c.phone && c.phone.includes(inputValue.trim()))
          )
        : customers;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true);
        // Clear selection when user types
        if (selectedId) onSelect("");
    };

    const handleSelectCustomer = (c: CRMCustomer) => {
        onSelect(c.id);
        setInputValue(c.full_name);
        setIsOpen(false);
        setShowNewForm(false);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.full_name.trim()) {
            setCreateError("اسم العميل مطلوب");
            return;
        }
        setCreatingCustomer(true);
        setCreateError("");
        try {
            const res = await fetch("/api/crm/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCustomer),
            });
            const data = await res.json();
            if (res.ok && data.id) {
                const created: CRMCustomer = {
                    id: data.id,
                    full_name: newCustomer.full_name.trim(),
                    phone: newCustomer.phone || null,
                    email: newCustomer.email || null,
                    national_id: null,
                    address: null,
                    type: "individual",
                    notes: null,
                    status: "active",
                };
                onCustomerCreated(created);
                onSelect(created.id);
                setInputValue(created.full_name);
                setShowNewForm(false);
                setIsOpen(false);
                setNewCustomer({ full_name: "", phone: "", email: "" });
            } else if (res.status === 409) {
                setCreateError("يوجد عميل بنفس رقم الجوال");
            } else {
                setCreateError(data.error || "تعذّر إنشاء العميل");
            }
        } catch {
            setCreateError("خطأ في الاتصال");
        } finally {
            setCreatingCustomer(false);
        }
    };

    const openNewForm = () => {
        setShowNewForm(true);
        setNewCustomer({ full_name: inputValue.trim(), phone: "", email: "" });
        setCreateError("");
    };

    if (disabled && selectedCustomer) {
        return (
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {selectedCustomer.full_name}
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            {/* Hidden input to enforce required validation */}
            <input type="hidden" name="customer_id" value={selectedId} required />

            {/* Search input */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="ابحث باسم العميل أو رقم الجوال..."
                    className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                        selectedId ? "border-green-400 bg-green-50/30" : ""
                    }`}
                    autoComplete="off"
                />
                {selectedId && (
                    <button
                        type="button"
                        onClick={() => {
                            onSelect("");
                            setInputValue("");
                            inputRef.current?.focus();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition"
                        title="إلغاء الاختيار"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && !showNewForm && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                    {filtered.length > 0 ? (
                        filtered.slice(0, 20).map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectCustomer(c)}
                                className={`w-full text-right px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors ${
                                    selectedId === c.id ? "bg-blue-50 text-blue-700" : "text-gray-800"
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{c.full_name}</div>
                                        {c.phone && (
                                            <div className="text-xs text-gray-400 ltr" dir="ltr">{c.phone}</div>
                                        )}
                                    </div>
                                </div>
                                {selectedId === c.id && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                            لا يوجد عميل بهذا الاسم
                        </div>
                    )}

                    {/* Add new customer button */}
                    <div className="border-t">
                        <button
                            type="button"
                            onClick={openNewForm}
                            className="w-full text-right px-4 py-2.5 text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            إضافة عميل جديد{inputValue.trim() ? ` "${inputValue.trim()}"` : ""}
                        </button>
                    </div>
                </div>
            )}

            {/* Inline new customer form */}
            {showNewForm && (
                <div className="absolute z-50 mt-1 w-full bg-white border-2 border-blue-200 rounded-lg shadow-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            عميل جديد
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShowNewForm(false)}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                        <input
                            value={newCustomer.full_name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="اسم العميل"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">رقم الجوال</label>
                            <input
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="05xxxxxxxx"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
                            <input
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="email@example.com"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {createError && (
                        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{createError}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowNewForm(false)}
                            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateCustomer}
                            disabled={creatingCustomer}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                        >
                            {creatingCustomer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                            إنشاء وتحديد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── Main Deal Form ─────────────────── */
function NewDealForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedCustomerId = searchParams.get("customer_id");

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<CRMCustomer[]>([]);

    const [formData, setFormData] = useState({
        customer_id: preSelectedCustomerId || "",
        title: "",
        value: "",
        stage: "new",
        priority: "medium",
        expected_close_date: "",
        notes: ""
    });

    useEffect(() => {
        fetch("/api/crm/customers")
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
                if (res.ok && Array.isArray(data)) setCustomers(data);
            })
            .catch(() => setCustomers([]));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCustomerSelect = useCallback((id: string) => {
        setFormData((prev) => ({ ...prev, customer_id: id }));
    }, []);

    const handleCustomerCreated = useCallback((c: CRMCustomer) => {
        setCustomers((prev) => [c, ...prev]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.customer_id) {
            alert("يرجى اختيار عميل أو إنشاء عميل جديد");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/crm/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/crm/deals");
                router.refresh();
            } else {
                const err = await res.json().catch(() => ({}));
                alert((err as { error?: string }).error || "تعذّر حفظ الصفقة");
                setLoading(false);
            }
        } catch {
            alert("خطأ في الاتصال");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العميل <span className="text-red-500">*</span></label>
                    <CustomerCombobox
                        customers={customers}
                        selectedId={formData.customer_id}
                        onSelect={handleCustomerSelect}
                        disabled={!!preSelectedCustomerId}
                        onCustomerCreated={handleCustomerCreated}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الصفقة <span className="text-red-500">*</span></label>
                    <input
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="مثال: إيجار فيلا لمدة شهر"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        قيمة الصفقة (ر.س)
                    </label>
                    <input
                        name="value"
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.value}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإغلاق المتوقع</label>
                    <input
                        type="date"
                        name="expected_close_date"
                        value={formData.expected_close_date}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                    >
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المرحلة</label>
                    <select
                        name="stage"
                        value={formData.stage}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                    >
                        <option value="new">جديد</option>
                        <option value="contacting">جاري التواصل</option>
                        <option value="qualified">مؤهل</option>
                        <option value="proposal">إرسال عرض</option>
                        <option value="negotiation">تفاوض</option>
                        <option value="won">تم الاتفاق</option>
                        <option value="paid">تم الدفع</option>
                        <option value="completed">مكتمل</option>
                        <option value="lost">خسارة</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                    name="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                    إلغاء
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ الصفقة
                </button>
            </div>
        </form>
    );
}

export default function NewDealPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/crm/deals" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إضافة صفقة جديدة</h1>
                    <p className="text-gray-500">إنشاء فرصة بيعية جديدة في الـ Pipeline</p>
                </div>
            </div>

            <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
                <NewDealForm />
            </Suspense>
        </div>
    );
}

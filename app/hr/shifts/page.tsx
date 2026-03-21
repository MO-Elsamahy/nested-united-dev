"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Clock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    late_grace_minutes: number;
}

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        start_time: "09:00",
        end_time: "17:00",
        late_grace_minutes: 15,
    });

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            const res = await fetch("/api/hr/shifts");
            const data = await res.json();
            if (Array.isArray(data)) setShifts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/hr/shifts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowModal(false);
                fetchShifts();
                setFormData({ name: "", start_time: "09:00", end_time: "17:00", late_grace_minutes: 15 });
            }
        } catch (e) {
            alert("Error saving shift");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/hr/employees" className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">إدارة الورديات</h1>
                        <p className="text-gray-500">تحديد أوقات الدوام المختلفة</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl transition"
                >
                    <Plus className="w-5 h-5" />
                    وردية جديدة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shifts.map((shift) => (
                    <div key={shift.id} className="bg-white rounded-xl shadow-sm border p-6 group hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{shift.name}</h3>
                                    <p className="text-sm text-gray-500">سماح {shift.late_grace_minutes} دقيقة</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-4 border-t">
                            <div className="text-center flex-1 border-r">
                                <p className="text-gray-500 mb-1">الحضور</p>
                                <p className="font-bold text-green-600 text-lg" dir="ltr">{shift.start_time.slice(0, 5)}</p>
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-gray-500 mb-1">الانصراف</p>
                                <p className="font-bold text-red-600 text-lg" dir="ltr">{shift.end_time.slice(0, 5)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">إضافة وردية جديدة</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم الوردية</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="مثال: وردية صباحية"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">وقت الحضور</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">وقت الانصراف</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">فترة السماح (دقيقة)</label>
                                <input
                                    type="number"
                                    value={formData.late_grace_minutes}
                                    onChange={e => setFormData({ ...formData, late_grace_minutes: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border rounded-xl"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-xl"
                                >
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface RequestActionButtonsProps {
    requestId: string;
}

export function RequestActionButtons({ requestId }: RequestActionButtonsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState("");

    const handleAction = async (status: "approved" | "rejected") => {
        setLoading(status === "approved" ? "approve" : "reject");

        try {
            const response = await fetch(`/api/hr/requests/${requestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, reviewer_notes: notes }),
            });

            const data = await response.json();

            if (response.ok) {
                router.refresh();
            } else {
                alert(data.error || "حدث خطأ");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "حدث خطأ في الاتصال");
        } finally {
            setLoading(null);
            setShowNotes(false);
            setNotes("");
        }
    };

    if (showNotes) {
        return (
            <div className="space-y-2 w-full">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)..."
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    rows={2}
                />
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction("approved")}
                        disabled={loading !== null}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {loading === "approve" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                قبول
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => handleAction("rejected")}
                        disabled={loading !== null}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {loading === "reject" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                رفض
                            </>
                        )}
                    </button>
                </div>
                <button
                    onClick={() => {
                        setShowNotes(false);
                        setNotes("");
                    }}
                    className="w-full text-gray-500 text-sm hover:text-gray-700"
                >
                    إلغاء
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setShowNotes(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
        >
            مراجعة الطلب
        </button>
    );
}

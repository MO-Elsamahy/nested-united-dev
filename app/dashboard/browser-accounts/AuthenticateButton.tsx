"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

interface AuthenticateButtonProps {
    accountId: string;
    accountName: string;
    platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
    partition: string;
}

export function AuthenticateButton({
    accountId,
    accountName: _accountName,
    platform,
    partition,
}: AuthenticateButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthenticate = async () => {
        if (!window.electronAPI) {
            setError("هذا الخيار متاح فقط في نسخة سطح المكتب");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await window.electronAPI.openAuthWindow({
                platform,
                accountId,
                partition,
            });

            if (!result.success) {
                throw new Error(result.error || "فشل في فتح نافذة التوثيق");
            }
        } catch (err: unknown) {
            console.error("Auth error:", err);
            setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleAuthenticate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                title="تسجيل الدخول لتجديد الجلسة"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <ShieldCheck className="w-4 h-4" />
                )}
                <span>توثيق</span>
            </button>

            {error && (
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}
        </div>
    );
}

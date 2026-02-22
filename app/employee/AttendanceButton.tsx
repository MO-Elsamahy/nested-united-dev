"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut, CheckCircle } from "lucide-react";

interface AttendanceButtonProps {
    employeeId: string;
    todayAttendance: {
        id: string;
        check_in: string | null;
        check_out: string | null;
    } | null;
}

export function AttendanceButton({ employeeId, todayAttendance }: AttendanceButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [punchMsg, setPunchMsg] = useState<string | null>(null);

    // Update time every second
    useState(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    });

    const hasCheckedIn = !!todayAttendance?.check_in;
    const hasCheckedOut = !!todayAttendance?.check_out;

    const handleAttendance = async (type: "check_in" | "check_out") => {
        setLoading(true);
        try {
            const response = await fetch("/api/hr/attendance/punch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: employeeId, type }),
            });

            const data = await response.json();

            if (data.success) {
                const timeLabel = new Date().toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                setPunchMsg(
                    type === "check_in"
                        ? `✅ تم تسجيل حضورك في ${timeLabel}`
                        : `✅ تم تسجيل انصرافك في ${timeLabel}`
                );
                setTimeout(() => router.refresh(), 1500);
            } else {
                alert(data.error || "حدث خطأ");
            }
        } catch (error) {
            alert("حدث خطأ في الاتصال");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "--:--";
        return new Date(dateStr).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">تسجيل الحضور</h2>
                    <p className="text-gray-500 text-sm">
                        {currentTime.toLocaleDateString("ar-EG", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        })}
                    </p>
                </div>
                <div className="text-left">
                    <p className="text-3xl font-bold text-violet-600 font-mono">
                        {currentTime.toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })}
                    </p>
                    <p className="text-gray-400 text-xs">توقيت السيرفر</p>
                </div>
            </div>

            {/* Status Display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-xl ${hasCheckedIn ? "bg-green-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <LogIn className={`w-5 h-5 ${hasCheckedIn ? "text-green-600" : "text-gray-400"}`} />
                        <span className="text-sm text-gray-600">وقت الحضور</span>
                    </div>
                    <p className={`text-2xl font-bold ${hasCheckedIn ? "text-green-700" : "text-gray-300"}`}>
                        {formatTime(todayAttendance?.check_in || null)}
                    </p>
                </div>
                <div className={`p-4 rounded-xl ${hasCheckedOut ? "bg-blue-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <LogOut className={`w-5 h-5 ${hasCheckedOut ? "text-blue-600" : "text-gray-400"}`} />
                        <span className="text-sm text-gray-600">وقت الانصراف</span>
                    </div>
                    <p className={`text-2xl font-bold ${hasCheckedOut ? "text-blue-700" : "text-gray-300"}`}>
                        {formatTime(todayAttendance?.check_out || null)}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            {hasCheckedOut ? (
                <div className="flex items-center justify-center gap-3 p-4 bg-green-50 rounded-xl text-green-700">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">تم تسجيل الحضور والانصراف لهذا اليوم</span>
                </div>
            ) : punchMsg ? (
                <div className="flex items-center justify-center gap-3 p-4 bg-teal-50 rounded-xl text-teal-700 animate-pulse">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold text-lg">{punchMsg}</span>
                </div>
            ) : !hasCheckedIn ? (
                <button
                    onClick={() => handleAttendance("check_in")}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                    {loading ? (
                        <Clock className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <LogIn className="w-6 h-6" />
                            <span>تسجيل الحضور</span>
                        </>
                    )}
                </button>
            ) : (
                <button
                    onClick={() => handleAttendance("check_out")}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                    {loading ? (
                        <Clock className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <LogOut className="w-6 h-6" />
                            <span>تسجيل الانصراف</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

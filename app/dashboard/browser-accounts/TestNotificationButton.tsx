"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

export function TestNotificationButton() {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setTesting(true);
      
      // Simulate a notification
      const testData = {
        accountId: "test-123",
        accountName: "حساب اختبار Airbnb",
        platform: "airbnb" as const,
        count: 3,
      };

      console.log("[Test] Sending test notification:", testData);
      
      try {
        await window.electronAPI.testNotification(testData);
        console.log("[Test] Test notification sent successfully");
      } catch (error) {
        console.error("[Test] Failed to send test notification:", error);
      }
      
      setTimeout(() => setTesting(false), 2000);
    } else {
      alert("هذا الزر يعمل فقط في تطبيق Electron");
    }
  };

  return (
    <button
      onClick={handleTest}
      disabled={testing}
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-xl transition-colors text-sm"
    >
      <Bell className={`w-4 h-4 ${testing ? "animate-pulse" : ""}`} />
      <span>{testing ? "جاري الإرسال..." : "اختبار الإشعار"}</span>
    </button>
  );
}


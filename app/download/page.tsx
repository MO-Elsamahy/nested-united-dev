"use client";

import { useState } from "react";
import { Download, Monitor } from "lucide-react";

export default function DownloadPage() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          
          {/* Header & Logo (Matches Login Page) */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border-2 border-gray-200 shadow-md flex items-center justify-center">
                {logoError ? (
                  <div className="bg-blue-600 text-white w-full h-full flex items-center justify-center font-bold text-lg">
                    شعار
                  </div>
                ) : (
                  <img
                    src="/api/company/logo"
                    alt="شعار المنصة"
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                تطبيق إدارة العمليات
              </h1>
              <p className="text-gray-600 mt-1">
                النسخة المخصصة لأجهزة سطح المكتب
              </p>
            </div>
          </div>

          <div className="py-4 text-center">
            <div className="bg-blue-50 text-blue-700 text-sm py-3 px-4 rounded-lg mb-6 flex items-start gap-3 text-right" dir="rtl">
              <Monitor className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p>
                هذا برنامج سطح المكتب الرسمي لموظفي المنصة. يوفر بيئة عمل سريعة ومنفصلة مع إشعارات فورية لطلبات و حجوزات العملاء.
              </p>
            </div>

            <a
              href="/downloads/NestedUnited-Setup-v1.0.1.exe"
              download
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
            >
              <Download className="w-5 h-5" />
              تحميل البرنامج (Windows)
            </a>
          </div>

        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          خاص بموظفي NestedUnited - متوافق مع Windows 10/11
        </p>
      </div>
    </div>
  );
}

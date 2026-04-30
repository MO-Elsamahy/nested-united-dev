"use client";

import { useState } from "react";
import { Globe, Code, Heart, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  const [logoError, setLogoError] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 relative rounded-2xl overflow-hidden bg-white border-2 border-gray-200 shadow-lg flex items-center justify-center">
              {logoError ? (
                <div className="bg-blue-600 text-white w-full h-full flex items-center justify-center font-bold text-2xl">
                  شعار
                </div>
              ) : (
                <Image
                  src="/api/company/logo"
                  alt="شعار المنصة"
                  fill
                  className="object-contain"
                  onError={() => setLogoError(true)}
                  unoptimized
                />
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            حول التطبيق
          </h1>
          <p className="text-xl text-gray-600">
            نظام إدارة الوحدات السكنية والحجوزات
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
            {/* Company Info */}
            <div className="flex-1 text-center md:text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-4">
                تطوير وإنشاء
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                شركة MZ للبرمجيات والحلول التقنية
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                نحن في <span className="font-bold text-blue-600">MZ</span> نؤمن بتصميم وتطوير أنظمة سحابية متكاملة تساعد الشركات
                والمؤسسات على تحسين أعمالها وزيادة كفاءتها بأحدث التقنيات البرمجية.
                نقوم بتحويل الأفكار المعقدة إلى منصات رقمية سلسة وموثوقة.
              </p>
            </div>

            {/* MZ Logo */}
            <div className="w-40 h-40 md:w-56 md:h-56 relative bg-gray-50 rounded-2xl flex items-center justify-center p-6 shadow-sm border border-gray-200 shrink-0 transform hover:scale-105 transition-transform duration-300">
              <Image 
                src="/mz-logo.png" 
                alt="MZ Logo" 
                fill
                className="object-contain mix-blend-multiply" 
              />
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
                <Code className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">التقنيات المستخدمة</h3>
            </div>
            <ul className="space-y-4 text-gray-700">
              {['Next.js 16 (App Router)', 'TypeScript & React', 'Tailwind CSS v4', 'PostgreSQL', 'Electron (المكتب التطبيقي)', 'WebSockets (إشعارات فورية)'].map((tech, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium text-gray-800" dir="ltr">{tech}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center border border-green-200">
                <Heart className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">المميزات الرئيسية</h3>
            </div>
            <ul className="space-y-4 text-gray-700">
              {['إدارة لوحات المبيعات (CRM) والصفقات', 'المزامنة التلقائية (iCal) مع Airbnb', 'إدارة متكاملة للموارد البشرية (HR)', 'نظام محاسبي مزدوج القيد و PDF', 'سجل تفصيلي للصيانة والمهام', 'لوحات بيانات وإحصائيات لحظية'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium text-gray-800">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Founders */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl p-8 md:p-12 text-white">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <span className="inline-block px-3 py-1 bg-white/10 text-blue-200 rounded-full text-sm font-medium mb-3 backdrop-blur-sm border border-white/20">
                الفريق القيادي
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-white">المؤسسين والمهندسين</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Founder 1 */}
              <div className="bg-white/5 hover:bg-white/10 p-8 rounded-2xl backdrop-blur-md border border-white/10 transition-colors group">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h4 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-200 transition-colors">محمد أمير السماحي</h4>
                    <p className="text-blue-100/80 text-sm mb-6 leading-relaxed font-medium">
                      AI Expert in Climate Change | Executive Director | Data Scientist
                    </p>
                  </div>
                  <a
                    href="https://samahy.tech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 px-5 py-2.5 bg-blue-600/80 hover:bg-blue-500 rounded-lg transition-all text-sm font-bold shadow-lg shadow-blue-900/50"
                  >
                    <Globe className="w-4 h-4" />
                    <span dir="ltr">samahy.tech</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Founder 2 */}
              <div className="bg-white/5 hover:bg-white/10 p-8 rounded-2xl backdrop-blur-md border border-white/10 transition-colors group">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h4 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-200 transition-colors">عز الدين أحمد</h4>
                    <p className="text-blue-100/80 text-sm mb-6 leading-relaxed font-medium">
                      Full Stack Software Engineer | UI/UX Enthusiast
                    </p>
                  </div>
                  <a
                    href="https://ezzio.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 px-5 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 rounded-lg transition-all text-sm font-bold shadow-lg shadow-indigo-900/50"
                  >
                    <Globe className="w-4 h-4" />
                    <span dir="ltr">ezzio.me</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <span>العودة للوحة التحكم</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-100/60 rounded-full blur-[120px] opacity-70" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/60 rounded-full blur-[120px] opacity-70" />
            </div>

            <div className="relative z-10 max-w-xl w-full text-center space-y-8">
                {/* Animated Icon Container */}
                <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
                    <div className="absolute inset-0 bg-red-50 rounded-full flex items-center justify-center border border-red-100 shadow-sm">
                        <Compass className="w-16 h-16 text-red-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-6xl md:text-8xl font-bold text-slate-900 tracking-tight">
                        404
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-800">
                        الصفحة غير موجودة أو غير متاحة
                    </h2>
                    <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                        عذراً، الصفحة التي تحاول الوصول إليها قد تكون محذوفة، أو ليس لديك الصلاحية لاستعراض هذا النظام حالياً.
                    </p>
                </div>

                <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/portal"
                        className="group relative inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span>العودة للبوابة الرئيسية</span>
                        <ArrowRight className="w-5 h-5 -scale-x-100 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Support note */}
                <p className="text-xs text-slate-400 pt-8">
                    إذا كنت تعتقد أن هذا خطأ في النظام، يرجى التواصل مع الدعم الفني أو مشرف النظام.
                </p>
            </div>
        </div>
    );
}

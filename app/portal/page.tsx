import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getAppFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";
import Link from "next/link";
import {
    Building2,
    Calculator,
    Users,
    Settings,
    LogOut,
    LayoutDashboard,
    UserCog,
    Users2
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";

// Helper to check if user has access to a system
async function canAccessSystem(role: string, systemId: string): Promise<boolean> {
    // Super admin always has access
    if (role === 'super_admin') return true;

    // Settings is always super_admin only (hardcoded for security)
    if (systemId === 'settings') return false;

    // Employee portal is accessible to everyone (self-service)
    if (systemId === 'employee') return true;

    // Check database for permission
    const perm = await queryOne<{ can_access: number }>(
        "SELECT can_access FROM role_system_permissions WHERE role = ? AND system_id = ?",
        [role, systemId]
    );

    return perm ? Boolean(perm.can_access) : false;
}

export default async function PortalPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const user = await queryOne<{ role: string; name: string }>("SELECT role, name FROM users WHERE id = ?", [session.user.id]);

    if (!user) redirect("/login");

    // Define Systems
    const allSystems = [
        {
            id: "rentals",
            name: "إدارة التأجير",
            description: "حجوزات، وحدات، وعقود",
            icon: Building2,
            href: "/dashboard",
            color: "bg-blue-600",
        },
        {
            id: "accounting",
            name: "النظام المالي",
            description: "قيود، فواتير، وتقارير مالية",
            icon: Calculator,
            href: "/accounting",
            color: "bg-emerald-600",
        },
        {
            id: "hr",
            name: "إدارة الموارد البشرية",
            description: "حضور، انصراف، وطلبات",
            icon: UserCog,
            href: "/hr",
            color: "bg-violet-600",
        },
        {
            id: "employee",
            name: "بوابة الموظف",
            description: "بياناتك، حضورك، وطلباتك الشخصية",
            icon: Users,
            href: "/employee",
            color: "bg-orange-600",
        },
        {
            id: "crm",
            name: "إدارة العملاء",
            description: "متابعة العملاء والصفقات (CRM)",
            icon: Users2, // Using Users icon as generic, or could import TrendingUp/Briefcase if available
            href: "/crm",
            color: "bg-indigo-600",
        },
        {
            id: "settings",
            name: "الإعدادات",
            description: "إدارة المستخدمين والصلاحيات",
            icon: Settings,
            href: "/settings",
            color: "bg-gray-600",
        }
    ];

    // Filter accessible systems based on DB permissions
    // Fetch Remote Feature Flags (Github Gist)
    const features = await getAppFeatures();

    // Filter accessible systems based on DB permissions AND Feature Flags
    const accessibleSystems = [];
    for (const sys of allSystems) {
        // 1. Check Feature Flags (Manifest)
        if (sys.id === "rentals" && !features.rentals) continue;
        if (sys.id === "accounting" && !features.accounting) continue;
        if (sys.id === "hr" && !features.hr) continue;
        if (sys.id === "crm" && !features.crm) continue;

        // 2. Check Database Permissions
        if (await canAccessSystem(user.role, sys.id)) {
            accessibleSystems.push(sys);
        }
    }

    const quotes = [
        "صباح الإنجاز والعمل الجاد",
        "خطوة واحدة كل يوم تقربك من القمة",
        "التميز ليس فعلاً، بل عادة",
        "اجعل يومك مليئاً بالإنتاجية والإبداع",
        "النجاح هو مجموع قراراتك الصغيرة اليوم",
        "كن شغوفاً بما تفعل، وستبدع",
        "يوم جديد، فرص جديدة، طاقة متجددة",
        "أهلاً بك، لنصنع النجاح معاً اليوم",
        "لا تنتظر الفرصة، بل اصنعها بنفسك",
        "الطريق إلى القمة دائماً متاح لمن يصر",
        "الانضباط هو الجسر بين الأهداف والإنجاز",
        "عظمتك تكمن في قدرتك على الاستمرار عندما ينسحب الآخرون",
        "ابدأ من حيث أنت، واستخدم ما تملك، وافعل ما تستطيع",
        "الناجحون هم أناس لم يتوقفوا أبداً عن المحاولة",
        "كن أنت التغيير الذي تريد أن تراه في عملك",
        "الإرادة هي المحرك الصامت نحو القمة",
        "كل عقبة هي فرصة متنكرة للتعلم والتطور",
        "العمل الجماعي يحقق ما لا يستطيع الفرد تحقيقه وحده",
        "ركز على النتائج، وليس على العقبات",
        "شغفك هو وقود رحلتك نحو التميز",
        "تحدَّ نفسك اليوم لتكون أفضل نسخة منك غداً",
        "الأفكار العظيمة تبدأ بخطوات شجاعة",
        "الثقة بالنفس هي أول أسرار النجاح",
        "لا تنظر للخلف، فأنت لست ذاهباً إلى هناك",
        "اجعل اسمك مرادفاً للإتقان والجودة",
        "النجاح لا يأتي بالصدفة، بل بالعمل الذكي",
        "كن ملهماً لمن حولك بطاقتك وإيجابيتك",
        "المستقبل ينتمي لأولئك الذين يؤمنون بجمال أحلامهم",
        "صناعة المستحيل تبدأ بكلمة 'أستطيع'",
        "كُن القائد الذي كنت تتمنى أن تعمل معه",
        "الفضل للمثابرة وليس للذكاء فقط",
        "لا تتوقف عندما تتعب، توقف عندما تنتهي",
        "النجاح ليس نهائياً، والفشل ليس قاتلاً",
        "الحلم هو نقطة البداية، والعمل هو نقطة الوصول",
        "لا تقارن بدايتك بنهاية الآخرين",
        "العجز هو أن تظل مكانك بينما العالم يتحرك",
        "التغيير هو فرصة لنمو جديد",
        "كل يوم هو فرصة لتعلم شيء جديد",
        "الإبداع هو رؤية المألوف بطريقة غير مألوفة",
        "كن صبوراً، فالأشياء الجميلة تحتاج وقتاً",
        "الإصرار يحطم كل جدار",
        "العمل بذكاء أفضل من العمل الشاق وحده",
        "قيمتك تزداد كلما زاد عطاؤك",
        "الصمت في العمل إنجاز، والكلام فيه إهدار",
        "ابحث عن الحلول لا عن الأعذار",
        "رحلة الألف ميل تبدأ بخطوة واثقة",
        "كن التغيير الذي تنشده في المؤسسة",
        "الأمانة في العمل هي سر البركة فيه",
        "الوقت هو أثمن ما تملك، فلا تضيعه فيما لا يفيد",
        "القمة تتسع للجميع، لكنها لا تستقبل إلا المتميزين"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4" dir="rtl">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/60 rounded-full blur-[120px] opacity-70" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/60 rounded-full blur-[120px] opacity-70" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-indigo-50/50 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-12 space-y-6">
                    <div className="inline-flex items-center justify-center p-6 bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white/50 mb-4 transition-transform hover:scale-105 duration-500">
                        <img
                            src="/api/company/logo"
                            alt="Company Logo"
                            className="h-16 w-auto object-contain drop-shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 italic">"{randomQuote}"</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-md mx-auto">{user.name}، نتمنى لك يوماً سعيداً</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                    {accessibleSystems.map((sys) => (
                        <Link
                            key={sys.id}
                            href={sys.href}
                            className="group relative bg-white/70 backdrop-blur-md rounded-[2rem] p-8 shadow-sm ring-1 ring-white/60 hover:shadow-2xl hover:bg-white/90 hover:-translate-y-1 transition-all duration-300"
                        >
                            {/* Card Content */}
                            <div className="flex flex-col items-start h-full">
                                {/* Icon Container */}
                                <div className={`w-16 h-16 rounded-2xl ${sys.color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/50 shadow-inner`}>
                                    <sys.icon className={`w-8 h-8 ${sys.color.replace('bg-', 'text-')}`} />
                                </div>

                                {/* Text */}
                                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">
                                    {sys.name}
                                </h3>
                                <p className="text-slate-500 text-base leading-relaxed mb-6">
                                    {sys.description}
                                </p>

                                {/* Action Indicator */}
                                <div className="mt-auto flex items-center gap-2 text-sm font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                                    <span>دخول للنظام</span>
                                    <span className="block transition-transform group-hover:-translate-x-1">←</span>
                                </div>
                            </div>

                            {/* Gradient Border Overlay on Hover */}
                            <div className="absolute inset-0 rounded-[2rem] ring-2 ring-transparent group-hover:ring-blue-500/10 pointer-events-none transition-all duration-300" />
                        </Link>
                    ))}
                </div>

                {accessibleSystems.length === 0 && (
                    <div className="text-center py-16 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/50 shadow-sm mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">لا توجد صلاحيات</h3>
                        <p className="text-slate-500">لا توجد أنظمة متاحة لحسابك حالياً. يرجى التواصل مع المسؤول.</p>
                    </div>
                )}

                {/* Footer / Logout */}
                <div className="text-center mt-12 pb-8">
                    <LogoutButton />
                </div>
            </div>
        </div>
    );
}

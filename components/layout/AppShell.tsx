"use client";

import React from "react";
import { X } from "lucide-react";

interface AppShellProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    header: React.ReactNode;
}

export function AppShell({ children, sidebar, header }: AppShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const handleToggle = () => setIsMobileMenuOpen(prev => !prev);
        window.addEventListener("toggle-mobile-menu", handleToggle);
        return () => window.removeEventListener("toggle-mobile-menu", handleToggle);
    }, []);

    // Close mobile menu on clicking any sidebar item (detected via route change)
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [children]);

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden" dir="rtl">
            {/* Top Accent Bar with Pattern */}
            <div
                className="h-7 w-full bg-primary/10 border-b border-primary/20 relative"
                style={{
                    backgroundImage: "url('/images/pattern.webp')",
                    backgroundSize: '300px',
                    opacity: 0.7
                }}
            />

            {/* Header Slot */}
            {header}

            {/* Sidebar Desktop Slot - Fixed width on md+ */}
            <div className="flex flex-1 overflow-hidden relative">
                <div className="hidden md:block h-full flex-shrink-0 border-l border-gray-200 bg-white shadow-sm z-20">
                    {sidebar}
                </div>

                {/* Mobile Sidebar Overlay/Drawer */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        {/* Backdrop */}
                        <div 
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        {/* Drawer content */}
                        <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                                <span className="font-bold text-gray-900">القائمة</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-sidebar-mobile">
                                {sidebar}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 bg-gray-50 overflow-auto relative z-0">
                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

"use client";

import React from "react";

interface AppShellProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    header: React.ReactNode;
}

export function AppShell({ children, sidebar, header }: AppShellProps) {
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

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Slot */}
                {sidebar}

                {/* Main Content Area */}
                <main className="flex-1 p-6 lg:p-8 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

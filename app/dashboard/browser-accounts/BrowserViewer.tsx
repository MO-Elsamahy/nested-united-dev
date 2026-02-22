"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Minus, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Globe,
  ExternalLink,
  Bell,
  Maximize2,
  Minimize2,
  Home
} from "lucide-react";

interface BrowserViewerProps {
  accountId: string;
  accountName: string;
  platform: "airbnb" | "gathern";
  onClose: () => void;
}

export function BrowserViewer({ accountId, accountName, platform, onClose }: BrowserViewerProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");

  const platformUrl = platform === "airbnb" 
    ? "https://www.airbnb.com/hosting/inbox"
    : "https://business.gathern.co/login";

  const platformColors = {
    airbnb: {
      bg: "bg-gradient-to-l from-red-500 to-rose-600",
      text: "text-red-600",
      border: "border-red-200",
      light: "bg-red-50"
    },
    gathern: {
      bg: "bg-gradient-to-l from-green-500 to-emerald-600", 
      text: "text-green-600",
      border: "border-green-200",
      light: "bg-green-50"
    }
  };

  const colors = platformColors[platform];

  const handleBack = () => {
    window.electronAPI?.browserGoBack(accountId);
  };

  const handleForward = () => {
    window.electronAPI?.browserGoForward(accountId);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    window.electronAPI?.browserReload(accountId);
  };

  const handleHome = () => {
    window.electronAPI?.browserGoHome(accountId);
  };

  const handleOpenExternal = () => {
    window.open(platformUrl, "_blank");
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${isMaximized ? 'p-0' : ''}`}>
      <div 
        className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isMaximized ? 'w-full h-full rounded-none' : 'w-[90%] h-[85%] max-w-6xl'
        }`}
      >
        {/* Header / Toolbar */}
        <div className={`${colors.bg} text-white`}>
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{accountName}</h3>
                <p className="text-xs text-white/80">
                  {platform === "airbnb" ? "Airbnb" : "Gathern"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={isMaximized ? "تصغير" : "تكبير"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-black/10">
            <div className="flex items-center gap-1">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="رجوع"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleForward}
                className="p-2 hover:bg-white/20 rounded-colors"
                title="تقدم"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-2 hover:bg-white/20 rounded-lg transition-colors ${isLoading ? 'animate-spin' : ''}`}
                title="تحديث"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleHome}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="الصفحة الرئيسية"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>

            {/* URL Bar */}
            <div className="flex-1 bg-white/20 rounded-lg px-4 py-1.5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/80 truncate">
                {currentUrl || platformUrl}
              </span>
            </div>

            <button
              onClick={handleOpenExternal}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="فتح في المتصفح الخارجي"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Browser Content Area */}
        <div className="flex-1 bg-gray-100 relative">
          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mx-auto mb-4 animate-pulse`}>
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-600">جاري تحميل {platform === "airbnb" ? "Airbnb" : "Gathern"}...</p>
              </div>
            </div>
          )}
          
          {/* WebView Placeholder - This is where Electron will inject the actual webview */}
          <div 
            id={`webview-container-${accountId}`} 
            className="w-full h-full"
            data-account-id={accountId}
            data-platform={platform}
            data-url={platformUrl}
          />
        </div>

        {/* Status Bar */}
        <div className={`${colors.light} ${colors.border} border-t px-4 py-2 flex items-center justify-between text-sm`}>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              مراقبة الإشعارات نشطة
            </span>
          </div>
          <div className="text-gray-400 text-xs">
            اضغط Esc للإغلاق
          </div>
        </div>
      </div>
    </div>
  );
}


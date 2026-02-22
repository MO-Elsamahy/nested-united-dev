"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Globe, Maximize2, RefreshCw } from "lucide-react";

interface Tab {
  id: string;
  platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
  accountName: string;
  title: string;
  url: string;
  isFocused: boolean;
}

const platformIcons = {
  airbnb: "🏠",
  gathern: "💬",
  whatsapp: "💚",
  zomrahub: "🏘️",
};

const platformColors = {
  airbnb: "bg-red-500",
  gathern: "bg-green-500",
  whatsapp: "bg-emerald-500",
  zomrahub: "bg-purple-500",
};

export function TabBar() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [isElectron, setIsElectron] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check permission for browser accounts page
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check session first
        const sessionResponse = await fetch("/api/auth/session");
        if (!sessionResponse.ok) {
          setHasPermission(false);
          return;
        }
        const session = await sessionResponse.json();
        if (!session?.user) {
          setHasPermission(false);
          return;
        }

        // Check permission via API
        const response = await fetch(
          `/api/permissions/check?page_path=${encodeURIComponent("/dashboard/browser-accounts")}&action=view`
        );

        if (response.ok) {
          const data = await response.json();
          setHasPermission(data.hasPermission || false);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, []);

  const loadTabs = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const openTabs = await window.electronAPI.getOpenTabs();
      setTabs(openTabs);
    } catch (error) {
      console.error("Error loading tabs:", error);
    }
  }, []);

  const handleFocusTab = useCallback(async (tabId: string) => {
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.focusTab(tabId);
      // Small delay to ensure window focus is updated
      setTimeout(loadTabs, 100);
    } catch (error) {
      console.error("Error focusing tab:", error);
    }
  }, [loadTabs]);

  const handleCloseTab = useCallback(async (tabId: string) => {
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.closeBrowserAccount(tabId);
      loadTabs(); // Refresh tabs
    } catch (error) {
      console.error("Error closing tab:", error);
    }
  }, [loadTabs]);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI?.isElectron);

    if (!window.electronAPI?.isElectron) {
      return;
    }

    // Load tabs initially
    loadTabs();

    // Listen for tabs-changed event from Electron
    if (window.electronAPI?.onTabsChanged) {
      window.electronAPI.onTabsChanged(() => {
        loadTabs();
      });
    }

    // Refresh tabs every 2 seconds (fallback)
    const interval = setInterval(loadTabs, 2000);

    // Also listen for window focus events
    const handleFocus = () => {
      loadTabs();
    };
    window.addEventListener("focus", handleFocus);

    // Keyboard shortcuts for tab navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab or Ctrl+PageDown: Next tab
      if ((e.ctrlKey || e.metaKey) && (e.key === "Tab" || e.key === "PageDown")) {
        e.preventDefault();
        loadTabs().then(() => {
          // Get fresh tabs list
          window.electronAPI?.getOpenTabs().then((freshTabs) => {
            if (freshTabs && freshTabs.length > 0) {
              const focusedIndex = freshTabs.findIndex((t) => t.isFocused);
              if (focusedIndex >= 0) {
                const nextIndex = (focusedIndex + 1) % freshTabs.length;
                handleFocusTab(freshTabs[nextIndex].id);
              } else {
                handleFocusTab(freshTabs[0].id);
              }
            }
          });
        });
      }
      // Ctrl+Shift+Tab or Ctrl+PageUp: Previous tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "Tab" || e.key === "PageUp")) {
        e.preventDefault();
        loadTabs().then(() => {
          // Get fresh tabs list
          window.electronAPI?.getOpenTabs().then((freshTabs) => {
            if (freshTabs && freshTabs.length > 0) {
              const focusedIndex = freshTabs.findIndex((t) => t.isFocused);
              if (focusedIndex >= 0) {
                const prevIndex = focusedIndex === 0 ? freshTabs.length - 1 : focusedIndex - 1;
                handleFocusTab(freshTabs[prevIndex].id);
              } else {
                handleFocusTab(freshTabs[freshTabs.length - 1].id);
              }
            }
          });
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loadTabs, handleFocusTab]);

  // Don't show tab bar if:
  // 1. Not in Electron
  // 2. No tabs open
  // 3. User doesn't have permission to view browser accounts
  // 4. Still checking permission
  if (!isElectron || tabs.length === 0 || hasPermission === false || hasPermission === null) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleFocusTab(tab.id)}
            className={`
              group flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg cursor-pointer transition-all min-w-[160px] sm:min-w-[200px] md:min-w-[220px] max-w-[280px] sm:max-w-[300px] md:max-w-[320px] relative flex-shrink-0
              ${tab.isFocused
                ? "bg-gradient-to-l from-blue-50 to-blue-100 border-2 border-blue-500 shadow-md shadow-blue-500/20"
                : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm"
              }
            `}
          >
            {/* Platform Indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-3 h-3 rounded-full ${platformColors[tab.platform]} ${tab.isFocused ? "ring-2 ring-white ring-offset-1" : ""
                  }`}
              />
              <span className="text-base">{platformIcons[tab.platform]}</span>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className={`text-xs sm:text-sm font-semibold truncate ${tab.isFocused ? "text-blue-900" : "text-gray-900"
                  }`}>
                  {tab.accountName}
                </span>
              </div>
              <div className={`text-[10px] sm:text-xs truncate mt-0.5 ${tab.isFocused ? "text-blue-700" : "text-gray-500"
                }`}>
                {tab.title.length > 25 ? `${tab.title.substring(0, 25)}...` : tab.title}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFocusTab(tab.id);
                }}
                className="p-1.5 hover:bg-blue-200 rounded-md text-gray-600 hover:text-blue-700 transition-colors"
                title="إظهار النافذة"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                className="p-1.5 hover:bg-red-100 rounded-md text-gray-600 hover:text-red-600 transition-colors"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Active Indicator */}
            {tab.isFocused && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-b-lg" />
            )}
          </div>
        ))}

        {/* Refresh Button */}
        <button
          onClick={loadTabs}
          className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0 border border-gray-200 hover:border-gray-300"
          title="تحديث التابس"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Stats */}
      {tabs.length > 0 && (
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-l from-gray-50 to-gray-100 border-t border-gray-200 text-[10px] sm:text-xs text-gray-700 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
            <span className="font-medium whitespace-nowrap">
              {tabs.length} {tabs.length === 1 ? "تاب" : "تاب"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {tabs.filter((t) => t.platform === "airbnb").length > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-md border border-red-200">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="font-medium text-red-700">
                  Airbnb: {tabs.filter((t) => t.platform === "airbnb").length}
                </span>
              </span>
            )}
            {tabs.filter((t) => t.platform === "gathern").length > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md border border-green-200">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="font-medium text-green-700">
                  Gathern: {tabs.filter((t) => t.platform === "gathern").length}
                </span>
              </span>
            )}
            {tabs.filter((t) => t.platform === "whatsapp").length > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-emerald-700">
                  WhatsApp: {tabs.filter((t) => t.platform === "whatsapp").length}
                </span>
              </span>
            )}\n            {tabs.filter((t) => t.platform === "zomrahub").length > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md border border-purple-200">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="font-medium text-purple-700">
                  Zomrahub: {tabs.filter((t) => t.platform === "zomrahub").length}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


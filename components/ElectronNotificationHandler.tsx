"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

interface NotificationData {
  accountId: string;
  accountName: string;
  platform: string;
  count: number;
}

interface ToastNotification extends NotificationData {
  id: string;
  timestamp: number;
}

export function ElectronNotificationHandler() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const playNotificationSound = () => {
    try {
      // Create a notification sound using Web Audio API
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();

      // First beep (higher pitch)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.value = 800;
      oscillator1.type = 'sine';
      gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.1);

      // Second beep (lower pitch) - delayed
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.value = 600;
      oscillator2.type = 'sine';
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator2.start(audioContext.currentTime + 0.15);
      oscillator2.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== "undefined" && window.electronAPI) {
      console.log("[Dashboard] Setting up Electron notification listener");

      // Listen for notifications from Electron
      window.electronAPI.onBrowserNotification((data: NotificationData) => {
        console.log("[Dashboard] Received notification from Electron:", data);

        const toast: ToastNotification = {
          ...data,
          id: `${data.accountId}-${Date.now()}`,
          timestamp: Date.now(),
        };

        setNotifications((prev) => [...prev, toast]);

        // Auto-remove after 10 seconds
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== toast.id)
          );
        }, 10000);

        // Play sound
        playNotificationSound();
      });

      // Listen for sound play requests
      window.electronAPI.onPlayNotificationSound(() => {
        playNotificationSound();
      });

      // Listen for database notifications
      if (window.electronAPI.onDatabaseNotification) {
        window.electronAPI.onDatabaseNotification((data: { title: string; body: string; id: string }) => {
          console.log("[Dashboard] Received database notification from Electron:", data);

          const toast: ToastNotification = {
            accountId: data.id,
            accountName: data.title,
            platform: "gathern", // Default platform for database notifications
            count: 1,
            id: `db-${data.id}-${Date.now()}`,
            timestamp: Date.now(),
          };

          setNotifications((prev) => [...prev, toast]);

          // Auto-remove after 10 seconds
          setTimeout(() => {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== toast.id)
            );
          }, 10000);

          // Play sound
          playNotificationSound();
        });
      }
      // Listen for sync completion
      if (window.electronAPI.onSyncComplete) {
        window.electronAPI.onSyncComplete((data: { accountId: string; platform: string }) => {
          console.log("[Dashboard] Sync complete for:", data.platform);
          // Optional: Add a subtle toast or refresh part of the UI
        });
      }
    } else {

      console.log("[Dashboard] Not running in Electron, notification listener disabled");
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto bg-white rounded-xl shadow-2xl border-2 border-red-500 overflow-hidden animate-in slide-in-from-top-5 duration-300"
          style={{ minWidth: "350px", maxWidth: "400px" }}
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notification.platform === "airbnb"
                ? "bg-gradient-to-br from-red-500 to-rose-600"
                : notification.platform === "gathern"
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-gradient-to-br from-purple-500 to-purple-600"
                }`}
            >
              <Bell className="w-6 h-6 text-white animate-pulse" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-900 text-lg">
                  إشعار جديد!
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-medium ${notification.platform === "airbnb"
                    ? "bg-red-100 text-red-700"
                    : notification.platform === "gathern"
                      ? "bg-green-100 text-green-700"
                      : "bg-purple-100 text-purple-700"
                    }`}
                >
                  {notification.platform === "airbnb" ? "Airbnb" : notification.platform === "gathern" ? "Gathern" : "Zomrahub"}
                </span>
              </div>
              <p className="text-gray-700 font-medium">
                {notification.accountName}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                يوجد {notification.count} إشعار جديد
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => removeNotification(notification.id)}
              className="shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className={`h-full ${notification.platform === "airbnb"
                ? "bg-gradient-to-l from-red-500 to-rose-600"
                : notification.platform === "gathern"
                  ? "bg-gradient-to-l from-green-500 to-emerald-600"
                  : "bg-gradient-to-l from-purple-500 to-purple-600"
                }`}
              style={{
                animation: "shrink 10s linear forwards",
              }}
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}


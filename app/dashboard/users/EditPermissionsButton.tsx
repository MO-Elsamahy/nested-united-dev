"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

interface Permission {
  page_path: string;
  can_view: boolean;
  can_edit: boolean;
}

interface EditPermissionsButtonProps {
  userId: string;
  userName: string;
}

const AVAILABLE_PAGES = [
  { path: "/dashboard", label: "لوحة التحكم" },
  { path: "/dashboard/accounts", label: "الحسابات" },
  { path: "/dashboard/units", label: "الوحدات" },
  { path: "/dashboard/unit-readiness", label: "جاهزية الوحدات" },
  { path: "/dashboard/bookings", label: "الحجوزات" },
  { path: "/dashboard/maintenance", label: "الصيانة" },
  { path: "/dashboard/browser-accounts", label: "حسابات المتصفح" },
  { path: "/dashboard/activity-logs", label: "سجل الأنشطة" },
];

export function EditPermissionsButton({ userId, userName }: EditPermissionsButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const loadPermissions = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        const existingPermissions = data.permissions || [];
        
        // Initialize permissions for all pages
        const allPermissions = AVAILABLE_PAGES.map((page) => {
          const existing = existingPermissions.find(
            (p: Permission) => p.page_path === page.path
          );
          return {
            page_path: page.path,
            can_view: existing?.can_view || false,
            can_edit: existing?.can_edit || false,
          };
        });
        
        setPermissions(allPermissions);
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        setIsOpen(false);
        // Clear client-side permission caches
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("permissions-updated"));
        }
        router.refresh();
        alert("تم حفظ الصلاحيات بنجاح");
      } else {
        alert("حدث خطأ أثناء حفظ الصلاحيات");
      }
    } catch (error) {
      alert("حدث خطأ أثناء حفظ الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (index: number, field: "can_view" | "can_edit", value: boolean) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: value };
    // If can_edit is true, can_view must also be true
    if (field === "can_edit" && value) {
      updated[index].can_view = true;
    }
    // If can_view is false, can_edit must also be false
    if (field === "can_view" && !value) {
      updated[index].can_edit = false;
    }
    setPermissions(updated);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm border border-blue-200 text-blue-600 rounded hover:bg-blue-50 flex items-center gap-1"
      >
        <Settings className="w-4 h-4" />
        <span>الصلاحيات</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                إدارة صلاحيات: {userName}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {AVAILABLE_PAGES.map((page, index) => {
                  const perm = permissions[index];
                  if (!perm) return null;

                  return (
                    <div
                      key={page.path}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{page.label}</h3>
                        <p className="text-sm text-gray-500">{page.path}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perm.can_view}
                            onChange={(e) =>
                              updatePermission(index, "can_view", e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">عرض</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perm.can_edit}
                            onChange={(e) =>
                              updatePermission(index, "can_edit", e.target.checked)
                            }
                            disabled={!perm.can_view}
                            className="w-4 h-4 disabled:opacity-50"
                          />
                          <span className="text-sm">تعديل</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-6 pt-6 border-t">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


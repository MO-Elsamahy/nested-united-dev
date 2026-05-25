"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Building2, Calculator, Users, Users2, Wrench, Check, X } from "lucide-react";

interface Permission {
  page_path: string;
  can_view: boolean;
  can_edit: boolean;
}

interface EditPermissionsButtonProps {
  userId: string;
  userName: string;
}

const SYSTEM_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  rentals: { label: "إدارة التأجير", icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  accounting: { label: "النظام المالي", icon: Calculator, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  hr: { label: "الموارد البشرية", icon: Users, color: "text-violet-600 bg-violet-50 border-violet-200" },
  crm: { label: "إدارة العملاء", icon: Users2, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  maintenance: { label: "الصيانة", icon: Wrench, color: "text-orange-600 bg-orange-50 border-orange-200" },
};

export function EditPermissionsButton({ userId, userName }: EditPermissionsButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for all pages and their permissions
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [systemsMap, setSystemsMap] = useState<Record<string, { path: string; label: string }[]>>({});
  const [activeTab, setActiveTab] = useState<string>("");

  async function loadPermissions() {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        const existingPermissions = data.permissions || [];
        const systems = data.systems || {};
        
        setSystemsMap(systems);
        
        // Set first system as active tab
        const systemKeys = Object.keys(systems);
        if (systemKeys.length > 0 && !activeTab) {
          setActiveTab(systemKeys[0]);
        }

        // Gather all pages from all systems returned
        const allPages: { path: string; label: string }[] = [];
        Object.values(systems).forEach((pages: any) => {
          allPages.push(...pages);
        });

        // Initialize permissions state for all pages across all systems
        const initializedPermissions = allPages.map((page) => {
          const existing = existingPermissions.find(
            (p: Permission) => p.page_path === page.path
          );
          return {
            page_path: page.path,
            can_view: existing?.can_view || false,
            can_edit: existing?.can_edit || false,
          };
        });

        setPermissions(initializedPermissions);
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const handleSave = async () => {
    setSaving(true);
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
    } catch (_error) {
      alert("حدث خطأ أثناء حفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = (pagePath: string, field: "can_view" | "can_edit", value: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => {
        if (perm.page_path !== pagePath) return perm;
        
        const updated = { ...perm, [field]: value };
        // If can_edit is true, can_view must also be true
        if (field === "can_edit" && value) {
          updated.can_view = true;
        }
        // If can_view is false, can_edit must also be false
        if (field === "can_view" && !value) {
          updated.can_edit = false;
        }
        return updated;
      })
    );
  };

  const systemKeys = Object.keys(systemsMap);

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden text-right" dir="rtl">
            
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  إدارة صلاحيات الصفحات للموظف
                </h2>
                <p className="text-sm text-gray-500 mt-1">المستخدم: {userName}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                <span className="animate-spin text-2xl mb-2">⋯</span>
                <span>جاري تحميل الصلاحيات...</span>
              </div>
            ) : systemKeys.length === 0 ? (
              <div className="flex-1 p-8 text-center text-amber-700 bg-amber-50">
                <p className="font-bold">هذا المستخدم لا يملك حق الوصول لأي نظام!</p>
                <p className="text-sm mt-2">يرجى الانتقال لصفحة &quot;صلاحيات الأدوار&quot; وتفعيل الأنظمة لهذا الدور أولاً.</p>
              </div>
            ) : (
              <>
                {/* System Tabs */}
                <div className="flex gap-2 border-b px-6 py-3 bg-gray-50 overflow-x-auto">
                  {systemKeys.map((sysKey) => {
                    const sys = SYSTEM_CONFIG[sysKey] || { label: sysKey, icon: Building2, color: "text-gray-600" };
                    const Icon = sys.icon;
                    const isActive = activeTab === sysKey;
                    
                    return (
                      <button
                        key={sysKey}
                        onClick={() => setActiveTab(sysKey)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "bg-white text-gray-600 border hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{sys.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content (Pages Grid) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(systemsMap[activeTab] || []).map((page) => {
                      const perm = permissions.find((p) => p.page_path === page.path) || {
                        page_path: page.path,
                        can_view: false,
                        can_edit: false,
                      };

                      return (
                        <div
                          key={page.path}
                          className="border rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition"
                        >
                          <div className="flex-1 min-w-0 pl-4">
                            <h3 className="font-bold text-gray-900 truncate">{page.label}</h3>
                            <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{page.path}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Can View Checkbox */}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.can_view}
                                onChange={(e) =>
                                  updatePermission(page.path, "can_view", e.target.checked)
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700 select-none">عرض</span>
                            </label>

                            {/* Can Edit Checkbox */}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.can_edit}
                                onChange={(e) =>
                                  updatePermission(page.path, "can_edit", e.target.checked)
                                }
                                disabled={!perm.can_view}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-40"
                              />
                              <span className="text-sm font-medium text-gray-700 select-none disabled:opacity-40">تعديل</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t px-6 py-4 flex gap-3 bg-gray-50 justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition text-gray-700 bg-white"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

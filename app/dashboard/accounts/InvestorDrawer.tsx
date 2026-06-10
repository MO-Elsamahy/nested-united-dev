"use client";

import { useState, useEffect } from "react";
import { X, Save, Unlink, Link as LinkIcon, Building2, Percent, Loader2, Check } from "lucide-react";
import { PlatformAccount, Unit } from "@/lib/types/database";

interface Investor {
  id: string;
  name: string;
  default_profit_share: number;
  notes: string | null;
  platform_accounts: PlatformAccount[];
  units: Unit[];
}

interface InvestorDrawerProps {
  investor: Investor;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function InvestorDrawer({ investor, isOpen, onClose, onUpdate }: InvestorDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "accounts" | "units">("details");
  const [name, setName] = useState(investor.name);
  const [defaultProfitShare, setDefaultProfitShare] = useState(investor.default_profit_share.toString());
  const [notes, setNotes] = useState(investor.notes || "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Linked accounts and units states
  const [linkedAccounts, setLinkedAccounts] = useState<PlatformAccount[]>(investor.platform_accounts || []);
  const [allPlatformAccounts, setAllPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [linkedUnits, setLinkedUnits] = useState<any[]>(investor.units || []);
  const [unitOverrides, setUnitOverrides] = useState<Record<string, { share: string; saving: boolean; success: boolean }>>({});

  useEffect(() => {
    setName(investor.name);
    setDefaultProfitShare(investor.default_profit_share.toString());
    setNotes(investor.notes || "");
    setLinkedAccounts(investor.platform_accounts || []);
    setLinkedUnits(investor.units || []);
    setError("");
    setSuccess("");
    
    // Initialize overrides state
    const overrides: Record<string, { share: string; saving: boolean; success: boolean }> = {};
    if (investor.units) {
      investor.units.forEach((u: any) => {
        overrides[u.id] = {
          share: u.profit_share !== null && u.profit_share !== undefined ? u.profit_share.toString() : "",
          saving: false,
          success: false,
        };
      });
    }
    setUnitOverrides(overrides);
  }, [investor]);

  // Fetch all platform accounts to link from
  useEffect(() => {
    if (isOpen) {
      fetch("/api/accounts")
        .then((res) => res.json())
        .then((data) => setAllPlatformAccounts(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/investors/${investor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          default_profit_share: parseFloat(defaultProfitShare),
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || "فشل تحديث البيانات");
      }

      setSuccess("تم تحديث بيانات المستثمر بنجاح");
      setTimeout(() => setSuccess(""), 3000);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleLinkAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...allPlatformAccounts.find((a) => a.id === accountId),
          investor_id: investor.id,
        }),
      });

      if (!response.ok) throw new Error("فشل ربط الحساب");
      
      // Update local states
      const updatedAccount = await response.json();
      setLinkedAccounts([...linkedAccounts, updatedAccount]);
      setAllPlatformAccounts(allPlatformAccounts.map((a) => (a.id === accountId ? { ...a, investor_id: investor.id } : a)));
      
      onUpdate();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل ربط الحساب");
    }
  };

  const handleUnlinkAccount = async (accountId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء ربط هذا الحساب بالمستثمر؟")) return;

    try {
      const accountToUnlink = allPlatformAccounts.find((a) => a.id === accountId) || linkedAccounts.find((a) => a.id === accountId);
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...accountToUnlink,
          investor_id: null,
        }),
      });

      if (!response.ok) throw new Error("فشل إلغاء ربط الحساب");

      setLinkedAccounts(linkedAccounts.filter((a) => a.id !== accountId));
      setAllPlatformAccounts(allPlatformAccounts.map((a) => (a.id === accountId ? { ...a, investor_id: null } : a)));
      onUpdate();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل إلغاء ربط الحساب");
    }
  };

  const handleSaveUnitOverride = async (unitId: string) => {
    const override = unitOverrides[unitId];
    if (!override) return;

    setUnitOverrides(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], saving: true }
    }));

    try {
      const shareVal = override.share.trim();
      const profit_share = shareVal === "" ? null : parseFloat(shareVal);

      // Fetch current unit info
      const unitRes = await fetch(`/api/units/${unitId}`);
      if (!unitRes.ok) throw new Error("فشل جلب بيانات الوحدة");
      const unitData = await unitRes.json();

      const response = await fetch(`/api/units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...unitData,
          profit_share,
        }),
      });

      if (!response.ok) throw new Error("فشل حفظ النسبة المخصصة");

      setUnitOverrides(prev => ({
        ...prev,
        [unitId]: { ...prev[unitId], saving: false, success: true }
      }));

      // Update local units state
      setLinkedUnits(linkedUnits.map(u => u.id === unitId ? { ...u, profit_share } : u));
      
      setTimeout(() => {
        setUnitOverrides(prev => ({
          ...prev,
          [unitId]: { ...prev[unitId], success: false }
        }));
      }, 2000);

      onUpdate();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ");
      setUnitOverrides(prev => ({
        ...prev,
        [unitId]: { ...prev[unitId], saving: false }
      }));
    }
  };

  // Get platform accounts that belong to other investors or no one
  const availableAccountsToLink = allPlatformAccounts.filter(
    (acc) => acc.investor_id !== investor.id
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-gray-50 rounded-2xl max-h-[90vh] shadow-2xl flex flex-col animate-zoom-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {investor.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{investor.name}</h2>
              <p className="text-xs text-blue-200 mt-0.5">لوحة تحكم بيانات المستثمر ونسب الأرباح</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b px-6 flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 border-b-2 transition-colors ${
              activeTab === "details" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            بيانات المستثمر
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`py-4 border-b-2 transition-colors relative ${
              activeTab === "accounts" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            الحسابات المرتبطة
            {linkedAccounts.length > 0 && (
              <span className="mr-1.5 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {linkedAccounts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("units")}
            className={`py-4 border-b-2 transition-colors relative ${
              activeTab === "units" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            الوحدات والنسب
            {linkedUnits.length > 0 && (
              <span className="mr-1.5 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {linkedUnits.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-sm">
              {success}
            </div>
          )}

          {/* TAB: DETAILS */}
          {activeTab === "details" && (
            <form onSubmit={handleSaveDetails} className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم المستثمر</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-blue-600" />
                  نسبة ربح الشركة الافتراضية (%)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  value={defaultProfitShare}
                  onChange={(e) => setDefaultProfitShare(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="13"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  هذه هي النسبة التي تقتطعها الشركة تلقائياً من أرباح الوحدات ما لم يتم تخصيص نسبة معينة لوحدة محددة.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="ملاحظات حول المستثمر..."
                />
              </div>

              <button
                type="submit"
                disabled={savingDetails}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 shadow-md"
              >
                {savingDetails ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB: ACCOUNTS */}
          {activeTab === "accounts" && (
            <div className="space-y-6">
              {/* Linked list */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">حسابات المنصات النشطة</h3>
                {linkedAccounts.length > 0 ? (
                  <div className="divide-y">
                    {linkedAccounts.map((acc) => (
                      <div key={acc.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                              acc.platform === "airbnb" ? "bg-red-100 text-red-700" :
                              acc.platform === "gathern" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {acc.platform.toUpperCase()}
                            </span>
                            <span className="font-semibold text-gray-800">{acc.account_name}</span>
                          </div>
                          {acc.notes && <p className="text-xs text-gray-500 mt-1">{acc.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleUnlinkAccount(acc.id)}
                          className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          إلغاء الربط
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    لا توجد حسابات منصات مرتبطة بهذا المستثمر حالياً.
                  </div>
                )}
              </div>

              {/* Link account form */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-2">ربط حساب منصة جديد</h3>
                <p className="text-xs text-gray-500 mb-4">
                  اختر من حسابات المنصات المتوفرة لربطها بهذا المستثمر.
                </p>
                {availableAccountsToLink.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableAccountsToLink.map((acc) => (
                      <div key={acc.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <span className="font-semibold text-gray-700">{acc.account_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{acc.platform.toUpperCase()}</span>
                            {acc.investor_id && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                مرتبط بمستثمر آخر
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLinkAccount(acc.id)}
                          className="flex items-center gap-1 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 text-xs px-3 py-2 rounded-lg transition"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          ربط الحساب
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed rounded-xl">
                    لا توجد حسابات منصات إضافية متوفرة للربط.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: UNITS */}
          {activeTab === "units" && (
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">وحدات المستثمر</h3>
              <p className="text-xs text-gray-500 mb-6">
                قائمة بالوحدات المرتبطة بالمستثمر. يمكنك وضع نسبة مخصصة لكل وحدة بدلاً من النسبة الافتراضية ({defaultProfitShare}%). اترك الحقل فارغاً لتطبيق النسبة الافتراضية.
              </p>

              {linkedUnits.length > 0 ? (
                <div className="space-y-4">
                  {linkedUnits.map((unit) => {
                    const override = unitOverrides[unit.id] || { share: "", saving: false, success: false };
                    const isOverridden = unit.profit_share !== null && unit.profit_share !== undefined;

                    return (
                      <div key={unit.id} className="p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{unit.unit_name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-gray-500">كود: {unit.unit_code || "N/A"}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isOverridden ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {isOverridden ? `نسبة مخصصة: ${unit.profit_share}%` : "تتبع الافتراضي"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative w-28">
                            <input
                              type="number"
                              placeholder={defaultProfitShare}
                              step="0.01"
                              min="0"
                              max="100"
                              value={override.share}
                              onChange={(e) => setUnitOverrides(prev => ({
                                ...prev,
                                [unit.id]: { ...prev[unit.id], share: e.target.value }
                              }))}
                              className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-left outline-none text-sm font-semibold"
                            />
                            <Percent className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>

                          <button
                            onClick={() => handleSaveUnitOverride(unit.id)}
                            disabled={override.saving}
                            className={`p-2 rounded-lg border transition ${
                              override.success
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                            }`}
                            title="حفظ النسبة لهذه الوحدة"
                          >
                            {override.saving ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : override.success ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 text-sm border-2 border-dashed rounded-xl">
                  لا توجد وحدات مرتبطة بحسابات هذا المستثمر حالياً.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

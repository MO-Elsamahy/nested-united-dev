"use client";

import { useState } from "react";
import { Plus, Building2, Percent, Users, User, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PlatformAccount } from "@/lib/types/database";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { InvestorDrawer } from "./InvestorDrawer";

interface Investor {
  id: string;
  name: string;
  default_profit_share: number;
  notes: string | null;
  platform_accounts: PlatformAccount[];
  units: any[];
}

interface AccountsPageContentProps {
  initialInvestors: Investor[];
  initialPlatformAccounts: PlatformAccount[];
  canEdit: boolean;
}

export function AccountsPageContent({ initialInvestors, initialPlatformAccounts, canEdit }: AccountsPageContentProps) {
  const [activeTab, setActiveTab] = useState<"investors" | "platforms">("investors");
  const [investors, setInvestors] = useState<Investor[]>(initialInvestors);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>(initialPlatformAccounts);
  
  // Investor modal state
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [newInvName, setNewInvName] = useState("");
  const [newInvProfit, setNewInvProfit] = useState("10.00");
  const [newInvNotes, setNewInvNotes] = useState("");
  const [savingInvestor, setSavingInvestor] = useState(false);

  // Selected investor for the drawer
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  const refreshData = async () => {
    try {
      const [resInv, resAcc] = await Promise.all([
        fetch("/api/investors"),
        fetch("/api/accounts")
      ]);
      
      let freshInvestors: Investor[] = [];
      if (resInv.ok) {
        freshInvestors = await resInv.json();
        setInvestors(freshInvestors);
      }
      
      if (resAcc.ok) {
        setPlatformAccounts(await resAcc.json());
      }

      // If drawer is open, refresh selected investor state
      if (selectedInvestor && freshInvestors.length > 0) {
        const updated = freshInvestors.find(i => i.id === selectedInvestor.id);
        if (updated) setSelectedInvestor(updated);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvestor(true);
    try {
      const response = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInvName,
          default_profit_share: parseFloat(newInvProfit),
          notes: newInvNotes || null
        })
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || "فشل إضافة المستثمر");
      }

      setNewInvName("");
      setNewInvProfit("10.00");
      setNewInvNotes("");
      setShowAddInvestor(false);
      refreshData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setSavingInvestor(false);
    }
  };

  const handleDeleteInvestor = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستثمر "${name}"؟ سيتم إلغاء ربطه بجميع الوحدات وحسابات المنصات.`)) return;
    
    try {
      const response = await fetch(`/api/investors/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("فشل حذف المستثمر");
      refreshData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    }
  };

  const airbnbAccounts = platformAccounts.filter((a) => a.platform === "airbnb");
  const gathernAccounts = platformAccounts.filter((a) => a.platform === "gathern");
  const otherAccounts = platformAccounts.filter((a) => a.platform !== "airbnb" && a.platform !== "gathern");

  return (
    <div className="space-y-6">
      {/* Title & Add Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">حسابات المستثمرين والمنصات</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إدارة المستثمرين ونسب الربح وحسابات المنصات الخارجية</p>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {activeTab === "investors" ? (
              <button
                onClick={() => setShowAddInvestor(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition text-sm sm:text-base font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة مستثمر</span>
              </button>
            ) : (
              <Link
                href="/dashboard/accounts/new"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition text-sm sm:text-base font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة حساب منصة</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white p-1.5 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab("investors")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "investors"
              ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستثمرون</span>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {investors.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("platforms")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "platforms"
              ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>حسابات المنصات</span>
          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {platformAccounts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INVESTORS GRID */}
      {activeTab === "investors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investors.length > 0 ? (
            investors.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvestor(inv)}
                className="bg-white border rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Background decorative gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
                
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                        {inv.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">
                          {inv.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">مستثمر عقاري</p>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInvestor(inv.id, inv.name);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="حذف المستثمر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Summary of links */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-gray-50 border rounded-xl p-3 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-gray-500 block">نسبة الشركة</span>
                        <span className="font-bold text-sm text-gray-800">{inv.default_profit_share}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 border rounded-xl p-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-gray-500 block">الوحدات</span>
                        <span className="font-bold text-sm text-gray-800">
                          {inv.units?.length || 0} وحدات
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked accounts badges */}
                  <div className="mt-5">
                    <span className="text-xs text-gray-500 block mb-2 font-medium">المنصات المرتبطة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {inv.platform_accounts && inv.platform_accounts.length > 0 ? (
                        inv.platform_accounts.map((acc) => (
                          <span
                            key={acc.id}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                              acc.platform === "airbnb"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : acc.platform === "gathern"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-gray-50 text-gray-600 border border-gray-100"
                            }`}
                          >
                            {acc.platform === "airbnb" ? "Airbnb" : acc.platform === "gathern" ? "Gathern" : acc.platform}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">لا توجد حسابات منصات مرتبطة</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  <span>تفاصيل وإدارة النسب</span>
                  <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white border border-dashed rounded-2xl py-12 text-center text-gray-500">
              لا يوجد مستثمرون مضافون حالياً. انقر على {"إضافة مستثمر"} بالأعلى للبدء.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORIGINAL PLATFORM ACCOUNTS */}
      {activeTab === "platforms" && (
        <div className="space-y-6">
          {/* Airbnb */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg text-sm font-semibold">Airbnb</span>
                <span className="text-gray-400 text-sm">({airbnbAccounts.length})</span>
              </h2>
            </div>
            <div className="p-6">
              {airbnbAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {airbnbAccounts.map((account) => (
                    <div key={account.id} className="border rounded-xl p-4 flex justify-between items-start hover:border-gray-300 transition-colors">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{account.account_name}</h3>
                        {account.notes && <p className="text-gray-600 text-sm mt-1">{account.notes}</p>}
                        
                        {/* Display linked investor */}
                        {account.investor_id && (
                          <div className="mt-2.5 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg w-max font-medium">
                            <User className="w-3.5 h-3.5" />
                            <span>المستثمر: {investors.find(i => i.id === account.investor_id)?.name || "غير معروف"}</span>
                          </div>
                        )}

                        <p className="text-gray-400 text-xs mt-2.5">
                          تاريخ الإضافة: {new Date(account.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/accounts/${account.id}/edit`}
                            className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold"
                          >
                            تعديل
                          </Link>
                          <DeleteAccountButton id={account.id} name={account.account_name} onSuccess={refreshData} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">لا توجد حسابات Airbnb</p>
              )}
            </div>
          </div>

          {/* Gathern */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-lg text-sm font-semibold">Gathern</span>
                <span className="text-gray-400 text-sm">({gathernAccounts.length})</span>
              </h2>
            </div>
            <div className="p-6">
              {gathernAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gathernAccounts.map((account) => (
                    <div key={account.id} className="border rounded-xl p-4 flex justify-between items-start hover:border-gray-300 transition-colors">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{account.account_name}</h3>
                        {account.notes && <p className="text-gray-600 text-sm mt-1">{account.notes}</p>}
                        
                        {/* Display linked investor */}
                        {account.investor_id && (
                          <div className="mt-2.5 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg w-max font-medium">
                            <User className="w-3.5 h-3.5" />
                            <span>المستثمر: {investors.find(i => i.id === account.investor_id)?.name || "غير معروف"}</span>
                          </div>
                        )}

                        <p className="text-gray-400 text-xs mt-2.5">
                          تاريخ الإضافة: {new Date(account.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/accounts/${account.id}/edit`}
                            className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold"
                          >
                            تعديل
                          </Link>
                          <DeleteAccountButton id={account.id} name={account.account_name} onSuccess={refreshData} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">لا توجد حسابات Gathern</p>
              )}
            </div>
          </div>

          {/* Others */}
          {otherAccounts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="border-b px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-lg text-sm font-semibold">منصات أخرى</span>
                  <span className="text-gray-400 text-sm">({otherAccounts.length})</span>
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherAccounts.map((account) => (
                    <div key={account.id} className="border rounded-xl p-4 flex justify-between items-start hover:border-gray-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-bold uppercase">
                            {account.platform}
                          </span>
                          <h3 className="font-bold text-gray-800 text-lg">{account.account_name}</h3>
                        </div>
                        {account.notes && <p className="text-gray-600 text-sm mt-1">{account.notes}</p>}
                        
                        {account.investor_id && (
                          <div className="mt-2.5 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg w-max font-medium">
                            <User className="w-3.5 h-3.5" />
                            <span>المستثمر: {investors.find(i => i.id === account.investor_id)?.name || "غير معروف"}</span>
                          </div>
                        )}

                        <p className="text-gray-400 text-xs mt-2.5">
                          تاريخ الإضافة: {new Date(account.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/accounts/${account.id}/edit`}
                            className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold"
                          >
                            تعديل
                          </Link>
                          <DeleteAccountButton id={account.id} name={account.account_name} onSuccess={refreshData} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DRAWER FOR INVESTOR DETAIL */}
      {selectedInvestor && (
        <InvestorDrawer
          investor={selectedInvestor}
          isOpen={true}
          onClose={() => setSelectedInvestor(null)}
          onUpdate={refreshData}
        />
      )}

      {/* ADD INVESTOR MODAL */}
      {showAddInvestor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-zoom-in">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">إضافة مستثمر جديد</h3>
              <button onClick={() => setShowAddInvestor(false)} className="hover:bg-white/10 p-1.5 rounded-full transition">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddInvestor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">اسم المستثمر *</label>
                <input
                  type="text"
                  required
                  placeholder="اسم المستثمر"
                  value={newInvName}
                  onChange={(e) => setNewInvName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">نسبة ربح الشركة الافتراضية (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="13.00"
                    value={newInvProfit}
                    onChange={(e) => setNewInvProfit(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left font-semibold"
                  />
                  <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  placeholder="ملاحظات..."
                  value={newInvNotes}
                  onChange={(e) => setNewInvNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={savingInvestor}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {savingInvestor ? "جاري الحفظ..." : "حفظ المستثمر"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInvestor(false)}
                  className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple local X icon component to avoid Lucide resolution issues
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

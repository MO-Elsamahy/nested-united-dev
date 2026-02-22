"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface UnitOption {
  id: string;
  unit_name: string;
  unit_code: string | null;
  readiness_group_id?: string | null;
  platform_account?: {
    platform: string;
    account_name: string;
  } | null;
}

export function MergeUnitsPageClient({ units }: { units: UnitOption[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  // المجموعات الحالية المبنية على readiness_group_id
  const groups = useMemo(() => {
    const map = new Map<string, UnitOption[]>();
    units.forEach((u) => {
      if (u.readiness_group_id) {
        const existing = map.get(u.readiness_group_id) || [];
        existing.push(u);
        map.set(u.readiness_group_id, existing);
      }
    });
    // رجّع كمصفوفة مع label بسيط لكل مجموعة
    return Array.from(map.entries()).map(([groupId, groupUnits], index) => ({
      groupId,
      label: `مجموعة #${index + 1}`,
      units: groupUnits,
    }));
  }, [units]);

  const toggleUnit = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      setError("يجب اختيار وحدتين على الأقل للدمج");
      return;
    }

    // التحقق من أن الوحدات المختارة لا تنتمي إلى أكثر من مجموعة مختلفة
    const selectedUnits = units.filter((u) => selectedIds.includes(u.id));
    const distinctGroupIds = Array.from(
      new Set(
        selectedUnits
          .map((u) => u.readiness_group_id)
          .filter((g): g is string => !!g)
      )
    );

    if (distinctGroupIds.length > 1) {
      setError("لا يمكن دمج وحدات من أكثر من مجموعة مختلفة. رجاء فك الدمج أولاً للمجموعة الزائدة.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/unit-readiness/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_ids: selectedIds }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "فشل دمج الوحدات");
      }

      setSuccess("تم دمج الوحدات بنجاح، وتم ربط حالة الجاهزية بينها");
      // بعد دمج ناجح، نعيد المستخدم لصفحة الجاهزية
      setTimeout(() => {
        router.push("/dashboard/unit-readiness");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "فشل دمج الوحدات");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        اختر الوحدات التي تمثل نفس الوحدة الفعلية (مثلاً نفس الشقة على Airbnb و Gathern)،
        ثم اضغط على زر الدمج لربط حالة الجاهزية بينها. يمكنك أيضاً فك دمج المجموعات الحالية.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded">
          {success}
        </div>
      )}

      {/* Existing merged groups */}
      {groups.length > 0 && (
        <div className="border border-purple-200 rounded-lg bg-purple-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-purple-800">
              المجموعات المدموجة حالياً
            </h2>
            <span className="text-xs text-purple-700">
              إجمالي المجموعات: {groups.length}
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div
                key={group.groupId}
                className="bg-white/80 border border-purple-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                      {group.label}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({group.units.length} وحدة)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      setSuccess(null);
                      try {
                        setIsSubmitting(true);
                        const res = await fetch("/api/unit-readiness/unmerge", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ group_id: group.groupId }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(data.error || "فشل فك دمج المجموعة");
                        }
                        setSuccess("تم فك دمج المجموعة بنجاح");
                        router.refresh();
                      } catch (err: any) {
                        setError(err.message || "فشل فك دمج المجموعة");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:text-gray-400"
                    disabled={isSubmitting}
                  >
                    فك دمج هذه المجموعة
                  </button>
                </div>

                <div className="space-y-1 text-xs text-gray-700">
                  {group.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-1 mt-1 first:mt-0 first:pt-0 first:border-none"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          {u.unit_name}
                          {u.unit_code ? ` (${u.unit_code})` : ""}
                        </span>
                        {u.platform_account && (
                          <span className="ml-1 text-gray-500">
                            — {u.platform_account.account_name} ({u.platform_account.platform})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setSuccess(null);
                          try {
                            setIsSubmitting(true);
                            const res = await fetch("/api/unit-readiness/unmerge", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ unit_ids: [u.id] }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              throw new Error(data.error || "فشل فك دمج الوحدة");
                            }
                            setSuccess("تم فك دمج الوحدة من المجموعة");
                            router.refresh();
                          } catch (err: any) {
                            setError(err.message || "فشل فك دمج الوحدة");
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="text-[11px] text-red-600 hover:text-red-700 hover:underline disabled:text-gray-400"
                        disabled={isSubmitting}
                      >
                        فك دمج هذه الوحدة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Units selection for merge */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center text-sm">
          <span>الوحدات</span>
          <span className="text-gray-500">
            المختارة: <strong>{selectedIds.length}</strong>
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {units.map((u) => {
            const groupIndex = groups.findIndex((g) =>
              g.units.some((gu) => gu.id === u.id)
            );
            const inGroup = groupIndex !== -1;

            return (
              <label
                key={u.id}
                className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleUnit(u.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">
                      {u.unit_name}
                      {u.unit_code ? ` (${u.unit_code})` : ""}
                    </div>
                    {inGroup && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px]">
                        ضمن {groups[groupIndex].label}
                      </span>
                    )}
                  </div>
                  {u.platform_account && (
                    <div className="text-xs text-gray-600 mt-0.5">
                      {u.platform_account.account_name} — {u.platform_account.platform}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleMerge}
          disabled={isSubmitting || selectedIds.length < 2}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "جاري الدمج..." : "دمج الوحدات المحددة"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/unit-readiness")}
          className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}



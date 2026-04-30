import { query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MergeUnitsPageClient } from "../MergeUnitsPageClient";

async function getUnitsForMerge() {
  try {
    const units = await query<Record<string, unknown>>(
      "SELECT id, unit_name, unit_code, readiness_group_id FROM units WHERE status = 'active' ORDER BY unit_name"
    );

    return (units || []).map((u) => ({
      id: u.id as string,
      unit_name: u.unit_name as string,
      unit_code: u.unit_code as string | null,
      readiness_group_id: u.readiness_group_id as string | null,
      platform_account: null,
    }));
  } catch (error: unknown) {
    console.error("[Merge Units] Error fetching units:", error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export default async function MergeUnitsPage() {
  // Ensure only super admin can access this page
  await requireSuperAdmin();
  const units = await getUnitsForMerge();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/unit-readiness"
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">دمج وحدات</h1>
          <p className="text-gray-600 text-sm mt-1">
            ربط حالة الجاهزية بين وحدات تمثل نفس الوحدة الفعلية (مثلاً نفس الشقة على أكثر من منصة).
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <MergeUnitsPageClient units={units} />
      </div>
    </div>
  );
}



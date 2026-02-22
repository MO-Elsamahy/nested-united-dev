import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { getAppFeatures } from "@/lib/features";
import { User } from "@/lib/types/database";

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const user = await queryOne<User>("SELECT * FROM users WHERE id = ?", [session.user.id]);

    if (!user) redirect("/portal");

    // Check Permissions
    if (user.role !== 'super_admin') {
        const perm = await queryOne<{ can_access: number }>(
            "SELECT can_access FROM role_system_permissions WHERE role = ? AND system_id = 'crm'",
            [user.role]
        );
        if (!perm || !perm.can_access) {
            redirect("/portal");
        }
    }

    const features = await getAppFeatures();

    if (!features.crm) {
        notFound();
    }

    return (
        <AppShell
            header={<Header user={user} features={features} />}
            sidebar={<CRMSidebar user={user} />}
        >
            {children}
        </AppShell>
    );
}

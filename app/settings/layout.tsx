import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { getAppFeatures } from "@/lib/features";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { User } from "@/lib/types/database";

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    // Only Super Admin can access Global Settings
    const user = await queryOne<User>("SELECT * FROM users WHERE id = ?", [session.user.id]);

    if (!user || user.role !== 'super_admin') {
        console.error("Unauthorized Access to Settings");
        redirect("/portal");
    }

    const features = await getAppFeatures();

    return (
        <AppShell
            header={<Header user={user} features={features} />}
            sidebar={<SettingsSidebar user={user} />}
        >
            {children}
        </AppShell>
    );
}

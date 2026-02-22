import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { HRSidebar } from "@/components/hr/HRSidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne } from "@/lib/db";
import { getAppFeatures } from "@/lib/features";
import { User } from "@/lib/types/database";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HRLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const user = session?.user?.id ? await queryOne<User>("SELECT * FROM users WHERE id = ?", [session.user.id]) : null;

    // Redirect if no user
    if (!user) redirect("/login");

    const features = await getAppFeatures();

    if (!features.hr) {
        notFound();
    }

    return (
        <AppShell
            header={<Header user={user} features={features} />}
            sidebar={<HRSidebar user={user} />}
        >
            {children}
        </AppShell>
    );
}

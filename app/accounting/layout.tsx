import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { AccountingSidebar } from "@/components/accounting/AccountingSidebar";
import { getAppFeatures } from "@/lib/features";
import { User } from "@/lib/types/database";

import { checkUserPermission } from "@/lib/permissions";
import { DialogProvider } from "@/components/accounting/DialogProvider";

export default async function AccountingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const user = await queryOne<User>("SELECT * FROM users WHERE id = ?", [session.user.id]);

    if (!user) redirect("/portal");

    const hasAccess = await checkUserPermission(user.id, "/accounting", "view");
    if (!hasAccess) {
        redirect("/portal");
    }

    const features = await getAppFeatures();

    if (!features.accounting) {
        notFound();
    }

    return (
        <DialogProvider>
            <AppShell
                header={<Header user={user} features={features} />}
                sidebar={<AccountingSidebar user={user} />}
            >
                {children}
            </AppShell>
        </DialogProvider>
    );
}

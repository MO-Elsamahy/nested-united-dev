import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';

export const dynamic = 'force-dynamic';
export const metadata = {
    title: 'صندوق الوارد | NestedUnited',
};

export default async function InboxPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/auth/login');

    // Only pass the accounts list — InboxClient fetches messages via /api/messages
    const accounts = await query(`
      SELECT id, account_name, platform
      FROM browser_accounts
      WHERE platform != 'whatsapp' AND is_active = 1
      ORDER BY platform, account_name
    `);

    return (
        <div className="p-6 h-full">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-gray-900">صندوق الوارد الموحد</h1>
                <p className="text-gray-500 text-sm mt-1">
                    رسائل Airbnb وGathern في مكان واحد — يتحدث تلقائياً كل 15 ثانية
                </p>
            </div>
            <InboxClient accounts={accounts as any[]} />
        </div>
    );
}

import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
    title: 'Unified Inbox | NestedUnited',
    description: 'Manage all your platform messages in one place.',
};

export default async function InboxPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/auth/login');
    }

    // Fetch messages from the platform_messages table
    const messages = await query(`
    SELECT 
      pm.*, 
      ba.account_name,
      ba.platform as platform_type
    FROM platform_messages pm
    JOIN browser_accounts ba ON pm.platform_account_id = ba.id
    ORDER BY pm.sent_at DESC
    LIMIT 100
  `);

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-white">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">صندوق الوارد الموحد</h1>
                <p className="text-gray-500 text-sm mt-1">
                    مزامنة الرسائل في الوقت الفعلي من Airbnb و Gathern
                </p>
            </div>

            <div className="flex-1 overflow-hidden">
                <InboxClient initialMessages={messages} />
            </div>
        </div>
    );
}

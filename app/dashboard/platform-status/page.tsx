import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import StatusClient from './StatusClient';

export const metadata = {
    title: 'Platform Status | NestedUnited',
};

export default async function PlatformStatusPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/auth/login');
    }

    // Fetch account health data
    const accounts = await query(`
    SELECT 
      ba.id, 
      ba.account_name, 
      ba.platform, 
      ba.last_sync_at,
      (SELECT status FROM session_health_logs WHERE browser_account_id = ba.id ORDER BY last_check_at DESC LIMIT 1) as current_status,
      (SELECT error_message FROM session_health_logs WHERE browser_account_id = ba.id ORDER BY last_check_at DESC LIMIT 1) as last_error
    FROM browser_accounts ba
  `);

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">سلامة الجلسات والمزامنة</h1>
                <p className="text-gray-500 mt-2">مراقبة سلامة الجلسات وعمليات المزامنة التلقائية للمنصات في الوقت الفعلي.</p>
            </div>

            <StatusClient initialAccounts={accounts} />
        </div>
    );
}

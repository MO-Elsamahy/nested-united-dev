/**
 * Complete Supabase to MySQL Data Import Script (All 14 Tables)
 * 
 * Usage:
 * 1. Make sure XAMPP MySQL is running
 * 2. Run the add-missing-tables.sql script first
 * 3. Run: node scripts/import-all-data.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DOWNLOADS_PATH = 'C:\\Users\\Elsam\\Downloads';

// CSV file mappings - order matters for foreign keys!
const CSV_FILES = [
    // 1. Users first (no dependencies)
    {
        file: 'Supabase Snippet User accounts overview.csv',
        table: 'users',
        columns: ['id', 'email', 'password_hash', 'role', 'name', 'is_active', 'created_at'],
        transform: async (row) => ({
            id: row.id,
            email: row.email,
            password_hash: await bcrypt.hash('admin123', 10),
            role: row.role || 'admin',
            name: row.name,
            is_active: row.is_active === 'true' || row.is_active === true ? 1 : 0,
            created_at: formatDate(row.created_at),
        }),
    },
    // 2. Platform accounts (depends on users)
    {
        file: 'Supabase Snippet Untitled query.csv', // platform_accounts
        altFiles: ['platform_accounts.csv'],
        table: 'platform_accounts',
        columns: ['id', 'platform', 'account_name', 'notes', 'created_by', 'created_at'],
        filter: (row) => row.platform && ['airbnb', 'gathern', 'whatsapp', 'general'].includes(row.platform),
        transform: (row) => ({
            id: row.id,
            platform: row.platform,
            account_name: row.account_name,
            notes: nullify(row.notes),
            created_by: row.created_by,
            created_at: formatDate(row.created_at),
        }),
    },
    // 3. Units (depends on platform_accounts, users)
    {
        file: 'Supabase Snippet List All Units.csv',
        table: 'units',
        columns: ['id', 'platform_account_id', 'unit_name', 'unit_code', 'city', 'address', 'capacity', 'status', 'readiness_status', 'readiness_checkout_date', 'readiness_checkin_date', 'readiness_guest_name', 'readiness_notes', 'readiness_updated_by', 'readiness_updated_at', 'readiness_group_id', 'created_at', 'last_synced_at'],
        transform: (row) => ({
            id: row.id,
            platform_account_id: nullify(row.platform_account_id),
            unit_name: row.unit_name,
            unit_code: nullify(row.unit_code),
            city: nullify(row.city),
            address: nullify(row.address),
            capacity: row.capacity ? parseInt(row.capacity) : null,
            status: row.status || 'active',
            readiness_status: row.readiness_status || 'ready',
            readiness_checkout_date: nullify(row.readiness_checkout_date),
            readiness_checkin_date: nullify(row.readiness_checkin_date),
            readiness_guest_name: nullify(row.readiness_guest_name),
            readiness_notes: nullify(row.readiness_notes),
            readiness_updated_by: nullify(row.readiness_updated_by),
            readiness_updated_at: formatDate(row.readiness_updated_at),
            readiness_group_id: nullify(row.readiness_group_id),
            created_at: formatDate(row.created_at),
            last_synced_at: formatDate(row.last_synced_at),
        }),
    },
    // 4. Unit calendars
    {
        file: 'Supabase Snippet Unit Calendars.csv',
        table: 'unit_calendars',
        columns: ['id', 'unit_id', 'platform', 'platform_account_id', 'ical_url', 'is_primary', 'created_at'],
        transform: (row) => ({
            id: row.id,
            unit_id: row.unit_id,
            platform: row.platform,
            platform_account_id: nullify(row.platform_account_id),
            ical_url: row.ical_url,
            is_primary: row.is_primary === 'true' || row.is_primary === true ? 1 : 0,
            created_at: formatDate(row.created_at),
        }),
    },
    // 5. Unit platforms
    {
        file: 'unit_platforms.csv',
        table: 'unit_platforms',
        columns: ['id', 'unit_id', 'platform', 'listing_code', 'notes', 'created_at'],
        transform: (row) => ({
            id: row.id,
            unit_id: row.unit_id,
            platform: row.platform,
            listing_code: nullify(row.listing_code),
            notes: nullify(row.notes),
            created_at: formatDate(row.created_at),
        }),
        optional: true,
    },
    // 6. Reservations
    {
        file: 'Supabase Snippet All Reservations.csv',
        table: 'reservations',
        columns: ['id', 'unit_id', 'platform', 'start_date', 'end_date', 'summary', 'raw_event', 'is_manually_edited', 'manually_edited_at', 'last_synced_at', 'created_at'],
        transform: (row) => ({
            id: row.id,
            unit_id: row.unit_id,
            platform: row.platform,
            start_date: row.start_date,
            end_date: row.end_date,
            summary: nullify(row.summary),
            raw_event: nullify(row.raw_event),
            is_manually_edited: row.is_manually_edited === 'true' ? 1 : 0,
            manually_edited_at: formatDate(row.manually_edited_at),
            last_synced_at: formatDate(row.last_synced_at),
            created_at: formatDate(row.created_at),
        }),
    },
    // 7. Bookings
    {
        file: 'Supabase Snippet Fetch All Bookings.csv',
        table: 'bookings',
        columns: ['id', 'unit_id', 'platform_account_id', 'platform', 'guest_name', 'phone', 'checkin_date', 'checkout_date', 'amount', 'currency', 'notes', 'created_by', 'created_at'],
        transform: (row) => ({
            id: row.id,
            unit_id: row.unit_id,
            platform_account_id: nullify(row.platform_account_id),
            platform: nullify(row.platform),
            guest_name: row.guest_name,
            phone: nullify(row.phone),
            checkin_date: row.checkin_date,
            checkout_date: row.checkout_date,
            amount: row.amount ? parseFloat(row.amount) : 0,
            currency: row.currency || 'SAR',
            notes: nullify(row.notes),
            created_by: nullify(row.created_by),
            created_at: formatDate(row.created_at),
        }),
        optional: true,
    },
    // 8. Maintenance tickets
    {
        file: 'Supabase Snippet Maintenance Tickets.csv',
        table: 'maintenance_tickets',
        columns: ['id', 'unit_id', 'title', 'description', 'status', 'priority', 'created_by', 'assigned_to', 'accepted_at', 'worker_notes', 'created_at', 'resolved_at'],
        transform: (row) => ({
            id: row.id,
            unit_id: row.unit_id,
            title: row.title,
            description: nullify(row.description),
            status: row.status || 'open',
            priority: nullify(row.priority),
            created_by: row.created_by,
            assigned_to: nullify(row.assigned_to),
            accepted_at: formatDate(row.accepted_at),
            worker_notes: nullify(row.worker_notes),
            created_at: formatDate(row.created_at),
            resolved_at: formatDate(row.resolved_at),
        }),
    },
    // 9. Notifications
    {
        file: 'Supabase Snippet All notifications.csv',
        table: 'notifications',
        columns: ['id', 'type', 'unit_id', 'platform', 'maintenance_ticket_id', 'title', 'body', 'data', 'audience', 'recipient_user_id', 'is_read', 'created_at'],
        transform: (row) => ({
            id: row.id,
            type: row.type,
            unit_id: nullify(row.unit_id),
            platform: nullify(row.platform),
            maintenance_ticket_id: nullify(row.maintenance_ticket_id),
            title: row.title,
            body: row.body,
            data: nullify(row.data),
            audience: row.audience || 'all_admins',
            recipient_user_id: nullify(row.recipient_user_id),
            is_read: row.is_read === 'true' ? 1 : 0,
            created_at: formatDate(row.created_at),
        }),
    },
    // 10. Sync logs
    {
        file: 'Supabase Snippet Synchronization Logs.csv',
        table: 'sync_logs',
        columns: ['id', 'run_at', 'status', 'message', 'units_processed', 'errors_count', 'details'],
        transform: (row) => ({
            id: row.id,
            run_at: formatDate(row.run_at),
            status: row.status,
            message: nullify(row.message),
            units_processed: parseInt(row.units_processed) || 0,
            errors_count: parseInt(row.errors_count) || 0,
            details: nullify(row.details),
        }),
    },
    // 11. Browser accounts
    {
        file: 'Supabase Snippet Browser Accounts Listing.csv',
        table: 'browser_accounts',
        columns: ['id', 'platform', 'account_name', 'account_email', 'notes', 'platform_account_id', 'session_partition', 'last_notification_at', 'has_unread_notifications', 'is_active', 'created_by', 'created_at', 'updated_at'],
        transform: (row) => ({
            id: row.id,
            platform: row.platform,
            account_name: row.account_name,
            account_email: nullify(row.account_email),
            notes: nullify(row.notes),
            platform_account_id: nullify(row.platform_account_id),
            session_partition: row.session_partition,
            last_notification_at: formatDate(row.last_notification_at),
            has_unread_notifications: row.has_unread_notifications === 'true' ? 1 : 0,
            is_active: row.is_active === 'true' ? 1 : 0,
            created_by: row.created_by,
            created_at: formatDate(row.created_at),
            updated_at: formatDate(row.updated_at),
        }),
        optional: true,
    },
    // 12. Browser notifications
    {
        file: 'browser_notifications.csv',
        table: 'browser_notifications',
        columns: ['id', 'browser_account_id', 'detected_at', 'notification_type', 'is_acknowledged', 'acknowledged_by', 'acknowledged_at'],
        transform: (row) => ({
            id: row.id,
            browser_account_id: row.browser_account_id,
            detected_at: formatDate(row.detected_at),
            notification_type: nullify(row.notification_type),
            is_acknowledged: row.is_acknowledged === 'true' ? 1 : 0,
            acknowledged_by: nullify(row.acknowledged_by),
            acknowledged_at: formatDate(row.acknowledged_at),
        }),
        optional: true,
    },
    // 13. User permissions
    {
        file: 'Supabase Snippet User Permissions List.csv',
        table: 'user_permissions',
        columns: ['id', 'user_id', 'page_path', 'can_view', 'can_edit', 'created_at', 'updated_at'],
        transform: (row) => ({
            id: row.id,
            user_id: row.user_id,
            page_path: row.page_path,
            can_view: row.can_view === 'true' ? 1 : 0,
            can_edit: row.can_edit === 'true' ? 1 : 0,
            created_at: formatDate(row.created_at),
            updated_at: formatDate(row.updated_at),
        }),
        optional: true,
    },
    // 14. User activity logs
    {
        file: 'Supabase Snippet User Activity Log Retrieval.csv',
        table: 'user_activity_logs',
        columns: ['id', 'user_id', 'action_type', 'page_path', 'resource_type', 'resource_id', 'description', 'metadata', 'ip_address', 'user_agent', 'created_at'],
        transform: (row) => ({
            id: row.id,
            user_id: row.user_id,
            action_type: row.action_type,
            page_path: nullify(row.page_path),
            resource_type: nullify(row.resource_type),
            resource_id: nullify(row.resource_id),
            description: nullify(row.description),
            metadata: nullify(row.metadata),
            ip_address: nullify(row.ip_address),
            user_agent: nullify(row.user_agent),
            created_at: formatDate(row.created_at),
        }),
        optional: true,
    },
];

function nullify(val) {
    if (!val || val === 'null' || val === 'NULL' || val === '') return null;
    return val;
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === 'null') return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch {
        return null;
    }
}

function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });
        rows.push(row);
    }

    return rows;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

function findFile(config) {
    // Try main file
    const mainPath = path.join(DOWNLOADS_PATH, config.file);
    if (fs.existsSync(mainPath)) return mainPath;

    // Try alternative files
    if (config.altFiles) {
        for (const alt of config.altFiles) {
            const altPath = path.join(DOWNLOADS_PATH, alt);
            if (fs.existsSync(altPath)) return altPath;
        }
    }

    return null;
}

async function main() {
    console.log('🔌 Connecting to MySQL...');

    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'rentals_dashboard',
        multipleStatements: true,
    });

    console.log('✅ Connected to MySQL!\n');

    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    let totalImported = 0;

    for (const config of CSV_FILES) {
        const filePath = findFile(config);

        if (!filePath) {
            if (config.optional) {
                console.log(`⏭️  Skipping ${config.table} (file not found, optional)`);
            } else {
                console.log(`⚠️  File not found for ${config.table}: ${config.file}`);
            }
            continue;
        }

        console.log(`📥 Importing ${config.table}...`);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            let rows = parseCSV(content);

            if (rows.length === 0) {
                console.log(`   ⏭️  Empty file, skipping\n`);
                continue;
            }

            // Apply filter if exists
            if (config.filter) {
                rows = rows.filter(config.filter);
            }

            // Clear existing data
            await connection.execute(`DELETE FROM ${config.table}`);

            // Insert rows
            let inserted = 0;
            for (const row of rows) {
                try {
                    const transformedRow = await config.transform(row);
                    const values = config.columns.map(col => transformedRow[col] ?? null);
                    const placeholders = config.columns.map(() => '?').join(', ');
                    const sql = `INSERT INTO ${config.table} (${config.columns.join(', ')}) VALUES (${placeholders})`;

                    await connection.execute(sql, values);
                    inserted++;
                } catch (err) {
                    // Skip duplicate key errors silently
                    if (!err.message.includes('Duplicate entry')) {
                        console.log(`   ⚠️  Row error: ${err.message.substring(0, 80)}`);
                    }
                }
            }

            console.log(`   ✅ Inserted ${inserted}/${rows.length} rows\n`);
            totalImported += inserted;
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}\n`);
        }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('═'.repeat(50));
    console.log(`🎉 Import completed! Total: ${totalImported} rows`);
    console.log('═'.repeat(50));

    // Show counts
    console.log('\n📊 Table counts:');
    for (const config of CSV_FILES) {
        try {
            const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${config.table}`);
            console.log(`   ${config.table}: ${rows[0].count} rows`);
        } catch { }
    }

    await connection.end();
}

main().catch(console.error);

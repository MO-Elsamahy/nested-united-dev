/**
 * Supabase to MySQL Data Import Script
 * 
 * This script imports CSV data exported from Supabase into MySQL
 * 
 * Usage:
 * 1. Make sure XAMPP MySQL is running
 * 2. Create the database: CREATE DATABASE rentals_dashboard;
 * 3. Run the schema: mysql -u root rentals_dashboard < mysql-schema.sql
 * 4. Run this script: node scripts/import-data.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// CSV files mapping (order matters for foreign keys!)
const CSV_FILES = [
    {
        file: 'Supabase Snippet User accounts overview.csv',
        table: 'users',
        transform: (row) => ({
            ...row,
            // Add a default password hash for all users (password: admin123)
            password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aOAalWQl.Xa.SK6',
            is_active: row.is_active === 'true' || row.is_active === true,
            created_at: formatDate(row.created_at),
        }),
        columns: ['id', 'email', 'password_hash', 'role', 'name', 'is_active', 'created_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (1).csv',
        table: 'platform_accounts',
        transform: (row) => ({
            ...row,
            notes: row.notes === 'null' ? null : row.notes,
            created_at: formatDate(row.created_at),
        }),
        // Skip 'whatsapp' platform since MySQL schema doesn't support it
        filter: (row) => row.platform !== 'whatsapp',
        columns: ['id', 'platform', 'account_name', 'notes', 'created_by', 'created_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (2).csv',
        table: 'units',
        transform: (row) => ({
            ...row,
            platform_account_id: row.platform_account_id === 'null' ? null : row.platform_account_id,
            unit_code: row.unit_code === 'null' ? null : row.unit_code,
            city: row.city === 'null' ? null : row.city,
            address: row.address === 'null' ? null : row.address,
            capacity: row.capacity === 'null' ? null : parseInt(row.capacity) || null,
            readiness_group: row.readiness_group_id === 'null' ? null : row.readiness_group_id,
            created_at: formatDate(row.created_at),
            last_synced_at: row.last_synced_at === 'null' ? null : formatDate(row.last_synced_at),
        }),
        columns: ['id', 'platform_account_id', 'unit_name', 'unit_code', 'city', 'address', 'capacity', 'status', 'readiness_group', 'created_at', 'last_synced_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (3).csv',
        table: 'unit_calendars',
        transform: (row) => ({
            ...row,
            platform_account_id: row.platform_account_id === 'null' ? null : row.platform_account_id,
            is_primary: row.is_primary === 'true' || row.is_primary === true,
            created_at: formatDate(row.created_at),
        }),
        columns: ['id', 'unit_id', 'platform', 'platform_account_id', 'ical_url', 'is_primary', 'created_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (4).csv',
        table: 'reservations',
        transform: (row) => ({
            ...row,
            summary: row.summary === 'null' ? null : row.summary,
            raw_event: row.raw_event === 'null' ? null : row.raw_event,
            is_manual_edit: row.is_manually_edited === 'true',
            suspected_fake: false,
            last_synced_at: formatDate(row.last_synced_at),
            created_at: formatDate(row.created_at),
        }),
        columns: ['id', 'unit_id', 'platform', 'start_date', 'end_date', 'summary', 'raw_event', 'is_manual_edit', 'suspected_fake', 'last_synced_at', 'created_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (5).csv',
        table: 'maintenance_tickets',
        transform: (row) => ({
            ...row,
            description: row.description === 'null' ? null : row.description,
            priority: row.priority === 'null' ? null : row.priority,
            resolved_at: row.resolved_at === 'null' ? null : formatDate(row.resolved_at),
            created_at: formatDate(row.created_at),
        }),
        columns: ['id', 'unit_id', 'title', 'description', 'status', 'priority', 'created_by', 'created_at', 'resolved_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (6).csv',
        table: 'notifications',
        transform: (row) => ({
            ...row,
            unit_id: row.unit_id === 'null' ? null : row.unit_id,
            platform: row.platform === 'null' ? null : row.platform,
            maintenance_ticket_id: row.maintenance_ticket_id === 'null' ? null : row.maintenance_ticket_id,
            data: row.data === 'null' ? null : row.data,
            recipient_user_id: row.recipient_user_id === 'null' ? null : row.recipient_user_id,
            is_read: row.is_read === 'true' || row.is_read === true,
            created_at: formatDate(row.created_at),
        }),
        columns: ['id', 'type', 'unit_id', 'platform', 'maintenance_ticket_id', 'title', 'body', 'data', 'audience', 'recipient_user_id', 'is_read', 'created_at'],
    },
    {
        file: 'Supabase Snippet User accounts overview (7).csv',
        table: 'sync_logs',
        transform: (row) => ({
            ...row,
            message: row.message === 'null' ? null : row.message,
            details: row.details === 'null' ? null : row.details,
            run_at: formatDate(row.run_at),
        }),
        columns: ['id', 'run_at', 'status', 'message', 'units_processed', 'errors_count', 'details'],
    },
];

// Format PostgreSQL timestamp to MySQL datetime
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'null') return null;
    // Remove timezone info and convert to MySQL format
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Parse CSV content
function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }

    return rows;
}

// Parse a single CSV line handling quoted values
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

async function main() {
    const downloadsPath = 'C:\\Users\\Elsam\\Downloads';

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

    // Disable foreign key checks for import
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    for (const config of CSV_FILES) {
        const filePath = path.join(downloadsPath, config.file);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${config.file}`);
            continue;
        }

        console.log(`📥 Importing ${config.table}...`);

        const content = fs.readFileSync(filePath, 'utf-8');
        let rows = parseCSV(content);

        // Apply filter if exists
        if (config.filter) {
            rows = rows.filter(config.filter);
        }

        // Apply transform
        rows = rows.map(config.transform);

        // Clear existing data
        await connection.execute(`DELETE FROM ${config.table}`);

        // Insert rows
        let inserted = 0;
        for (const row of rows) {
            try {
                const values = config.columns.map(col => row[col] ?? null);
                const placeholders = config.columns.map(() => '?').join(', ');
                const sql = `INSERT INTO ${config.table} (${config.columns.join(', ')}) VALUES (${placeholders})`;

                await connection.execute(sql, values);
                inserted++;
            } catch (err) {
                console.log(`   ⚠️  Error inserting row: ${err.message}`);
            }
        }

        console.log(`   ✅ Inserted ${inserted}/${rows.length} rows\n`);
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🎉 Import completed!');
    console.log('\n📋 Summary:');

    // Show counts
    for (const config of CSV_FILES) {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${config.table}`);
        console.log(`   ${config.table}: ${rows[0].count} rows`);
    }

    await connection.end();
}

main().catch(console.error);


import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentals_dashboard',
    });

    try {
        // 1. Create table if not exists
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_system_permissions (
        id CHAR(36) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        system_id VARCHAR(50) NOT NULL,
        can_access TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_system (role, system_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log("Table 'role_system_permissions' ensured.");

        // 2. Clear existing permissions
        await connection.execute("TRUNCATE TABLE role_system_permissions");
        console.log("Existing permissions cleared.");

        // 3. Define permissions
        const permissions = [
            // Admin (Access to all business systems)
            { role: 'admin', system_id: 'rentals', can_access: 1 },
            { role: 'admin', system_id: 'accounting', can_access: 1 },
            { role: 'admin', system_id: 'hr', can_access: 1 },
            { role: 'admin', system_id: 'crm', can_access: 1 },
            // Settings is handled by code (super_admin only), but no harm adding explicitly as 0 or 1 if needed. code says settings is hardcoded false for everyone except super_admin.

            // HR Manager
            { role: 'hr_manager', system_id: 'hr', can_access: 1 },

            // Accountant
            { role: 'accountant', system_id: 'accounting', can_access: 1 },

            // Employee (Access to HR only)
            { role: 'employee', system_id: 'hr', can_access: 1 },

            // Maintenance Worker (Maybe no portal access? Or maybe just maintenance if that was a system?)
            // The portal page lists: rentals, accounting, hr, crm, settings.
            // Maintenance workers probably don't need any of these top-level systems in the portal.
            // They likely access a different dashboard or maybe just "Rentals" if they need unit info?
            // Let's give them nothing for now as per user request (they implied employee sees too much).
        ];

        // 4. Insert permissions
        for (const p of permissions) {
            await connection.execute(
                "INSERT INTO role_system_permissions (id, role, system_id, can_access) VALUES (?, ?, ?, ?)",
                [uuidv4(), p.role, p.system_id, p.can_access]
            );
        }
        console.log("Permissions seeded successfully.");

        // Verify
        const [rows] = await connection.execute("SELECT role, system_id, can_access FROM role_system_permissions ORDER BY role, system_id");
        console.table(rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

main();

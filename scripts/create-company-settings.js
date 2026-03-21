const mysql = require('mysql2/promise');

async function createTable() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentals_dashboard'
    });

    try {
        console.log('Creating company_settings table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS company_settings (
                id CHAR(36) PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                company_name_en VARCHAR(255),
                logo_url TEXT,
                primary_color VARCHAR(7) DEFAULT '#3B82F6',
                email VARCHAR(255),
                phone VARCHAR(50),
                mobile VARCHAR(50),
                website VARCHAR(255),
                address TEXT,
                city VARCHAR(100),
                country VARCHAR(100) DEFAULT 'Saudi Arabia',
                postal_code VARCHAR(20),
                tax_number VARCHAR(50),
                commercial_registration VARCHAR(50),
                default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
                invoice_footer TEXT,
                invoice_notes TEXT,
                bank_name VARCHAR(255),
                bank_account VARCHAR(100),
                iban VARCHAR(50),
                swift_code VARCHAR(20),
                smtp_host VARCHAR(255),
                smtp_port INT DEFAULT 587,
                smtp_username VARCHAR(255),
                smtp_password VARCHAR(255),
                smtp_from_email VARCHAR(255),
                smtp_from_name VARCHAR(255),
                next_invoice_number INT DEFAULT 1,
                next_payment_number INT DEFAULT 1,
                invoice_number_prefix VARCHAR(20) DEFAULT 'INV',
                payment_number_prefix VARCHAR(20) DEFAULT 'PAY',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Table created successfully!');

        // Insert default row
        const [existing] = await conn.execute('SELECT id FROM company_settings LIMIT 1');
        if (existing.length === 0) {
            const { v4: uuidv4 } = require('uuid');
            await conn.execute(
                "INSERT INTO company_settings (id, company_name, company_name_en, country) VALUES (?, 'شركتي', 'My Company', 'Saudi Arabia')",
                [uuidv4()]
            );
            console.log('Default row inserted!');
        } else {
            console.log('Default row already exists, skipping insert.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await conn.end();
    }
}

createTable();

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    const id = "823a86a8-fc67-11f0-b2c4-04bf1b3fe074";

    try {
        console.log("Testing UPDATE query...");
        const sql = `UPDATE hr_employees SET
        user_id = ?,
        employee_number = ?,
        full_name = ?,
        national_id = ?,
        phone = ?,
        email = ?,
        department = ?,
        job_title = ?,
        hire_date = ?,
        contract_type = ?,
        basic_salary = ?,
        housing_allowance = ?,
        transport_allowance = ?,
        other_allowances = ?,
        annual_leave_balance = ?,
        sick_leave_balance = ?,
        bank_name = ?,
        iban = ?,
        status = ?,
        shift_id = ?,
        exclude_from_payroll = ?
      WHERE id = ?`;
        
        const params = [
            null, null, "Test Name", null, null, null, null, null, null, "full_time",
            0, 0, 0, 0, 21, 30, null, null, "active", null, 0, id
        ];

        const [result] = await connection.execute(sql, params);
        console.log("Update success:", result);

    } catch (error) {
        console.error("Update failed:", error);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);

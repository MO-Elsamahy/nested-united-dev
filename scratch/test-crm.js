const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    const customerId = "f659b7e6-f615-40f3-956a-8fb523259d7b";
    const dealId = uuidv4();
    const adminId = "1515563a-25dd-49f1-9cce-113b4f8d598e"; 

    try {
        console.log("--- CRM Workflow Test ---");

        // 1. Create a deal
        console.log("1. Creating a new deal...");
        await connection.execute(
            `INSERT INTO crm_deals (id, customer_id, title, notes, stage, value, status, priority)
             VALUES (?, ?, ?, ?, ?, ?, 'open', 'high')`,
            [dealId, customerId, "اختبار صفقة جديدة", "ملاحظات الاختبار", "new", 5000]
        );

        // 2. Move stage to 'proposal'
        console.log("2. Moving stage to 'proposal'...");
        await connection.execute(
            "UPDATE crm_deals SET stage = 'proposal' WHERE id = ?",
            [dealId]
        );
        // Log the activity manually (simulating API logic)
        await connection.execute(
            `INSERT INTO crm_activities (id, customer_id, deal_id, type, title, description, performed_by)
             VALUES (?, ?, ?, 'status_change', 'تغيير مرحلة', ?, ?)`,
            [uuidv4(), customerId, dealId, "تم تغيير حالة الصفقة من new إلى proposal", adminId]
        );

        // 3. Add a manual note activity
        console.log("3. Adding a manual note activity...");
        await connection.execute(
            `INSERT INTO crm_activities (id, customer_id, deal_id, type, title, description, performed_by)
             VALUES (?, ?, ?, 'note', 'ملاحظة اختبار', ?, ?)`,
            [uuidv4(), customerId, dealId, "هذه ملاحظة مضافة برمجياً لاختبار النظام", adminId]
        );

        // 4. Verification
        console.log("4. Verifying database state...");
        const [deal] = await connection.execute("SELECT * FROM crm_deals WHERE id = ?", [dealId]);
        console.log("Deal State:", deal[0]);

        const [activities] = await connection.execute("SELECT * FROM crm_activities WHERE deal_id = ?", [dealId]);
        console.log("Activities Count:", activities.length);
        activities.forEach((a, i) => console.log(`  [${i+1}] ${a.title}: ${a.description}`));

        // Cleanup (optional, but good to keep DB clean if it's a real test)
        // console.log("Cleaning up test data...");
        // await connection.execute("DELETE FROM crm_activities WHERE deal_id = ?", [dealId]);
        // await connection.execute("DELETE FROM crm_deals WHERE id = ?", [dealId]);

    } catch (error) {
        console.error("Error during CRM test:", error);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);

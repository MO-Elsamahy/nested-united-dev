const { query } = require("../lib/db");

async function check() {
    try {
        const perms = await query("SELECT * FROM role_system_permissions WHERE system_id = 'hr'");
        console.log("HR Permissions:", perms);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();

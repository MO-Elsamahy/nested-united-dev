import fs from 'fs';
import { query } from "./lib/db";

// Load .env.local
try {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.log("Could not load .env.local");
}

async function check() {
  try {
    const users = await query("SELECT id, email, role, is_active, password_hash FROM users WHERE email = ?", ["admin@rentals.com"]);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();

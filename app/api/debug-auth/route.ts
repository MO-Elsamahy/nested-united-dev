import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

// This is a temporary debug endpoint - remove after testing
export async function GET() {
    try {
        // Get first user
        const user = await queryOne<any>("SELECT id, email, password_hash, is_active FROM users LIMIT 1");

        if (!user) {
            return NextResponse.json({ error: "No users found" }, { status: 404 });
        }

        // Test password hash
        const testPassword = "admin123";
        const expectedHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aOAalWQl.Xa.SK6";

        // Test bcrypt compare
        const isValidWithStoredHash = user.password_hash
            ? await bcrypt.compare(testPassword, user.password_hash)
            : false;
        const isValidWithExpectedHash = await bcrypt.compare(testPassword, expectedHash);

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                password_hash_exists: !!user.password_hash,
                password_hash_length: user.password_hash?.length || 0,
                password_hash_preview: user.password_hash?.substring(0, 20) + "...",
                is_active: user.is_active,
            },
            tests: {
                storedHashValid: isValidWithStoredHash,
                expectedHashValid: isValidWithExpectedHash,
            },
            expectedHash: expectedHash,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

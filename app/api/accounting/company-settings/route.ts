import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { CompanySettings } from "@/lib/types/accounting";
import { User } from "@/lib/types/database";

// GET /api/accounting/company-settings - Get company settings
export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const settings = await query<CompanySettings>("SELECT * FROM company_settings LIMIT 1");

        if (!settings || settings.length === 0) {
            return NextResponse.json({ error: "Company settings not found" }, { status: 404 });
        }

        // Don't send SMTP password to frontend
        const safeSettings = { ...settings[0] };
        delete safeSettings.smtp_password;

        return NextResponse.json(safeSettings);
    } catch (error: unknown) {
        console.error("Error fetching company settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch company settings", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

// PUT /api/accounting/company-settings - Update company settings
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is super admin
        const users = await query<User>("SELECT role FROM users WHERE id = ?", [session.user.id]);
        if (!users || users.length === 0 || users[0].role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden. Only super admins can update company settings." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            company_name,
            company_name_en,
            logo_url,
            primary_color,
            email,
            phone,
            mobile,
            website,
            address,
            city,
            country,
            postal_code,
            tax_number,
            commercial_registration,
            default_payment_terms,
            invoice_footer,
            invoice_notes,
            bank_name,
            bank_account,
            iban,
            swift_code,
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            smtp_from_email,
            smtp_from_name,
            invoice_number_prefix,
            payment_number_prefix,
        } = body;

        // Get existing settings
        const existing = await query<CompanySettings>("SELECT * FROM company_settings LIMIT 1");

        if (!existing || existing.length === 0) {
            return NextResponse.json(
                { error: "Company settings not found. Please contact support." },
                { status: 404 }
            );
        }

        const settingsId = existing[0].id;

        // Build update query dynamically to only update provided fields
        const updates: string[] = [];
        const values: (string | number | boolean | null)[] = [];

        if (company_name !== undefined) { updates.push("company_name = ?"); values.push(company_name); }
        if (company_name_en !== undefined) { updates.push("company_name_en = ?"); values.push(company_name_en); }
        if (logo_url !== undefined) { updates.push("logo_url = ?"); values.push(logo_url); }
        if (primary_color !== undefined) { updates.push("primary_color = ?"); values.push(primary_color); }
        if (email !== undefined) { updates.push("email = ?"); values.push(email); }
        if (phone !== undefined) { updates.push("phone = ?"); values.push(phone); }
        if (mobile !== undefined) { updates.push("mobile = ?"); values.push(mobile); }
        if (website !== undefined) { updates.push("website = ?"); values.push(website); }
        if (address !== undefined) { updates.push("address = ?"); values.push(address); }
        if (city !== undefined) { updates.push("city = ?"); values.push(city); }
        if (country !== undefined) { updates.push("country = ?"); values.push(country); }
        if (postal_code !== undefined) { updates.push("postal_code = ?"); values.push(postal_code); }
        if (tax_number !== undefined) { updates.push("tax_number = ?"); values.push(tax_number); }
        if (commercial_registration !== undefined) { updates.push("commercial_registration = ?"); values.push(commercial_registration); }
        if (default_payment_terms !== undefined) { updates.push("default_payment_terms = ?"); values.push(default_payment_terms); }
        if (invoice_footer !== undefined) { updates.push("invoice_footer = ?"); values.push(invoice_footer); }
        if (invoice_notes !== undefined) { updates.push("invoice_notes = ?"); values.push(invoice_notes); }
        if (bank_name !== undefined) { updates.push("bank_name = ?"); values.push(bank_name); }
        if (bank_account !== undefined) { updates.push("bank_account = ?"); values.push(bank_account); }
        if (iban !== undefined) { updates.push("iban = ?"); values.push(iban); }
        if (swift_code !== undefined) { updates.push("swift_code = ?"); values.push(swift_code); }
        if (smtp_host !== undefined) { updates.push("smtp_host = ?"); values.push(smtp_host); }
        if (smtp_port !== undefined) { updates.push("smtp_port = ?"); values.push(smtp_port); }
        if (smtp_username !== undefined) { updates.push("smtp_username = ?"); values.push(smtp_username); }
        if (smtp_password !== undefined) { updates.push("smtp_password = ?"); values.push(smtp_password); }
        if (smtp_from_email !== undefined) { updates.push("smtp_from_email = ?"); values.push(smtp_from_email); }
        if (smtp_from_name !== undefined) { updates.push("smtp_from_name = ?"); values.push(smtp_from_name); }
        if (invoice_number_prefix !== undefined) { updates.push("invoice_number_prefix = ?"); values.push(invoice_number_prefix); }
        if (payment_number_prefix !== undefined) { updates.push("payment_number_prefix = ?"); values.push(payment_number_prefix); }
        if (body.invoice_type_label !== undefined) { updates.push("invoice_type_label = ?"); values.push(body.invoice_type_label); }
        if (body.invoice_terms !== undefined) { updates.push("invoice_terms = ?"); values.push(body.invoice_terms); }

        if (updates.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        updates.push("updated_at = NOW()");
        values.push(settingsId);

        const sql = `UPDATE company_settings SET ${updates.join(", ")} WHERE id = ?`;
        await query(sql, values);

        // Fetch updated settings
        const updated = await query<CompanySettings>("SELECT * FROM company_settings WHERE id = ?", [settingsId]);
        const safeSettings = { ...updated[0] };
        delete safeSettings.smtp_password;

        return NextResponse.json(safeSettings);
    } catch (error: unknown) {
        console.error("Error updating company settings:", error);
        return NextResponse.json(
            { error: "Failed to update company settings", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

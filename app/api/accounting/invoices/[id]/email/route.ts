import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { AccountingInvoice, CompanySettings } from "@/lib/types/accounting";

interface _RouteParams {
    params: { id: string };
}

// POST /api/accounting/invoices/[id]/email - Send invoice via email
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;
        const body = await req.json();
        const { to, subject, message } = body;

        // Get invoice
        const invoices = await query<AccountingInvoice & { partner_name: string, partner_email: string }>(
            `SELECT i.*, p.name as partner_name, p.email as partner_email
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ? AND i.deleted_at IS NULL`,
            [invoiceId]
        );

        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const invoice = invoices[0];

        // Get company settings for SMTP
        const companySettings = await query<CompanySettings>("SELECT * FROM company_settings LIMIT 1");
        if (!companySettings || companySettings.length === 0) {
            return NextResponse.json(
                { error: "Company settings not found. Please configure SMTP settings first." },
                { status: 400 }
            );
        }

        const company = companySettings[0];

        // Check if SMTP is configured
        if (!company.smtp_host || !company.smtp_username || !company.smtp_password) {
            return NextResponse.json(
                { error: "SMTP not configured. Please configure email settings in company settings." },
                { status: 400 }
            );
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: company.smtp_host,
            port: company.smtp_port || 587,
            secure: company.smtp_port === 465,
            auth: {
                user: company.smtp_username,
                pass: company.smtp_password,
            },
        });

        // Recipient email
        const recipientEmail = to || invoice.partner_email;
        if (!recipientEmail) {
            return NextResponse.json(
                { error: "No recipient email address found" },
                { status: 400 }
            );
        }

        // Email subject and body
        const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${company.company_name}`;
        const emailBody = message || `
Dear ${invoice.partner_name},

Please find attached invoice ${invoice.invoice_number}.

Invoice Date: ${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "-"}
Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}
Total Amount: SAR ${Number(invoice.total_amount).toLocaleString()}

${company.invoice_footer || "Thank you for your business!"}

Best regards,
${company.company_name}
        `;

        // Generate PDF URL for attachment (in production, attach the actual PDF)
        const pdfUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/accounting/invoices/${invoiceId}/pdf`;

        // Send email
        await transporter.sendMail({
            from: `"${company.smtp_from_name || company.company_name}" <${company.smtp_from_email || company.smtp_username}>`,
            to: recipientEmail,
            subject: emailSubject,
            text: emailBody,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <pre style="white-space: pre-wrap;">${emailBody}</pre>
                    <p style="margin-top: 20px;">
                        <a href="${pdfUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Download Invoice PDF
                        </a>
                    </p>
                </div>
            `,
        });

        return NextResponse.json({
            message: "Email sent successfully",
            recipient: recipientEmail,
        });
    } catch (error: unknown) {
        console.error("Error sending email:", error);
        return NextResponse.json(
            { error: "Failed to send email", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

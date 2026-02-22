import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
    params: { id: string };
}

// POST /api/accounting/invoices/[id]/confirm - Confirm invoice and create journal entry
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        // Get invoice with lines
        const invoices: any = await query(
            "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL",
            [invoiceId]
        );

        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const invoice = invoices[0];

        // Check if already confirmed
        if (invoice.state !== "draft") {
            return NextResponse.json(
                { error: "Invoice is already confirmed or cancelled" },
                { status: 400 }
            );
        }

        // Get invoice lines
        const lines: any = await query(
            "SELECT * FROM accounting_invoice_lines WHERE invoice_id = ?",
            [invoiceId]
        );

        if (!lines || lines.length === 0) {
            return NextResponse.json(
                { error: "Invoice has no lines" },
                { status: 400 }
            );
        }

        // Get appropriate journal (Sales or Purchase)
        const journalType = invoice.invoice_type === "customer_invoice" || invoice.invoice_type === "credit_note"
            ? "sale"
            : "purchase";

        const journals: any = await query(
            "SELECT * FROM accounting_journals WHERE type = ? AND deleted_at IS NULL LIMIT 1",
            [journalType]
        );

        if (!journals || journals.length === 0) {
            return NextResponse.json(
                { error: `No ${journalType} journal found. Please create one first.` },
                { status: 400 }
            );
        }

        const journal = journals[0];

        // Get default accounts based on invoice type
        // For customer invoice: Debit Receivable, Credit Revenue
        // For supplier bill: Debit Expense, Credit Payable

        const receivableAccounts: any = await query(
            "SELECT * FROM accounting_accounts WHERE type = 'asset_receivable' AND deleted_at IS NULL LIMIT 1"
        );

        const payableAccounts: any = await query(
            "SELECT * FROM accounting_accounts WHERE type = 'liability_payable' AND deleted_at IS NULL LIMIT 1"
        );

        const incomeAccounts: any = await query(
            "SELECT * FROM accounting_accounts WHERE type = 'income' AND deleted_at IS NULL LIMIT 1"
        );

        const expenseAccounts: any = await query(
            "SELECT * FROM accounting_accounts WHERE type = 'expense' OR type = 'cost_of_sales' ORDER BY FIELD(type, 'cost_of_sales', 'expense') LIMIT 1"
        );

        const taxAccounts: any = await query(
            "SELECT * FROM accounting_accounts WHERE type = 'liability_current' AND code LIKE '22%' AND deleted_at IS NULL LIMIT 1"
        );

        if (invoice.invoice_type === "customer_invoice" && (!receivableAccounts || receivableAccounts.length === 0)) {
            return NextResponse.json(
                { error: "No receivable account found. Please create an 'Accounts Receivable' account first." },
                { status: 400 }
            );
        }

        if (invoice.invoice_type === "supplier_bill" && (!payableAccounts || payableAccounts.length === 0)) {
            return NextResponse.json(
                { error: "No payable account found. Please create an 'Accounts Payable' account first." },
                { status: 400 }
            );
        }

        // Create accounting move (journal entry)
        const moveId = uuidv4();
        const moveRef = `Invoice: ${invoice.invoice_number}`;

        await query(
            `INSERT INTO accounting_moves (
                id, journal_id, date, ref, narration, state,
                partner_id, amount_total, created_by
            ) VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?)`,
            [
                moveId,
                journal.id,
                invoice.invoice_date,
                moveRef,
                invoice.notes || `Confirmed invoice ${invoice.invoice_number}`,
                invoice.partner_id,
                invoice.total_amount,
                session.user.id,
            ]
        );

        // Create move lines (double entry)
        if (invoice.invoice_type === "customer_invoice") {
            // Debit: Accounts Receivable (Full Amount)
            await query(
                `INSERT INTO accounting_move_lines (
                    id, move_id, account_id, partner_id, name,
                    debit, credit, date_maturity
                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                [
                    uuidv4(),
                    moveId,
                    receivableAccounts[0].id,
                    invoice.partner_id,
                    `Invoice ${invoice.invoice_number}`,
                    invoice.total_amount,
                    invoice.due_date,
                ]
            );

            // Credit: Revenue accounts (Net Amount) + Tax (Tax Amount)
            for (const line of lines) {
                const revenueAccountId = line.account_id || (incomeAccounts.length > 0 ? incomeAccounts[0].id : null);

                if (revenueAccountId) {
                    // 1. Credit Revenue (Net amount)
                    await query(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
                        [
                            uuidv4(),
                            moveId,
                            revenueAccountId,
                            invoice.partner_id,
                            line.description,
                            line.line_total, // Net amount
                        ]
                    );

                    // 2. Credit VAT (if applicable)
                    if (Number(line.tax_amount) > 0 && taxAccounts.length > 0) {
                        await query(
                            `INSERT INTO accounting_move_lines (
                                id, move_id, account_id, partner_id, name,
                                debit, credit
                            ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
                            [
                                uuidv4(),
                                moveId,
                                taxAccounts[0].id,
                                invoice.partner_id,
                                `VAT ${line.tax_rate}% - ${line.description}`,
                                line.tax_amount,
                            ]
                        );
                    }
                }
            }
        } else if (invoice.invoice_type === "supplier_bill") {
            // Debit: Expense accounts (Net Amount) + Tax Receivable? (For now simplify: Debit Expense with Total or Split)
            // Simplified: Debit Expense (Net) + Debit VAT (Tax)

            for (const line of lines) {
                const expenseAccountId = line.account_id || (expenseAccounts.length > 0 ? expenseAccounts[0].id : null);

                if (expenseAccountId) {
                    // 1. Debit Expense (Net)
                    await query(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                        [
                            uuidv4(),
                            moveId,
                            expenseAccountId,
                            invoice.partner_id,
                            line.description,
                            line.line_total,
                        ]
                    );

                    // 2. Debit VAT (Input Tax) - allowing claim check
                    // Ideally this goes to a Tax Receivable account, but using same Tax account as debit for now (claiming back)
                    if (Number(line.tax_amount) > 0 && taxAccounts.length > 0) {
                        await query(
                            `INSERT INTO accounting_move_lines (
                                id, move_id, account_id, partner_id, name,
                                debit, credit
                            ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                            [
                                uuidv4(),
                                moveId,
                                taxAccounts[0].id,
                                invoice.partner_id,
                                `VAT Input ${line.tax_rate}% - ${line.description}`,
                                line.tax_amount,
                            ]
                        );
                    }
                }
            }

            // Credit: Accounts Payable
            await query(
                `INSERT INTO accounting_move_lines (
                    id, move_id, account_id, partner_id, name,
                    debit, credit, date_maturity
                ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
                [
                    uuidv4(),
                    moveId,
                    payableAccounts[0].id,
                    invoice.partner_id,
                    `Bill ${invoice.invoice_number}`,
                    invoice.total_amount,
                    invoice.due_date,
                ]
            );
        }

        // Update invoice to confirmed state and link to accounting move
        await query(
            `UPDATE accounting_invoices SET
                state = 'confirmed',
                accounting_move_id = ?,
                journal_id = ?,
                updated_at = NOW()
             WHERE id = ?`,
            [moveId, journal.id, invoiceId]
        );

        // Fetch updated invoice
        const updated: any = await query(
            `SELECT i.*, p.name as partner_name
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ?`,
            [invoiceId]
        );

        return NextResponse.json({
            message: "Invoice confirmed successfully",
            invoice: updated[0],
            accounting_move_id: moveId,
        });
    } catch (error: any) {
        console.error("Error confirming invoice:", error);
        return NextResponse.json(
            { error: "Failed to confirm invoice", details: error.message },
            { status: 500 }
        );
    }
}

import { PoolClient } from 'pg';
import { PaymentType, InvoiceStatus } from '../constants/payment.ts';

export interface PaymentRecord {
    event_id: string;
    invoice_id: string;
    amount_cents: number;
    type: PaymentType;
}

export interface InvoiceRecord {
    id: string;
    total_cents: number;
    status: InvoiceStatus;
}

export class PaymentRepository {
    constructor(private client: PoolClient) {}

    async getInvoiceById(invoiceId: string): Promise<InvoiceRecord | null> {
        const res = await this.client.query(
            'SELECT id, total_cents, status FROM invoices WHERE id = $1 FOR UPDATE',
            [invoiceId]
        );
        return res.rowCount === 0 ? null : (res.rows[0] as InvoiceRecord);
    }

    async insertPayment(payment: PaymentRecord): Promise<PaymentRecord | null> {
        const res = await this.client.query(
            `INSERT INTO payments(event_id, invoice_id, amount_cents, type)
             VALUES ($1,$2,$3,$4)
                 ON CONFLICT (event_id) DO NOTHING
             RETURNING *`,
            [payment.event_id, payment.invoice_id, payment.amount_cents, payment.type]
        );
        return res.rowCount === 0 ? null : (res.rows[0] as PaymentRecord);
    }

    async getTotalPaid(invoiceId: string): Promise<number> {
        const res = await this.client.query(
            'SELECT SUM(amount_cents) as total_paid FROM payments WHERE invoice_id = $1',
            [invoiceId]
        );
        return Number(res.rows[0].total_paid || 0);
    }

    async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
        await this.client.query(
            'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, invoiceId]
        );
    }
}

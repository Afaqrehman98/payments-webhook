import { withTx } from '../utils/tx.ts';
import { PaymentPayload } from '../types/paymentTypes.ts';
import { NotFoundError, BadRequestError } from '../errors/customErrors.ts';
import { PaymentType, InvoiceStatus } from '../constants/payment.ts';
import { PaymentRepository } from '../repositories/PaymentRepository.ts';

export class PaymentService {
    constructor() {}

    async checkPaymentExists(eventId: string): Promise<boolean> {
        return await withTx(async (client) => {
            const repo = new PaymentRepository(client);
            return await repo.paymentExists(eventId);
        });
    }

    async checkInvoiceExists(invoiceId: string): Promise<boolean> {
        return await withTx(async (client) => {
            const repo = new PaymentRepository(client);
            const invoice = await repo.getInvoiceById(invoiceId);
            return invoice !== null;
        });
    }

    async handlePayment(payload: PaymentPayload) {
        const { event_id, invoice_id, amount_cents } = payload;

        if (!invoice_id || !event_id) throw new BadRequestError('Missing required fields');
        if (amount_cents <= 0) throw new BadRequestError('Amount must be positive');

        return await withTx(async (client) => {
            // Instantiate repository with transaction client
            const repo = new PaymentRepository(client);

            const invoice = await repo.getInvoiceById(invoice_id);
            if (!invoice) throw new NotFoundError('Invoice not found');

            const inserted = await repo.insertPayment({
                event_id,
                invoice_id,
                amount_cents,
                type: PaymentType.PaymentReceived,
            });

            if (!inserted) return { status: 200, message: 'Payment already processed' };

            const totalPaid = await repo.getTotalPaid(invoice_id);

            let newStatus: InvoiceStatus = InvoiceStatus.Sent;
            if (totalPaid >= invoice.total_cents) newStatus = InvoiceStatus.Paid;
            else if (totalPaid > 0) newStatus = InvoiceStatus.PartiallyPaid;

            await repo.updateInvoiceStatus(invoice_id, newStatus);

            return { status: 201, message: 'Payment processed' };
        });
    }
}

import { z } from 'zod';

export const paymentSchema = z.object({
    event_id: z.string().min(1),
    type: z.enum(['payment_received']),
    invoice_id: z.string().uuid(),
    amount_cents: z.number().int().positive(),
});

export type PaymentPayload = z.infer<typeof paymentSchema>;

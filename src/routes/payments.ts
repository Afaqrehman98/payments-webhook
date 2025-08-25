import { FastifyInstance } from 'fastify';
import { paymentSchema } from '../types/paymentTypes.ts';
import { validateBody } from '../middleware/validation.ts';
import { paymentQueue } from '../worker/paymentActor.ts';
import { BadRequestError, NotFoundError } from '../errors/customErrors.ts';
import { PaymentService } from '../services/PaymentService.ts';

export default async function paymentsRoute(fastify: FastifyInstance) {
    fastify.post('/webhooks/payments', {
        preHandler: validateBody(paymentSchema)
    }, async (request, reply) => {
        try {
            const payload = request.validatedBody!;

            const paymentService = new PaymentService();

            // Check for duplicate payment event
            const existingPayment = await paymentService.checkPaymentExists(payload.event_id);

            if (existingPayment) {
                return reply.status(409).send({
                    error: `Payment with event_id ${payload.event_id} already processed`,
                    type: 'duplicate_event',
                    event_id: payload.event_id
                });
            }

            // Pre-validate invoice exists (as required by test for 4xx responses)
            const invoiceExists = await paymentService.checkInvoiceExists(payload.invoice_id);

            if (!invoiceExists) {
                return reply.status(404).send({
                    error: `Invoice ${payload.invoice_id} not found`,
                    type: 'not_found'
                });
            }

            // Enqueue for async processing
            paymentQueue.enqueue(payload);

            return reply.status(202).send({
                message: 'Payment queued for processing',
                event_id: payload.event_id
            });

        } catch (error: unknown) {
            if (error instanceof BadRequestError) {
                return reply.status(400).send({
                    error: error.message,
                    type: 'validation_error'
                });
            }
            if (error instanceof NotFoundError) {
                return reply.status(404).send({
                    error: error.message,
                    type: 'not_found'
                });
            }

            fastify.log.error(
                `Unexpected error in payment route: ${error instanceof Error ? error.stack || error.message : String(error)}`
            );

            return reply.status(500).send({
                error: 'Internal server error',
                type: 'server_error'
            });
        }
    });
}

import { FastifyInstance } from 'fastify';
import { paymentSchema } from '../types/paymentTypes.ts';
import { validateBody } from '../middleware/validation.ts';
import { paymentQueue } from '../worker/paymentActor.ts';
import { PaymentRepository } from '../repositories/paymentRepository.ts';
import { BadRequestError, NotFoundError } from '../errors/customErrors.ts';
import { withTx } from '../utils/tx.ts';

export default async function paymentsRoute(fastify: FastifyInstance) {
    fastify.post('/webhooks/payments', {
        preHandler: validateBody(paymentSchema)
    }, async (request, reply) => {
        try {
            const payload = request.validatedBody!;

            // Run a lightweight pre-check in a transaction just to validate invoice
            const invoiceExists = await withTx(async client => {
                const repo = new PaymentRepository(client);
                const invoice = await repo.getInvoiceById(payload.invoice_id);
                return invoice !== null;
            });

            if (!invoiceExists) {
                throw new NotFoundError(`Invoice ${payload.invoice_id} not found`);
            }

            // Check if this event has already been processed
            if (paymentQueue.isEventProcessed(payload.event_id)) {
                return reply.status(200).send({
                    message: 'Payment already processed',
                    event_id: payload.event_id
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

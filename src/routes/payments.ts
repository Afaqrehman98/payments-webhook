import {FastifyInstance} from 'fastify';
import {paymentSchema} from '../types/paymentTypes.ts';
import {validateBody} from '../middleware/validation.ts';
import {paymentQueue} from '../worker/paymentActor.ts';

export default async function paymentsRoute(fastify: FastifyInstance) {
    fastify.post('/webhooks/payments', {
        preHandler: validateBody(paymentSchema)
    }, async (request, reply) => {
        try {
            const payload = request.validatedBody!;
            // Enqueue for async processing
            paymentQueue.enqueue(payload);
            // Immediately return 202 Accepted
            return reply.status(202).send({ message: 'Payment queued for processing' });
        } catch (error) {
            fastify.log.error('Error in payment route:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
}

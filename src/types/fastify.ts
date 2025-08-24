import 'fastify';
import { PaymentPayload } from './paymentTypes.js';

declare module 'fastify' {
    interface FastifyRequest {
        validatedBody?: PaymentPayload;
    }
}

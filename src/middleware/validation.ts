import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = schema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.format() });
        }
        // Attach validated data to request for use in route handler
        (request as any).validatedBody = parseResult.data;
    };
}

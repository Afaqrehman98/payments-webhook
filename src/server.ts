import 'dotenv/config';
import Fastify from 'fastify';
import './types/fastify.ts';
import paymentsRoute from './routes/payments.ts';

const fastify = Fastify({ logger: true });

fastify.register(paymentsRoute);

const start = async () => {
    try {
        const port = process.env.PORT ? Number(process.env.PORT) : 3000;
        const address = await fastify.listen({ port });
        console.log(`🚀 Server listening at ${address}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

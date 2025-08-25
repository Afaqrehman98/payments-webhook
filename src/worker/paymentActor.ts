import { PaymentPayload } from '../types/paymentTypes.ts';
import { ServiceFactory } from '../services/ServiceFactory.ts';
import { EventQueue } from '../queue/eventQueue.ts';

export const paymentQueue = new EventQueue<PaymentPayload>(async (payload) => {
    const paymentService = ServiceFactory.getPaymentService();
    const result = await paymentService.handlePayment(payload);
    console.log('Processed payment event:', payload.event_id, result);
});

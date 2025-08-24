import { PaymentService } from './paymentService.ts';

// Service factory for centralized service management
export class ServiceFactory {
    private static paymentService: PaymentService;

    static getPaymentService(): PaymentService {
        if (!this.paymentService) {
            this.paymentService = new PaymentService();
        }
        return this.paymentService;
    }

}

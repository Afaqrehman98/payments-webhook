type EventHandler<T> = (payload: T) => Promise<void>;

export class EventQueue<T> {
    private queue: T[] = [];
    private processing = false;
    private handler: EventHandler<T>;

    constructor(handler: EventHandler<T>) {
        this.handler = handler;
    }

    enqueue(event: T) {
        this.queue.push(event);
        this.processNext();
    }

    private async processNext() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const event = this.queue.shift()!;
        try {
            await this.handler(event);
        } catch (err) {
            console.error('Error processing event:', err);
        } finally {
            this.processing = false;
            // Process next event in queue
            if (this.queue.length > 0) {
                this.processNext();
            }
        }
    }
}
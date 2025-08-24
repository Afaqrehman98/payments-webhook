type EventHandler<T> = (payload: T) => Promise<void>;

export class EventQueue<T> {
    private queue: T[] = [];
    private processing = false;
    private handler: EventHandler<T>;
    private processedEvents: Set<string> = new Set(); // Track processed event IDs

    constructor(handler: EventHandler<T>) {
        this.handler = handler;
    }

    enqueue(event: T) {
        // Check if this event has already been processed
        const eventId = this.getEventId(event);
        if (this.processedEvents.has(eventId)) {
            console.log(`Event ${eventId} already processed, skipping`);
            return; // Don't queue duplicate events
        }

        this.queue.push(event);
        this.processNext();
    }

    private getEventId(event: T): string {
        // Extract event_id from the event payload
        // This assumes all events have an event_id property
        return (event as any).event_id || 'unknown';
    }

    private async processNext() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const event = this.queue.shift()!;
        const eventId = this.getEventId(event);
        
        try {
            await this.handler(event);
            // Mark event as processed
            this.processedEvents.add(eventId);
            console.log(`Event ${eventId} processed successfully`);
        } catch (err) {
            console.error(`Error processing event ${eventId}:`, err);
            // Don't mark as processed if it failed
            // Could implement retry logic here
        } finally {
            this.processing = false;
            // Process next event in queue
            if (this.queue.length > 0) {
                this.processNext();
            }
        }
    }

    // Method to check if an event has been processed
    isEventProcessed(eventId: string): boolean {
        return this.processedEvents.has(eventId);
    }

    // Method to get queue statistics
    getQueueStats() {
        return {
            queueLength: this.queue.length,
            processedCount: this.processedEvents.size,
            isProcessing: this.processing
        };
    }
}
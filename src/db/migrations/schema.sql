-- invoices table
CREATE TABLE IF NOT EXISTS invoices (
                                        id UUID PRIMARY KEY,
                                        total_cents INTEGER NOT NULL CHECK (total_cents > 0),
    status TEXT NOT NULL CHECK (status IN ('sent','partially_paid','paid')) DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- payments table
CREATE TABLE IF NOT EXISTS payments (
                                        event_id TEXT PRIMARY KEY,
                                        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    type TEXT NOT NULL CHECK (type IN ('payment_received')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- event queue table
CREATE TABLE IF NOT EXISTS payment_events_queue (
                                                    event_id TEXT PRIMARY KEY,
                                                    payload JSONB NOT NULL,
                                                    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT NULL
    );

-- auto-NOTIFY trigger for the queue (wakes workers)
CREATE OR REPLACE FUNCTION notify_payment_events() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('payment_events', NEW.event_id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_payment_events ON payment_events_queue;
CREATE TRIGGER trg_notify_payment_events
    AFTER INSERT ON payment_events_queue
    FOR EACH ROW EXECUTE FUNCTION notify_payment_events();

-- helpful index
CREATE INDEX IF NOT EXISTS idx_payment_events_queue_unprocessed
    ON payment_events_queue (processed_at, enqueued_at);

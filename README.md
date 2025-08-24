# Payments Webhook Service

A robust, production-ready webhook service for processing payment events with asynchronous processing, built with TypeScript, Fastify, and PostgreSQL. Features a clean, object-oriented architecture with proper separation of concerns.

## 🚀 Features

- **Single Endpoint**: `POST /webhooks/payments` for payment event processing
- **Idempotency**: Prevents duplicate payment processing via database constraints
- **Status Management**: Automatic invoice status transitions (sent → partially_paid → paid)
- **Transaction Safety**: All database operations wrapped in ACID transactions
- **Async Processing**: Event queue/actor pattern for scalable processing
- **Input Validation**: Robust schema validation using Zod
- **Type Safety**: Full TypeScript implementation with proper types
- **Error Handling**: Comprehensive error handling with custom error classes
- **Clean Architecture**: Repository pattern with service layer and dependency injection
- **Object-Oriented Design**: Consistent OOP patterns throughout the codebase

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webhook      │───▶│   Validation    │───▶│   Idempotency   │
│   Request      │    │   Middleware    │    │     Check       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Route Logic   │
                                              │   (Duplicate?)  │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────┬─────────────────┐
                                    │                 │                 │
                                    ▼                 ▼                 ▼
                           ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                           │  200 OK    │  │  202 Acc.  │  │  500 Error │
                           │  Already   │  │  Queued    │  │  Server    │
                           │ Processed  │  │             │  │  Error     │
                           └─────────────┘  └─────────────┘  └─────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Event Queue   │
                                              │   (Background)  │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Payment      │
                                              │   Service      │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Repository   │
                                              │   (Data Layer) │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Database     │
                                              │   Transaction  │
                                              └─────────────────┘
```

**Key Flow:**
1. **Request received** → Validated → **Idempotency check**
2. **If duplicate**: Immediate **200 OK** response
3. **If new**: **202 Accepted** → Queued for background processing
4. **Background processing**: Payment Service → Repository → Database
5. **Triple protection**: Route + Queue + Database level idempotency

## 🎯 Design Patterns

- **Repository Pattern**: Clean data access abstraction
- **Service Layer**: Business logic encapsulation
- **Factory Pattern**: Centralized service management
- **Dependency Injection**: Loose coupling between components
- **Actor Pattern**: Asynchronous event processing
- **Transaction Wrapper**: ACID compliance utilities

## 📋 Requirements

- Node.js 18+ 
- PostgreSQL 12+
- TypeScript 5.0+

## 🛠️ Quick Start

### 1. Clone and install
```bash
git clone git remote add origin https://github.com/Afaqrehman98/payments-webhook.git
cd payments-webhook
npm install
```

### 2. Environment setup
Copy `env.example` to `.env` and configure your database:
```bash
cp env.example .env
# Edit .env with your database credentials
```

### 3. Database setup
```bash
# Run the schema migration
psql -d your_database -f src/db/migrations/schema.sql
```

### 4. Start development server
```bash
npm run dev
```

## 🚀 Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## 📡 API Endpoints

### POST /webhooks/payments

Processes payment events asynchronously.

**Request Body:**
```json
{
  "event_id": "evt_123456789",
  "type": "payment_received",
  "invoice_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount_cents": 5000
}
```

**Response:**
- `202 Accepted`: Payment queued for processing
- `400 Bad Request`: Invalid input data
- `500 Internal Server Error`: Server error

## 🗄️ Database Schema

### Invoices Table
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    total_cents INTEGER NOT NULL CHECK (total_cents > 0),
    status TEXT NOT NULL CHECK (status IN ('sent','partially_paid','paid')) DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Payments Table
```sql
CREATE TABLE payments (
    event_id TEXT PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    type TEXT NOT NULL CHECK (type IN ('payment_received')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Event Queue Table
```sql
CREATE TABLE payment_events_queue (
    event_id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT NULL
);
```

## 🔄 Payment Processing Flow

1. **Webhook Reception**: Payment event received via POST request
2. **Validation**: Payload validated against Zod schema
3. **Queueing**: Event enqueued for asynchronous processing
4. **Response**: Immediate `202 Accepted` response to webhook sender
5. **Processing**: Background actor processes the payment event
6. **Database Update**: Payment recorded and invoice status updated
7. **Idempotency**: Duplicate events automatically ignored

## 🧪 Testing

### Manual Testing
```bash
# Test the webhook endpoint
curl -X POST http://localhost:3000/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test_123",
    "type": "payment_received",
    "invoice_id": "550e8400-e29b-41d4-a716-446655440000",
    "amount_cents": 5000
  }'
```

## 📁 Project Structure

```
src/
├── constants/          # Application constants and enums
├── db/                # Database connection and migrations
├── errors/            # Custom error classes
├── middleware/        # Request validation middleware
├── repositories/      # Data access layer (Repository Pattern)
├── routes/            # API route definitions
├── services/          # Business logic layer (Service Layer)
│   ├── index.ts       # Service factory for dependency injection
│   └── paymentService.ts # Payment business logic
├── types/             # TypeScript type definitions
├── utils/             # Utility functions (transactions)
├── worker/            # Async event processing (Actor Pattern)
└── queue/             # Generic event queue implementation
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)

### Database Configuration
- Connection pooling with max 10 connections
- 30 second idle timeout
- 2 second connection timeout

## 🚨 Error Handling

The service handles various error scenarios:
- **Validation Errors**: Invalid input data (400)
- **Not Found**: Invoice doesn't exist (404)
- **Server Errors**: Internal processing errors (500)

## 📈 Scalability Features

- **Async Processing**: Non-blocking webhook responses
- **Connection Pooling**: Efficient database connection management
- **Event Queue**: Buffered event processing
- **Transaction Safety**: ACID compliance for data integrity
- **Service Factory**: Centralized service management
- **Dependency Injection**: Loose coupling for better testability

## 🏗️ Code Quality Features

- **Type Safety**: Full TypeScript with strict mode
- **Clean Architecture**: Separation of concerns
- **OOP Principles**: Consistent object-oriented design
- **Error Handling**: Custom error classes and proper HTTP status codes
- **Validation**: Zod schema validation with middleware
- **Transactions**: Database transaction safety
- **Idempotency**: Duplicate event prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues, please open an issue in the repository.

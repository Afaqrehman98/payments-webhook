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
1. **Request received** → Validated → **🆕 Duplicate check via service layer**
2. **🆕 If duplicate**: Immediate **409 Conflict** response with clear error message
3. **🆕 If new**: **202 Accepted** → Queued for background processing
4. **Background processing**: Payment Service → Repository → Database
5. **🆕 Triple protection**: Service-level duplicate check + Database constraint + Repository validation

## 🎯 Design Patterns

- **Repository Pattern**: Clean data access abstraction with raw SQL queries
- **Service Layer**: Business logic encapsulation and transaction management
- **Factory Pattern**: Centralized service management
- **Dependency Injection**: Loose coupling between components
- **Actor Pattern**: Asynchronous event processing
- **Transaction Wrapper**: ACID compliance utilities
- **🆕 Clean Architecture**: Proper separation of concerns between layers

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

Processes payment events asynchronously with **idempotent behavior**.

**Request Body:**
```json
{
  "event_id": "evt_123456789",
  "type": "payment_received",
  "invoice_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount_cents": 5000
}
```

**🆕 Response Codes:**
- `202 Accepted`: Payment queued for processing (new event)
- `409 Conflict`: Payment with this event_id already processed (duplicate)
- `400 Bad Request`: Invalid input data
- `404 Not Found`: Invoice not found
- `500 Internal Server Error`: Server error

**🆕 Example Responses:**

**Success (New Payment):**
```json
{
  "message": "Payment queued for processing",
  "event_id": "evt_123456789"
}
```

**Duplicate Payment:**
```json
{
  "error": "Payment with event_id evt_123456789 already processed",
  "type": "duplicate_event",
  "event_id": "evt_123456789"
}
```

**Invoice Not Found:**
```json
{
  "error": "Invoice 550e8400-e29b-41d4-a716-446655440000 not found",
  "type": "not_found"
}
```

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
3. **🆕 Duplicate Check**: Service layer checks for existing event_id
4. **🆕 Response**: 
   - `409 Conflict` if duplicate detected
   - `202 Accepted` if new event
5. **Queueing**: Event enqueued for asynchronous processing (if new)
6. **Background Processing**: Actor processes the payment event
7. **Database Update**: Payment recorded and invoice status updated
8. **🆕 Idempotency**: Duplicate events rejected at multiple levels

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

### 🆕 Testing Scenarios

**1. First Payment (Should Succeed):**
- **Request**: New event_id
- **Expected**: `202 Accepted` with success message

**2. Duplicate Payment (Should Fail):**
- **Request**: Same event_id
- **Expected**: `409 Conflict` with duplicate error

**3. Different Event ID (Should Succeed):**
- **Request**: Different event_id, same invoice
- **Expected**: `202 Accepted` with success message

**4. Invalid Invoice (Should Fail):**
- **Request**: Non-existent invoice_id
- **Expected**: `404 Not Found` with error message

## 📁 Project Structure

```
src/
├── constants/          # Application constants and enums
├── db/                # Database connection and migrations
├── errors/            # Custom error classes
├── middleware/        # Request validation middleware
├── repositories/      # Data access layer with raw SQL queries
├── routes/            # API route definitions (HTTP concerns only)
├── services/          # Business logic layer (Service Layer)
│   ├── ServiceFactory.ts       # Service factory for dependency injection
│   └── PaymentService.ts # Payment business logic
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

The service handles various error scenarios with **proper HTTP status codes**:
- **🆕 409 Conflict**: Duplicate event_id detected
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Invoice doesn't exist
- **500 Internal Server Error**: Internal processing errors

## 📈 Scalability Features

- **Async Processing**: Non-blocking webhook responses
- **Connection Pooling**: Efficient database connection management
- **Event Queue**: Buffered event processing
- **Transaction Safety**: ACID compliance for data integrity
- **Service Factory**: Centralized service management
- **Dependency Injection**: Loose coupling for better testability
- **🆕 Layer Separation**: Clean boundaries between HTTP, business logic, and data access

## 🏗️ Code Quality Features

- **Type Safety**: Full TypeScript with strict mode
- **🆕 Clean Architecture**: Proper layer separation (Route → Service → Repository)
- **OOP Principles**: Consistent object-oriented design
- **🆕 Proper HTTP Status Codes**: RESTful API responses
- **🆕 Idempotent Webhooks**: Same request = same response
- **Error Handling**: Custom error classes and proper HTTP status codes
- **Validation**: Zod schema validation with middleware
- **Transactions**: Database transaction safety managed in service layer
- **🆕 Raw SQL Queries**: Direct database access for performance and control
- **🆕 Single Responsibility**: Each layer has one clear purpose

## 🏗️ Improved Architecture

**🆕 Layer Responsibilities:**

- **Route Layer**: HTTP request/response, validation, status codes
- **Service Layer**: Business logic, transaction management, repository coordination
- **Repository Layer**: Raw data access, SQL queries, database operations

**🆕 Benefits of New Architecture:**

- **Single Repository Instance**: No duplicate object creation
- **Clean Separation**: Route focuses only on HTTP concerns
- **Testability**: Service methods can be easily unit tested
- **Maintainability**: Business logic centralized in service layer
- **Reusability**: Service methods can be used by other parts of the app

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

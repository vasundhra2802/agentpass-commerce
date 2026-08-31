# AgentPass Commerce

A safe, auditable AI commerce gateway that helps merchants connect natural-language product discovery with controlled purchasing, policy validation, human approval, test payments, transaction tracking, and revenue-growth suggestions.

## Overview

AgentPass Commerce demonstrates how an AI shopping agent can assist users without being given unrestricted authority over financial actions.

The system separates:

AI recommendation → cart selection → policy validation → explicit user approval → payment initiation → payment verification → fulfilment → audit trail

This creates a controlled commerce workflow where important actions remain bounded, explainable, and auditable.

## Key Features

- AI-powered natural-language product discovery
- Semantic product search using Sentence Transformers
- Dynamic budget detection from user queries
- Explainable product recommendations
- Merchant-managed product catalogue
- Shopping cart with stock-aware quantity controls
- Backend Policy Engine
- Server-side price validation
- Budget validation
- Inventory validation
- Explicit human approval before payment
- Approval expiry and single-use protection
- Razorpay Test Mode integration
- Server-side payment signature verification
- Payment replay protection
- Persistent payment transaction records
- Stock fulfilment after verified payment
- Audit logging for important commerce actions
- Revenue-growth / add-on product suggestions
- Budget-aware add-on recommendations
- Merchant transaction dashboard
- Merchant audit-log dashboard
- Inventory and catalogue analytics
- Reproducible SQLite database setup with seed data

## Core Safety Model

AgentPass Commerce follows a bounded-action architecture designed to keep AI recommendations separate from financial authorization.

The AI can recommend products and assist with discovery, but it cannot independently initiate or complete a financial transaction.

A purchase must pass through multiple controls:

1. Product must exist in the merchant catalogue
2. Requested quantity must be valid
3. Required inventory must be available
4. Prices are recalculated on the backend
5. Cart must remain within the detected user budget
6. Backend Policy Engine must approve the transaction
7. User must explicitly approve the purchase
8. Purchase approval is persisted in SQLite with an expiry time
9. Razorpay order is created only in Test Mode
10. Payment session and transaction state are persisted in SQLite
11. Razorpay payment response is verified server-side
12. Amount, currency, order ID and payment signature are validated
13. Fulfilment is allowed only after a verified captured payment
14. Inventory is reduced only after successful fulfilment
15. Completed transactions are protected from failed/cancelled status overwrites
16. Payment outcomes such as `FULFILLED`, `FAILED` and `CANCELLED` are persisted
17. Security-sensitive actions are recorded in an audit trail

Persisting approvals, payment sessions and transactions allows the payment workflow to survive backend restarts instead of depending on in-memory state.

The project currently uses Razorpay Test Mode only and does not require real-money payments for demonstration or testing.

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Razorpay Checkout

### Backend

- FastAPI
- Python
- SQLAlchemy
- SQLite
- Pydantic
- Sentence Transformers
- Razorpay Python SDK
- python-dotenv

### Testing

- pytest
- FastAPI TestClient
- httpx
- Isolated in-memory SQLite test database

### AI / Semantic Search

The recommendation engine uses:

`all-MiniLM-L6-v2`

from Sentence Transformers for semantic similarity between natural-language user requirements and catalogue products.

## Project Structure

```text
agentpass-commerce/
|
|-- backend/
|   |-- tests/
|   |   `-- test_smoke.py
|   |
|   |-- database.py
|   |-- main.py
|   |-- models.py
|   |-- semantic_search.py
|   |-- seed_data.py
|   |-- requirements.txt
|   `-- .gitignore
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |   `-- Sidebar.jsx
|   |   |
|   |   |-- pages/
|   |   |   |-- Landing.jsx
|   |   |   |-- Dashboard.jsx
|   |   |   |-- Products.jsx
|   |   |   |-- AddProduct.jsx
|   |   |   |-- AIAssistant.jsx
|   |   |   |-- Transactions.jsx
|   |   |   `-- AuditLogs.jsx
|   |   |
|   |   |-- services/
|   |   |   `-- api.js
|   |   |
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |
|   `-- package.json
|
|-- BUILD_NOTES.md
`-- README.md
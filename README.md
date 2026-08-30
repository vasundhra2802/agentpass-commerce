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

AgentPass Commerce follows a bounded-action architecture.

The AI can recommend products and assist with discovery, but it cannot independently initiate a financial transaction.

A purchase must pass through multiple controls:

1. Product exists in the merchant catalogue
2. Requested quantity is valid
3. Required stock is available
4. Prices are recalculated on the backend
5. Cart remains within the user's detected budget
6. Backend Policy Engine approves the transaction
7. User explicitly approves the purchase
8. Payment order is generated in Razorpay Test Mode
9. Payment response is verified server-side
10. Fulfilment is allowed only after successful verification

This reduces the risk of an AI agent performing unintended commerce actions.

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

### AI / Semantic Search

The recommendation engine uses:

`all-MiniLM-L6-v2`

from Sentence Transformers for semantic similarity between natural-language user requirements and catalogue products.

## Project Structure

```text
agentpass-commerce/
│
├── backend/
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── semantic_search.py
│   ├── seed_data.py
│   ├── .gitignore
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── AddProduct.jsx
│   │   │   ├── AIAssistant.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── AuditLogs.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── BUILD_NOTES.md
└── README.md
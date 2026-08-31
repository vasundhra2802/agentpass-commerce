# AgentPass Commerce

AgentPass Commerce is a safe, auditable AI-powered commerce gateway that connects natural-language product discovery with controlled checkout, server-side pricing, policy validation, explicit human approval, Razorpay Test payments, fulfilment, inventory updates, and merchant growth intelligence.

The project demonstrates how an AI shopping agent can assist a customer throughout a commerce journey without being given unrestricted authority over financial actions.

---

## Core Idea

AgentPass separates AI assistance from financial authorization.

```text
Natural-Language Request
        ↓
AI Product Recommendation
        ↓
Add to Cart
        ↓
Server-Side Checkout Quote
        ↓
Discount + Tax + Delivery + Contribution
        ↓
Policy & Budget Validation
        ↓
Explicit Human Approval
        ↓
Razorpay Test Payment
        ↓
Server-Side Verification
        ↓
Order Fulfilment
        ↓
Inventory Update
        ↓
Persistent Transaction + Audit Trail
```

The AI can recommend and assist, but it cannot independently authorize or complete a financial transaction.

---

# Key Features

## AI Product Discovery

- Natural-language product search
- Semantic recommendations using Sentence Transformers
- Dynamic budget detection from user prompts
- Explainable product recommendations
- Product relevance scoring
- Stock-aware recommendations
- Add-to-cart directly from AI Assistant

The recommendation engine uses:

```text
all-MiniLM-L6-v2
```

for semantic similarity between user requirements and merchant catalogue products.

---

## Shared Shopping Cart

AgentPass includes a persistent shared cart architecture using React Context.

Features include:

- Add products from AI Assistant
- Increase or decrease quantity
- Remove cart items
- Stock-aware quantity controls
- Persistent cart using `localStorage`
- Persistent detected customer budget
- Dedicated secure cart page
- Automatic cart clearing after successful fulfilment

---

# Server-Side Pricing Engine

Checkout prices are calculated and validated on the backend instead of trusting frontend values.

The checkout quote can include:

- Product subtotal
- Active sale discounts
- Configurable demo tax
- Delivery charges
- Optional social contribution
- Final payable amount
- Budget validation

A checkout quote is persisted with a unique quote ID and expiry time.

This allows later policy checks, human approval, and payment creation to reference the same validated transaction.

---

## Offers & Discounts

The backend supports configurable offer campaigns.

Offer rules can target:

- Individual products
- Brands
- Categories
- Minimum order value
- Percentage discounts
- Flat discounts
- Maximum discount limits
- Campaign start and end dates
- Active/inactive campaign state

The pricing engine selects the best applicable offer instead of blindly stacking discounts.

---

## Configurable Demo Tax

AgentPass supports configurable category-based tax rules.

Tax configuration can include:

- Category
- Subcategory
- Tax percentage
- Effective date
- Expiry date
- Active/inactive state

> The current tax implementation is a configurable demonstration mechanism for the prototype. It should not be interpreted as an official GST compliance engine.

---

## Delivery Pricing

The current prototype supports demonstration delivery zones:

| Delivery Zone | Distance | Charge |
|---|---:|---:|
| Local | 0–15 km | FREE |
| Standard | >15–30 km | ₹50 |
| Far | >30–50 km | ₹100 |

Orders beyond 50 km are treated as unavailable in the current demo.

In a production environment, delivery zones should be determined server-side using validated customer addresses, postal codes, merchant location, and/or a distance service rather than user-selected distance bands.

---

# Optional Social Contribution

Customers can optionally add a contribution during checkout.

Available demo contribution amounts include:

- ₹1
- ₹10
- ₹25
- ₹50
- ₹100
- Custom amount

Supported demonstration causes:

- Education
- Food
- Healthcare

Contribution is:

- Optional
- Never automatically selected
- Included transparently in the final payable amount

The prototype does not make NGO, donation-certification, or tax-benefit claims.

---

# Policy Engine

Before payment can start, AgentPass performs server-side policy validation.

Checks include:

### Inventory Check
Requested products and quantities must be available.

### Price Lock Check
Current catalogue prices must match the validated checkout quote.

### Budget Check
Final payable amount must remain within the detected customer budget.

### Quote Validation
The system verifies that the checkout quote exists and has not expired.

A failed policy check prevents the payment workflow from progressing.

---

# Explicit Human Approval

AgentPass requires explicit customer approval before payment.

The customer is shown the exact approved amount before authorization.

Payment cannot start until the user explicitly approves the validated transaction.

Purchase approvals are:

- Persisted in SQLite
- Linked to the validated checkout quote
- Time-limited
- Protected against inappropriate reuse
- Used when creating the Razorpay order

This prevents the AI agent from independently spending on behalf of the user.

---

# Razorpay Test Mode Payment

AgentPass integrates Razorpay Checkout using **Test Mode only**.

Payment workflow:

```text
Human Approval
      ↓
Backend Creates Razorpay Test Order
      ↓
Razorpay Checkout
      ↓
Test Payment
      ↓
Backend Signature Verification
      ↓
Payment Validation
      ↓
FULFILLED / FAILED / CANCELLED
```

The backend validates:

- Razorpay order ID
- Razorpay payment ID
- Razorpay signature
- Expected amount
- Currency
- Approval
- Payment session
- Transaction state

No real-money payment is required for project demonstration.

---

# Payment Safety

The payment architecture includes:

- Razorpay Test Mode enforcement
- Server-side payment verification
- Approval-linked payment creation
- Quote-linked amount validation
- Persistent payment sessions
- Persistent payment transactions
- Replay protection
- Fulfilment protection
- Failed-payment persistence
- Cancelled-payment persistence
- Completed transaction overwrite protection
- Inventory reduction only after verified payment

A successfully fulfilled transaction cannot later be overwritten as failed or cancelled.

---

# Order Fulfilment

Inventory is reduced only after:

1. Razorpay Test payment succeeds
2. Payment signature is verified
3. Expected payment amount is validated
4. Payment session is valid
5. Transaction passes backend verification

Example verified project flow:

```text
Product: Pocket Power Cable
Quantity: 1
Product Price: ₹399.00
Delivery: ₹100.00
Demo Tax: ₹19.95
Social Contribution: ₹1.00
Final Payable: ₹519.95

Payment Status: FULFILLED
Payment Amount: 51995 paise
Inventory: 29 → 28
```

This demonstrates end-to-end consistency between checkout pricing, approval, payment, verification, and inventory fulfilment.

---

# Merchant Growth Intelligence

AgentPass also demonstrates how AI commerce can help merchants improve revenue without giving the agent unrestricted purchasing authority.

Current growth capabilities include:

- Budget-aware add-on suggestions
- Cross-sell recommendations
- Revenue-growth suggestions
- Catalogue analytics
- Transaction visibility
- Inventory monitoring
- Merchant dashboard insights

Growth recommendations remain suggestions. The customer must still add products and explicitly authorize the final transaction.

---

# Auditability

Security-sensitive actions are recorded in an audit trail.

Examples include:

- Policy checks
- Purchase approvals
- Checkout quotes
- Payment creation
- Payment verification
- Failed payment attempts
- Cancelled payments
- Successful fulfilment
- Inventory updates

This provides traceability across the commerce workflow.

---

# Persistent Data Model

AgentPass uses SQLite with SQLAlchemy.

Core tables include:

```text
products
audit_logs
purchase_approvals
payment_sessions
payment_transactions
checkout_quotes
offer_campaigns
tax_rules
```

Persisting approvals, quotes, payment sessions, and transactions allows important commerce state to survive backend restarts rather than relying only on in-memory state.

---

# Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- React Context
- Lucide React
- Razorpay Checkout
- LocalStorage

## Backend

- FastAPI
- Python
- SQLAlchemy
- SQLite
- Pydantic
- Sentence Transformers
- Razorpay Python SDK
- python-dotenv

## Testing

- pytest
- FastAPI TestClient
- httpx
- Isolated test database

## AI / Semantic Search

- Sentence Transformers
- `all-MiniLM-L6-v2`

---

# Project Structure

```text
agentpass-commerce/
│
├── backend/
│   ├── tests/
│   │   └── test_smoke.py
│   │
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── semantic_search.py
│   ├── seed_data.py
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   │
│   │   ├── context/
│   │   │   └── CartContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── AddProduct.jsx
│   │   │   ├── AIAssistant.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── AuditLogs.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── package-lock.json
│
├── BUILD_NOTES.md
└── README.md
```

---

# Local Setup

## 1. Clone Repository

```bash
git clone https://github.com/vasundhra2802/agentpass-commerce.git
cd agentpass-commerce
```

---

## 2. Backend Setup

```powershell
cd backend

python -m venv venv

.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create a local `.env` file for required environment variables.

Example variable names:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

Use Razorpay **Test Mode credentials only** for the demo.

Do not commit `.env` files or credentials to Git.

Start backend:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

Backend:

```text
http://127.0.0.1:8001
```

FastAPI documentation:

```text
http://127.0.0.1:8001/docs
```

---

## 3. Frontend Setup

From the project root:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Vite will display the local frontend URL in the terminal.

Example:

```text
http://localhost:5173
```

or another available Vite port.

---

# Running Tests

From the backend directory:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests -q
```

Current smoke-test result:

```text
4 passed
```

A Starlette/httpx deprecation warning may currently appear, but it does not indicate a test failure.

---

# Production Build

From the repository root:

```powershell
npm --prefix frontend run build
```

The Vite production build should complete successfully and generate the frontend `dist` directory.

---

# Suggested Demo Flow

For a project demonstration:

1. Open the AI Assistant
2. Enter a natural-language shopping requirement
3. Let AgentPass detect the customer budget
4. Review AI-generated product recommendations
5. Add a product to the cart
6. Open the secure cart
7. Adjust product quantity if required
8. Review merchant growth/add-on suggestions
9. Select a delivery zone
10. Optionally add a social contribution
11. Review the automatically generated server-side checkout quote
12. Confirm subtotal, discount, tax, shipping, contribution, and final payable
13. Run the Policy Check
14. Verify Inventory, Price Lock, and Budget checks
15. Explicitly approve the purchase
16. Start Razorpay Test Mode payment
17. Complete the test payment
18. Observe server-side payment verification
19. Confirm order fulfilment
20. Confirm inventory reduction
21. Open Transactions
22. Open Audit Logs

This demonstrates the complete AI-assisted but human-authorized commerce lifecycle.

---

# Security Notes

- Razorpay Test Mode only
- Secrets are stored outside source code
- `.env` is Git ignored
- Financial totals are recalculated server-side
- Frontend price values are not trusted as authoritative
- Checkout quotes expire
- Human approval is required
- Approval is linked to validated transaction data
- Payment signatures are verified server-side
- Payment sessions are persisted
- Payment replay is protected
- Inventory changes happen only after verified fulfilment
- Failed and cancelled payments are persisted
- Security-sensitive actions are audited

---

# Current Prototype Limitations

AgentPass is currently a demonstration project rather than a production commerce platform.

Areas that would require additional production hardening include:

- PostgreSQL or another production database
- Database migration tooling
- Authentication and role-based authorization
- Merchant/customer account separation
- Production-grade delivery address validation
- Official tax/GST compliance logic
- Webhook-based payment reconciliation
- Idempotency across distributed systems
- Decimal/integer-paise storage throughout the database
- Rate limiting
- Monitoring and observability
- Secret-management infrastructure
- Deployment hardening
- Expanded automated test coverage

These limitations are intentionally documented rather than hidden.

---

# Project Objective

AgentPass Commerce explores a simple question:

> How can AI improve product discovery and merchant conversion while keeping financial actions bounded, human-authorized, verifiable, and auditable?

The project demonstrates one possible architecture where AI assists commerce without being trusted with unrestricted payment authority.
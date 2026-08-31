Incorrect SessionLocal Import
Problem

The FastAPI backend failed to start.

Cause

There was a typo in the database session variable.

I had written SessionalLocal instead of SessionLocal Fix

Corrected the variable name and restarted the backend.

Learning

Small import/name errors can prevent the complete backend from starting, so checking the traceback carefully is important.

FastAPI OpenAPI Error
Problem

Swagger /docs was not opening and /openapi.json was showing a Pydantic error:

class-not-fully-defined
Cause

Some payment endpoints were using request models that were not properly defined in main.py.

These included models such as:

PaymentVerifyRequest
PaymentOrderRequest
PaymentApprovalRequest
PolicyRequest
CartItemRequest
Debugging

I temporarily created a small OpenAPI diagnostic script and checked routes individually.

This helped identify /payment/verify as one of the problematic routes.

Fix

I added the missing Pydantic request models before creating the FastAPI application and restarted the backend.

Swagger started working correctly after that.

Learning

If FastAPI OpenAPI generation fails, checking individual routes can help isolate the endpoint causing the issue.

Old Backend Process Running on Port 8000
Problem

I added the /checkout/quote route, but the route was still missing when I checked the live backend.

Interestingly, importing main.py directly showed that the route existed.

Cause

An older FastAPI process was still running on port 8000.

So the code I was editing and the backend being accessed by the frontend were not the same running process.

Fix

I moved the latest backend temporarily to port:

8001

and changed the frontend API base URL to:

http://127.0.0.1:8001
Learning

When backend code and Swagger show different behaviour, it is useful to check which process is actually listening on the port.

Uvicorn Environment Issue
Problem

Running:

uvicorn main:app

failed because Uvicorn was not available in the Python environment being used.

Cause

The command was using the system Python instead of the project's virtual environment.

Fix

I started the backend using:

.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
Learning

For Python projects, using the virtual environment explicitly avoids dependency confusion.

Pytest Could Not Find main
Problem

While running tests from the repository root, pytest gave:

ModuleNotFoundError: No module named 'main'
Cause

test_smoke.py imports:

from main import app

but the tests were being executed from the wrong working directory.

Fix

I ran the tests from the backend directory:

cd backend
.\venv\Scripts\python.exe -m pytest tests -q
Result
4 passed
Learning

The working directory matters when Python modules are imported using local module names.

Duplicate Product Record
Problem

I noticed two catalogue records for:

Pocket Power Cable

with different product IDs.

Both IDs had also appeared in previous transaction data.

Fix

Instead of deleting the older product and potentially breaking transaction history, I renamed it:

Pocket Power Cable (Legacy)

and set its stock to 0.

The newer product remained active.

Learning

In a commerce system, historical records should be preserved even when catalogue data needs cleanup.

Checkout Amount Rounding
Problem

While testing checkout pricing, I noticed that floating-point calculations could create a one-paise difference.

Fix

I changed important money calculations to use:

Decimal
ROUND_HALF_UP

before converting the final amount into paise for Razorpay.

Learning

Normal floating-point arithmetic is not ideal for payment calculations.

Verifying Payment and Inventory
Problem

After a successful Razorpay test payment, I initially checked the wrong product ID and thought the inventory had not reduced.

Debugging

I checked the exact product ID stored in the payment transaction.

The transaction contained:

Product ID: 7
Pocket Power Cable
Quantity: 1
Result

The stock correctly changed from:

29 → 28

The transaction was also stored as:

Status: FULFILLED
Amount: 51995 paise
Learning

Payment verification should be checked against the actual transaction data, not only the product name.

AI Assistant Example Queries
Problem

Initially the AI Assistant had fixed example queries such as:

Something comfortable for morning runs under 4000
A device for writing programs under 70000

but the catalogue did not contain matching products.

Fix

I changed the suggestions so they are based on products that are currently available in the catalogue.

I also avoided using exact product names so the semantic search could be demonstrated properly.

Examples:

I need something elegant to tell time at work under ₹6,000
I need a lightweight bag for short trips under ₹2,500
I need a compact charging accessory under ₹500
Result

The semantic model returned:

UrbanTime Classic → Rank #1
TrailPack Lite → Rank #1
Pocket Power Cable → Rank #1
Learning

Semantic search is more convincing when users describe what they need instead of typing an exact product name.

Semantic Suggestion Ordering Bug
Problem

The charging-accessory example was incorrectly being converted into a travel/bag query.

Cause

A broader travel / pack condition was being checked before the more specific cable / charging condition.

Fix

I moved the charging condition above the bag/travel condition.

Learning

When simple rule-based classification is used, more specific conditions should normally be checked before broader conditions.

Final Verification

Before considering the core project stable, I tested the complete flow:

Natural language request
→ Semantic recommendation
→ Add to cart
→ Server-side checkout quote
→ Policy check
→ Budget and price validation
→ Explicit approval
→ Razorpay Test payment
→ Backend payment verification
→ Order fulfilment
→ Inventory update

One test checkout produced:

Product Price: ₹399.00
Tax: ₹19.95
Delivery: ₹100.00
Social Contribution: ₹1.00

Final Payable: ₹519.95

The Razorpay test payment was also ₹519.95 and the backend stored:

51995 paise
Status: FULFILLED
Fresh Clone Test

I also cloned the GitHub repository into a separate folder and tested it again.

Backend:

4 passed

Frontend:

npm ci
0 vulnerabilities
npm run build
Build successful

This helped confirm that the project was not only working because of files or dependencies available in my original development folder.

Things I Would Improve for Production

The current project is a prototype.

Some areas I would improve before using it as a production commerce system are:

User authentication
Merchant/customer role-based access
PostgreSQL instead of SQLite
Database migrations
Razorpay webhooks
Real address-based delivery calculation
Production tax/GST logic
More automated tests
Rate limiting
Better deployment and monitoring
# Build Notes

This file contains problems,fixes and lessons learned while building AgentPass Commerce.

## Fetch Promise Chain Parse Error

Problem:
The React app failed to compile after adding .then() to the fetch request.

Cause:
I ended the fetch statement with a semicolon before chaining .then().

Wrong:
fetch(...);
.then(...)

Fix:
Removed the semicolon and chained .then() directly to fetch.

What I learned:
JavaScript promise methods such as .then() must be chained to the promise returned by fetch().


Problem: Backend failed to start due to incorrect SessionLocal import.
Cause: Typo in variable name.
Fix: Changed SessionalLocal to SessionLocal.

FastAPI OpenAPI Error – Missing Pydantic Models

Error:
Swagger /docs open nahi ho raha tha aur /openapi.json par PydanticUserError: class-not-fully-defined aa raha tha.

Cause:
Payment endpoints mein PaymentVerifyRequest, PaymentOrderRequest, PaymentApprovalRequest, PolicyRequest aur CartItemRequest use ho rahe the, lekin inki Pydantic class definitions main.py mein missing thi.

Debugging:
Temporary diagnose_openapi.py script se individual routes check kiye. Isse /payment/verify problematic route identify hua.

Fix:
Missing Pydantic request models ko app = FastAPI() se pehle define kiya. Backend restart karne ke baad Swagger properly load ho gaya.

Key Learning:
FastAPI endpoint mein use hone wale request models properly defined/imported hone chahiye. OpenAPI error aane par route-by-route schema generation se faulty endpoint isolate kiya ja sakta hai.
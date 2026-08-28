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
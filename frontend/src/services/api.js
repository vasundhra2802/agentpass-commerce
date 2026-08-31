const API_BASE_URL = "http://127.0.0.1:8001";

export async function getProducts() {
  const response = await fetch(`${API_BASE_URL}/products`);

  if (!response.ok) {
    throw new Error("Could not load products");
  }

  return response.json();
}

export async function createProduct(product) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Could not save product");
  }

  return data;
}

export async function getRecommendations(query) {
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Could not get recommendations"
    );
  }

  return data;
}
export async function deleteProduct(productId) {
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Could not delete product"
    );
  }

  return data;
}
export async function updateProduct(productId, product) {
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Could not update product"
    );
  }

  return data;
}
export async function checkPolicy(
  items,
  maxBudget,
  quoteId = null
) {
  const response = await fetch(
    `${API_BASE_URL}/policy/check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        max_budget: maxBudget,
        quote_id: quoteId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Policy check failed"
    );
  }

  return data;
}
export async function approvePurchase(
  items,
  maxBudget,
  quoteId = null
) {
  const response = await fetch(
    `${API_BASE_URL}/payment/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        max_budget: maxBudget,
        quote_id: quoteId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Purchase approval failed"
    );
  }

  return data;
}


export async function createPaymentOrder(
  approvalId
) {
  const response = await fetch(
    `${API_BASE_URL}/payment/create-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approval_id: approvalId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Could not create Razorpay Test order"
    );
  }

  return data;
}


export async function verifyPayment(
  paymentData
) {
  const response = await fetch(
    `${API_BASE_URL}/payment/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Payment verification failed"
    );
  }

  return data;
}
export async function getPaymentTransactions() {
  const response = await fetch(
    `${API_BASE_URL}/payment-transactions`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to load payment transactions"
    );
  }

  return data;
}
export async function getAuditLogs() {
  const response = await fetch(
    `${API_BASE_URL}/audit-logs`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to load audit logs"
    );
  }

  return data;
}
export async function getGrowthSuggestions(items, maxBudget) {
  const response = await fetch(
    "${API_BASE_URL}/growth/suggestions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items,
        max_budget: maxBudget,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load growth suggestions"
    );
  }

  return await response.json();
}
export async function recordPaymentFailure({
  payment_session_id,
  status,
  reason = null,
}) {
  const response = await fetch(
    `${API_BASE_URL}/payment/failure`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_session_id,
        status,
        reason,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Could not record payment status"
    );
  }

  return data;
}
export async function createCheckoutQuote(
  items,
  maxBudget,
  socialContribution = 0,
  socialCause = null,
  deliveryZone = "LOCAL"
) {
  const response = await fetch(
    `${API_BASE_URL}/checkout/quote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        max_budget: maxBudget,
        social_contribution_rupees:
          Number(socialContribution) || 0,
        social_cause:
          Number(socialContribution) > 0
            ? socialCause
            : null,
        delivery_zone: deliveryZone,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Could not create checkout quote"
    );
  }

  return data;
}
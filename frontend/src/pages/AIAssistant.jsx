import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRecommendations,
  checkPolicy,
  approvePurchase,
  createPaymentOrder,
  verifyPayment,
  getGrowthSuggestions,
} from "../services/api";

function AIAssistant() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [detectedBudget, setDetectedBudget] = useState(null);

  // Cart
  const [cart, setCart] = useState([]);

  // Policy Engine
  const [policyResult, setPolicyResult] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");

  // Human Approval
  const [userApproved, setUserApproved] = useState(false);
  const [approvalId, setApprovalId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [growthSuggestions, setGrowthSuggestions] = useState([]);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthMessage, setGrowthMessage] = useState("");

  const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const handleTestPayment = async () => {
  if (!userApproved || !approvalId) {
    setPaymentStatus("error");
    setPaymentMessage(
      "Explicit purchase approval is required."
    );
    return;
  }

  try {
    setPaymentLoading(true);
    setPaymentStatus(null);
    setPaymentMessage("");

    const loaded = await loadRazorpayScript();

    if (!loaded) {
      throw new Error(
        "Razorpay Checkout could not be loaded."
      );
    }

    const order = await createPaymentOrder(
      approvalId
    );

    if (
      !order.key_id ||
      !order.key_id.startsWith("rzp_test_")
    ) {
      throw new Error(
        "Only Razorpay Test Mode is allowed."
      );
    }

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "AgentPass Commerce",
      description: "Buildathon Test Transaction",

      handler: async function (response) {
        try {
          const verification =
            await verifyPayment({
              payment_session_id:
                order.payment_session_id,

              razorpay_order_id:
                response.razorpay_order_id,

              razorpay_payment_id:
                response.razorpay_payment_id,

              razorpay_signature:
                response.razorpay_signature,
            });

          if (verification.verified) {
            setPaymentStatus("success");
            setPaymentMessage(
              "Test payment verified successfully."
            );
          }
        } catch (error) {
          setPaymentStatus("error");
          setPaymentMessage(
            error.message ||
              "Payment verification failed."
          );
        }
      },

      modal: {
        ondismiss: function () {
          setPaymentStatus("cancelled");
          setPaymentMessage(
            "Test checkout was closed. No payment was completed."
          );
        },
      },
    };

    const razorpayCheckout =
      new window.Razorpay(options);

    razorpayCheckout.on(
      "payment.failed",
      function () {
        setPaymentStatus("error");
        setPaymentMessage(
          "Test payment failed. No real money was charged."
        );
      }
    );

    razorpayCheckout.open();
  } catch (error) {
    setPaymentStatus("error");
    setPaymentMessage(
      error.message ||
        "Could not start Razorpay Test Checkout."
    );
  } finally {
    setPaymentLoading(false);
  }
};

  const exampleQueries = [
    "Something comfortable for morning runs under 4000",
    "A device for writing programs under 70000",
    "Something elegant to wear on my wrist for office under 7000",
  ];

  // ---------------------------------
  // Reset Policy + Approval
  // ---------------------------------

 const resetPolicyResult = () => {
  setPolicyResult(null);
  setPolicyError("");
  setUserApproved(false);

  setApprovalId(null);
  setPaymentStatus(null);
  setPaymentMessage("");
  setGrowthSuggestions([]);
  setGrowthMessage("");
  setGrowthLoading(false);
};
  // ---------------------------------
  // AI Search
  // ---------------------------------
const loadGrowthSuggestions = async () => {
  try {
    if (!cart || cart.length === 0) {
      setGrowthSuggestions([]);
      setGrowthMessage("");
      return;
    }

    setGrowthLoading(true);
    setGrowthMessage("");

     const growthItems = cart.map((item) => ({
  product_id: item.id,
  quantity: item.quantity,
}));

const data = await getGrowthSuggestions(
  growthItems,
  detectedBudget
);

    setGrowthSuggestions(
      data.suggestions || []
    );

    setGrowthMessage(
      data.message || ""
    );
  } catch (error) {
    setGrowthSuggestions([]);
    setGrowthMessage(
      "Could not load add-on suggestions."
    );
  } finally {
    setGrowthLoading(false);
  }
};
  const handleSearch = async () => {
    if (!query.trim()) {
      setMessage("Please describe what you are looking for.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setRecommendations([]);
      setDetectedBudget(null);

      resetPolicyResult();

      const data = await getRecommendations(query.trim());

      const results = data.recommendations || [];

      setRecommendations(results);
      setDetectedBudget(data.max_budget ?? null);
      if (data.message) {
  setMessage(data.message);
} else if (results.length === 0) {
  setMessage(
    "No matching product is currently available in the catalogue."
  );
}
    } catch (error) {
      setMessage(
        error.message ||
          "AI recommendation service is currently unavailable."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // ---------------------------------
  // Add Product to Cart
  // ---------------------------------

  const addToCart = (product) => {
    resetPolicyResult();

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (
          existingItem.quantity >= Number(product.stock)
        ) {
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  // ---------------------------------
  // Increase Quantity
  // ---------------------------------

  const increaseQuantity = (productId) => {
    resetPolicyResult();

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (
          item.quantity >= Number(item.stock)
        ) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  // ---------------------------------
  // Decrease Quantity
  // ---------------------------------

  const decreaseQuantity = (productId) => {
    resetPolicyResult();

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // ---------------------------------
  // Remove Product
  // ---------------------------------

  const removeFromCart = (productId) => {
    resetPolicyResult();

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  };

  // ---------------------------------
  // Cart Total
  // ---------------------------------

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price) *
          Number(item.quantity),
      0
    );
  }, [cart]);

  // ---------------------------------
  // Total Cart Quantity
  // ---------------------------------

  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.quantity),
      0
    );
  }, [cart]);

  // ---------------------------------
  // Backend Policy Engine
  // ---------------------------------

  const handlePolicyCheck = async () => {
    if (cart.length === 0) {
      setPolicyError(
        "Add at least one product to the cart."
      );
      return;
    }

    try {
      setPolicyLoading(true);
      setPolicyError("");
      setPolicyResult(null);
      setUserApproved(false);

      const result = await checkPolicy(
        cart,
        detectedBudget
      );

      setPolicyResult(result);
    } catch (error) {
      setPolicyError(
        error.message ||
          "Could not validate the cart."
      );
    } finally {
      setPolicyLoading(false);
    }
  };

  // ---------------------------------
  // Human Approval
  // ---------------------------------

  const handleApprovePurchase = async () => {
  if (!policyResult?.passed) {
    setPaymentMessage("Policy check must pass before approval.");
    setPaymentStatus("error");
    return;
  }

  try {
    const approval = await approvePurchase(
      cart,
      detectedBudget
    );

    setApprovalId(approval.approval_id);
    setUserApproved(true);
    setPaymentStatus(null);
    setPaymentMessage("");
  } catch (error) {
    setUserApproved(false);
    setApprovalId(null);
    setPaymentStatus("error");
    setPaymentMessage(
      error.message || "Purchase approval failed."
    );
  }
};

  const handleCancelApproval = () => {
  setUserApproved(false);
  setApprovalId(null);
  setPaymentStatus(null);
  setPaymentMessage("");

  setPolicyResult(null);

  setPolicyError(
    "Purchase approval cancelled. Run the policy check again to continue."
  );
};
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-white"
          >
            AgentPass Commerce
          </Link>

          <div className="flex items-center gap-3">
            {cartItemCount > 0 && (
              <div className="rounded-xl bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300">
                Cart: {cartItemCount}
              </div>
            )}

            <Link
              to="/merchant"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Merchant Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-14">
        {/* =================================
            SEARCH HERO
        ================================= */}

        <section className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300">
            Semantic Product Discovery
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            What are you looking for?
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Describe your requirement naturally. The
            recommendation engine evaluates customer intent,
            product relevance, budget and catalogue
            information.
          </p>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="e.g. I need something elegant to wear on my wrist for office under 7000"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white px-5 py-4 text-sm text-slate-900 outline-none transition focus:ring-4 focus:ring-indigo-500/30"
              />

              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="rounded-2xl bg-indigo-600 px-7 py-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Finding Products..."
                  : "Find Products"}
              </button>
            </div>
          </div>

          {/* Example Queries */}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400 transition hover:border-indigo-500/50 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Budget */}

          {detectedBudget !== null && (
            <p className="mt-6 text-sm font-medium text-emerald-400">
              Budget constraint detected: ₹
              {Number(
                detectedBudget
              ).toLocaleString("en-IN")}
            </p>
          )}

          {/* Search Message */}

          {message && (
            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-200">
              {message}
            </div>
          )}
        </section>

        {/* =================================
            COMMERCE CART
        ================================= */}

        {cart.length > 0 && (
          <section className="mt-14 rounded-3xl border border-indigo-500/20 bg-slate-900 p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                  Commerce Cart
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Selected Products
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">
                  Cart Total
                </p>

                <p className="mt-1 text-3xl font-bold">
                  ₹
                  {cartTotal.toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
            </div>

            {/* Cart Items */}

            <div className="mt-6 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="font-semibold text-white">
                      {item.productName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      ₹
                      {Number(
                        item.price
                      ).toLocaleString("en-IN")}{" "}
                      each
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Available stock: {item.stock}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      className="h-9 w-9 rounded-lg border border-white/10 text-lg text-slate-300 transition hover:bg-white/10"
                    >
                      −
                    </button>

                    <span className="min-w-8 text-center font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      disabled={
                        item.quantity >=
                        Number(item.stock)
                      }
                      className="h-9 w-9 rounded-lg border border-white/10 text-lg text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(item.id)
                      }
                      className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Transaction Rules */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">
                Before any financial action is allowed, the
                backend Policy Engine verifies the current
                catalogue, quantities, stock and budget.
              </p>
            </div>
            {/* Revenue Growth Suggestions */}

<button
  type="button"
  onClick={loadGrowthSuggestions}
  disabled={growthLoading || cart.length === 0}
  className="mt-5 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
>
  {growthLoading
    ? "Finding Add-ons..."
    : "Show Add-on Suggestions"}
</button>

{growthMessage && (
  <p className="mt-3 text-sm text-slate-400">
    {growthMessage}
  </p>
)}
{growthSuggestions.length > 0 && (
  <div className="mt-5 grid gap-4 md:grid-cols-2">
    {growthSuggestions.map((product) => (
      <div
        key={product.id}
        className="rounded-2xl border border-indigo-500/20 bg-slate-950/50 p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Suggested Add-on
        </p>

        <h3 className="mt-2 text-lg font-bold text-white">
          {product.productName}
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          {product.category}
          {product.subcategory
            ? ` • ${product.subcategory}`
            : ""}
        </p>

        <p className="mt-4 text-xl font-bold text-white">
          ₹
          {Number(product.price).toLocaleString(
            "en-IN"
          )}
        </p>

        {product.reasons?.length > 0 && (
          <div className="mt-4 space-y-1">
            {product.reasons.map((reason) => (
              <p
                key={reason}
                className="text-xs text-slate-400"
              >
                • {reason}
              </p>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => addToCart(product)}
          className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Add to Cart
        </button>
      </div>
    ))}
  </div>
)}

            {/* Run Policy Button */}

            <button
              type="button"
              onClick={handlePolicyCheck}
              disabled={policyLoading}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {policyLoading
                ? "Checking Policies..."
                : "Run Policy Check"}
            </button>

            {/* Policy Error */}

            {policyError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {policyError}
              </div>
            )}

            {/* =================================
                POLICY RESULT
            ================================= */}

            {policyResult && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Policy Decision
                    </p>

                    <p
                      className={`mt-2 text-3xl font-bold ${
                        policyResult.passed
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {policyResult.decision}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">
                      Verified Total
                    </p>

                    <p className="mt-1 text-2xl font-bold text-white">
                      ₹
                      {Number(
                        policyResult.server_total
                      ).toLocaleString("en-IN")}
                    </p>

                    {policyResult.max_budget !==
                      null &&
                      policyResult.max_budget !==
                        undefined && (
                        <p className="mt-1 text-xs text-slate-500">
                          Maximum Budget: ₹
                          {Number(
                            policyResult.max_budget
                          ).toLocaleString("en-IN")}
                        </p>
                      )}
                  </div>
                </div>

                {/* Individual Policy Checks */}

                <div className="mt-6 space-y-3">
                  {policyResult.checks.map(
                    (check) => (
                      <div
                        key={check.name}
                        className="flex flex-col justify-between gap-3 rounded-xl bg-white/5 p-4 sm:flex-row sm:items-start"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {check.name}
                          </p>

                          <p className="mt-1 text-sm leading-5 text-slate-400">
                            {check.message}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                            check.passed
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {check.passed
                            ? "PASS"
                            : "BLOCK"}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* Final Policy Status */}

                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    policyResult.passed
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : "border-red-500/20 bg-red-500/10"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      policyResult.passed
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {policyResult.passed
                      ? "The cart satisfies all transaction policies. Financial action may proceed only after explicit user approval."
                      : "The cart is blocked. Resolve the failed policy checks before continuing."}
                  </p>
                </div>

                {/* =================================
                    HUMAN APPROVAL
                ================================= */}

                {policyResult.passed && (
                  <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      Human Approval Required
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-white">
                      Approve this purchase?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      The Policy Engine has approved the cart,
                      but no payment can be initiated until
                      you explicitly approve this transaction.
                    </p>

                    {/* Final Amount */}

                    <div className="mt-5 rounded-xl bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          Final Amount
                        </span>

                        <span className="text-xl font-bold text-white">
                          ₹
                          {Number(
                            policyResult.server_total
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Approval Buttons */}

                    {!userApproved ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={
                            handleApprovePurchase
                          }
                          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                          Approve Purchase
                        </button>

                        <button
                          type="button"
                          onClick={
                            handleCancelApproval
                          }
                          className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
  <div className="mt-5">
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
      <p className="font-semibold text-emerald-300">
        ✓ Purchase explicitly approved by user
      </p>

      <p className="mt-1 text-sm text-emerald-200/70">
        Payment initiation is now permitted.
      </p>
    </div>

    {approvalId && (
      <div className="mt-4">
        <button
          type="button"
          onClick={handleTestPayment}
          disabled={paymentLoading}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paymentLoading
            ? "Starting Test Checkout..."
            : "Pay with Razorpay — Test Mode"}
        </button>

        <p className="mt-2 text-center text-xs text-slate-500">
          Test Mode only. No real money will be charged.
        </p>
      </div>
    )}

    {paymentMessage && (
      <div
        className={`mt-4 rounded-xl border p-4 text-sm ${
          paymentStatus === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : paymentStatus === "cancelled"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
        }`}
      >
        {paymentMessage}
      </div>
    )}
  </div>
)}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================
            AI RECOMMENDATIONS
        ================================= */}

        {recommendations.length > 0 && (
          <section className="mt-16">
            <div className="mb-7">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                AI Results
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Recommended Products
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Ranked according to your natural language
                requirement.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map(
                (product, index) => {
                  const cartItem = cart.find(
                    (item) =>
                      item.id === product.id
                  );

                  return (
                    <article
                      key={product.id}
                      className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-indigo-500/40"
                    >
                      {/* Rank */}

                      <div className="absolute right-5 top-5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
                        #{index + 1}
                      </div>

                      {/* Heading */}

                      <div className="pr-12">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                          {product.category}
                        </p>

                        <h3 className="mt-2 text-2xl font-bold">
                          {product.productName}
                        </h3>

                        {product.subcategory && (
                          <p className="mt-1 text-sm text-slate-400">
                            {product.subcategory}
                          </p>
                        )}
                      </div>

                      {/* Description */}

                      <p className="mt-5 text-sm leading-6 text-slate-400">
                        {product.description}
                      </p>

                      {/* Brand */}

                      {product.brand && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-500">
                            Brand
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-300">
                            {product.brand}
                          </p>
                        </div>
                      )}

                      {/* Price and Stock */}

                      <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                        <div>
                          <p className="text-xs text-slate-500">
                            Price
                          </p>

                          <p className="mt-1 text-2xl font-bold">
                            ₹
                            {Number(
                              product.price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            Stock
                          </p>

                          <p className="mt-1 font-semibold text-emerald-400">
                            {product.stock}
                          </p>
                        </div>
                      </div>

                      {/* Attributes */}

                      {product.attributes &&
                        Object.keys(
                          product.attributes
                        ).length > 0 && (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {Object.entries(
                              product.attributes
                            ).map(
                              ([key, value]) => (
                                <span
                                  key={key}
                                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300"
                                >
                                  {key
                                    .replaceAll(
                                      "_",
                                      " "
                                    )
                                    .replace(
                                      /\b\w/g,
                                      (letter) =>
                                        letter.toUpperCase()
                                    )}
                                  : {String(value)}
                                </span>
                              )
                            )}
                          </div>
                        )}

                      {/* Matched Signals */}

                      {product.matched_terms &&
                        product.matched_terms
                          .length > 0 && (
                          <div className="mt-6">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Matched Signals
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {product.matched_terms.map(
                                (term) => (
                                  <span
                                    key={term}
                                    className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                                  >
                                    {term}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Explainability */}

                      {product.reasons &&
                        product.reasons.length >
                          0 && (
                          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                              Why this product?
                            </p>

                            <div className="space-y-2">
                              {product.reasons.map(
                                (
                                  reason,
                                  reasonIndex
                                ) => (
                                  <div
                                    key={
                                      reasonIndex
                                    }
                                    className="flex items-start gap-2 text-sm text-slate-300"
                                  >
                                    <span className="mt-0.5 text-emerald-400">
                                      ✓
                                    </span>

                                    <span>
                                      {reason}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* AI Match Score */}

                      <div className="mt-6 rounded-2xl bg-indigo-500/10 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-indigo-300">
                              AI Match Score
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Hybrid semantic ranking
                            </p>
                          </div>

                          <p className="text-2xl font-bold text-indigo-300">
                            {Number(
                              product.match_score ||
                                0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Technical Scores */}

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/5 p-3">
                          <p className="text-xs text-slate-500">
                            Semantic Score
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-300">
                            {Number(
                              product.semantic_score ||
                                0
                            ).toFixed(4)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/5 p-3">
                          <p className="text-xs text-slate-500">
                            Keyword Score
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-300">
                            {Number(
                              product.keyword_score ||
                                0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Add to Cart */}

                      <div className="mt-auto pt-6">
                        <button
                          type="button"
                          onClick={() =>
                            addToCart(product)
                          }
                          disabled={
                            Number(
                              product.stock
                            ) <= 0 ||
                            (cartItem &&
                              cartItem.quantity >=
                                Number(
                                  product.stock
                                ))
                          }
                          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cartItem
                            ? `Add Another • ${cartItem.quantity} in Cart`
                            : "Add to Cart"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AIAssistant;
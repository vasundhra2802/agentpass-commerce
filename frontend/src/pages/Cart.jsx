import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Gift,
  HeartHandshake,
  IndianRupee,
  LockKeyhole,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";

import {
  approvePurchase,
  checkPolicy,
  createCheckoutQuote,
  createPaymentOrder,
  getGrowthSuggestions,
  recordPaymentFailure,
  verifyPayment,
} from "../services/api";

import { useCart } from "../context/CartContext";

function Cart() {
  const {
    cart,
    detectedBudget,
    increaseQuantity: increaseCartQuantity,
    decreaseQuantity: decreaseCartQuantity,
    removeFromCart: removeCartItem,
    clearCart,
    addToCart: addItemToCart,
    cartItemCount,
    cartTotal,
  } = useCart();

  const [policyResult, setPolicyResult] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");

  const [userApproved, setUserApproved] = useState(false);
  const [approvalId, setApprovalId] = useState(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);

  const [growthSuggestions, setGrowthSuggestions] = useState([]);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthMessage, setGrowthMessage] = useState("");

  const [deliveryZone, setDeliveryZone] = useState("LOCAL");
  const [socialContribution, setSocialContribution] = useState(0);
  const [socialCause, setSocialCause] = useState("EDUCATION");
  const [customContribution, setCustomContribution] = useState("");

  const [checkoutQuote, setCheckoutQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const resetCheckoutState = () => {
    setPolicyResult(null);
    setPolicyError("");
    setUserApproved(false);
    setApprovalId(null);
    setPaymentStatus(null);
    setPaymentMessage("");
    setGrowthSuggestions([]);
    setGrowthMessage("");
    setCheckoutQuote(null);
    setQuoteError("");
  };

  const increaseQuantity = (productId) => {
    resetCheckoutState();
    increaseCartQuantity(productId);
  };

  const decreaseQuantity = (productId) => {
    resetCheckoutState();
    decreaseCartQuantity(productId);
  };

  const removeFromCart = (productId) => {
    resetCheckoutState();
    removeCartItem(productId);
  };

  const handleClearCart = () => {
    resetCheckoutState();
    clearCart();
  };

  const addToCart = (product) => {
    resetCheckoutState();
    addItemToCart(product);
  };

  const handleDeliveryZoneChange = (zone) => {
    resetCheckoutState();
    setDeliveryZone(zone);
  };

  const handleContributionChange = (amount) => {
    resetCheckoutState();
    setSocialContribution(Number(amount) || 0);

    if (amount !== "CUSTOM") {
      setCustomContribution("");
    }
  };

  const handleCustomContribution = (value) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, "");

    setCustomContribution(sanitizedValue);
    resetCheckoutState();

    const amount = Number(sanitizedValue);

    setSocialContribution(
      Number.isFinite(amount) && amount > 0
        ? amount
        : 0
    );
  };

  const handleCauseChange = (cause) => {
    resetCheckoutState();
    setSocialCause(cause);
  };

  const buildFreshCheckoutQuote = async () => {
    if (cart.length === 0) {
      throw new Error(
        "Add at least one product to the cart."
      );
    }

    const quote = await createCheckoutQuote(
      cart,
      detectedBudget,
      socialContribution,
      socialContribution > 0
        ? socialCause
        : null,
      deliveryZone
    );

    setCheckoutQuote(quote);
    return quote;
  };

  const handleCreateQuote = async () => {
    try {
      setQuoteLoading(true);
      setQuoteError("");
      setPolicyResult(null);
      setPolicyError("");
      setUserApproved(false);
      setApprovalId(null);
      setPaymentStatus(null);
      setPaymentMessage("");

      await buildFreshCheckoutQuote();
    } catch (error) {
      setCheckoutQuote(null);
      setQuoteError(
        error.message ||
          "Could not calculate final payable."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (cart.length === 0) {
      setCheckoutQuote(null);
      setQuoteError("");
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);
        setQuoteError("");

        const quote = await createCheckoutQuote(
          cart,
          detectedBudget,
          socialContribution,
          socialContribution > 0
            ? socialCause
            : null,
          deliveryZone
        );

        setCheckoutQuote(quote);
      } catch (error) {
        setCheckoutQuote(null);
        setQuoteError(
          error.message ||
            "Could not calculate final payable."
        );
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    cart,
    detectedBudget,
    deliveryZone,
    socialContribution,
    socialCause,
  ]);

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

  const handlePolicyCheck = async () => {
    if (cart.length === 0) {
      setPolicyError(
        "Add at least one product to the cart."
      );
      return;
    }

    try {
      setPolicyLoading(true);
      setQuoteLoading(true);
      setPolicyError("");
      setQuoteError("");
      setPolicyResult(null);
      setUserApproved(false);
      setApprovalId(null);
      setPaymentStatus(null);
      setPaymentMessage("");

      const freshQuote =
        await buildFreshCheckoutQuote();

      const result = await checkPolicy(
        cart,
        detectedBudget,
        freshQuote.quote_id
      );

      setPolicyResult(result);
    } catch (error) {
      setPolicyError(
        error.message ||
          "Could not validate the cart."
      );
    } finally {
      setPolicyLoading(false);
      setQuoteLoading(false);
    }
  };

  const handleApprovePurchase = async () => {
    if (!policyResult?.passed) {
      setPaymentMessage(
        "Policy check must pass before approval."
      );
      setPaymentStatus("error");
      return;
    }

    try {
      if (!checkoutQuote?.quote_id) {
        throw new Error(
          "Create a fresh checkout quote before approval."
        );
      }

      const approval = await approvePurchase(
        cart,
        detectedBudget,
        checkoutQuote.quote_id
      );

      setApprovalId(
        approval.approval_id
      );
      setUserApproved(true);
      setPaymentStatus(null);
      setPaymentMessage("");
    } catch (error) {
      setUserApproved(false);
      setApprovalId(null);
      setPaymentStatus("error");
      setPaymentMessage(
        error.message ||
          "Purchase approval failed."
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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () =>
        resolve(true);

      script.onerror = () =>
        resolve(false);

      document.body.appendChild(
        script
      );
    });
  };

  const handleTestPayment = async () => {
    if (
      !userApproved ||
      !approvalId
    ) {
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

      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Razorpay Checkout could not be loaded."
        );
      }

      const order =
        await createPaymentOrder(
          approvalId
        );

      if (
        !order.key_id ||
        !order.key_id.startsWith(
          "rzp_test_"
        )
      ) {
        throw new Error(
          "Only Razorpay Test Mode is allowed."
        );
      }

      let paymentFailureRecorded =
        false;

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "AgentPass Commerce",
        description:
          "Buildathon Test Transaction",

        handler: async function (
          response
        ) {
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

            if (
              verification.verified
            ) {
              setPaymentStatus(
                "success"
              );

              setPaymentMessage(
                verification.fulfillment_completed
                  ? "Test payment verified and order fulfilled successfully."
                  : "Test payment verified successfully."
              );

              if (
                verification.fulfillment_completed
              ) {
                setCompletedOrder({
                  amount:
                    Number(order.amount) / 100,
                  paymentId:
                    verification.payment_id ||
                    response.razorpay_payment_id,
                });

                clearCart();
              }
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
          ondismiss:
            async function () {
              if (
                !paymentFailureRecorded
              ) {
                try {
                  await recordPaymentFailure({
                    payment_session_id:
                      order.payment_session_id,
                    status:
                      "CANCELLED",
                    reason:
                      "User closed Test checkout",
                  });

                  paymentFailureRecorded =
                    true;
                } catch (error) {
                  console.error(
                    "Could not persist checkout cancellation:",
                    error
                  );
                }
              }

              setPaymentStatus(
                "cancelled"
              );

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
        async function () {
          paymentFailureRecorded =
            true;

          try {
            await recordPaymentFailure({
              payment_session_id:
                order.payment_session_id,
              status: "FAILED",
              reason:
                "Razorpay Test payment failed",
            });
          } catch (error) {
            console.error(
              "Could not persist payment failure:",
              error
            );
          }

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            to="/assistant"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="font-bold tracking-tight text-white">
                AgentPass
              </p>
              <p className="text-xs text-slate-500">
                Secure Cart
              </p>
            </div>
          </Link>

          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            Continue Shopping
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-indigo-400">
              <ShoppingCart size={19} />
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                Shopping Cart
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Review and checkout
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Product review, growth suggestions, policy validation,
              human approval and Razorpay Test payment all happen here.
            </p>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              <Trash2 size={16} />
              Clear Cart
            </button>
          )}
        </section>

        {cart.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.025] px-6 py-16 text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
                completedOrder
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-indigo-500/10 text-indigo-300"
              }`}
            >
              {completedOrder ? (
                <CheckCircle2 size={30} />
              ) : (
                <ShoppingBag size={28} />
              )}
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              {completedOrder
                ? "Order completed successfully"
                : "Your cart is empty"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              {completedOrder
                ? `Razorpay Test payment of ₹${Number(
                    completedOrder.amount
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} was verified and fulfilled. Your cart has been cleared.`
                : "Use the AI Assistant to discover relevant products and add them to your cart."}
            </p>

            <Link
              to="/assistant"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <Sparkles size={17} />
              {completedOrder
                ? "Continue Shopping"
                : "Open AI Assistant"}
            </Link>
          </section>
        ) : (
          <>
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
            <section className="space-y-5">
              <div className="space-y-4">
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/10"
                  >
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                          <Package size={21} />
                        </div>

                        <div>
                          <h2 className="text-lg font-bold text-white">
                            {item.productName}
                          </h2>

                          <p className="mt-1 text-sm text-slate-400">
                            {item.category}
                            {item.subcategory
                              ? ` • ${item.subcategory}`
                              : ""}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-white">
                            ₹
                            {Number(
                              item.price
                            ).toLocaleString(
                              "en-IN"
                            )}{" "}
                            each
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Available stock: {item.stock}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              item.id
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10"
                        >
                          <Minus size={17} />
                        </button>

                        <span className="min-w-10 text-center text-lg font-bold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              item.id
                            )
                          }
                          disabled={
                            item.quantity >=
                            Number(item.stock)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                          className="ml-1 inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-sm text-slate-500">
                        Item total
                      </span>

                      <span className="flex items-center text-lg font-bold text-white">
                        <IndianRupee size={17} />
                        {(
                          Number(item.price) *
                          Number(item.quantity)
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <section className="rounded-3xl border border-indigo-500/20 bg-slate-900 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                    <TrendingUp size={18} />
                  </div>

                  <div>
                    <h2 className="font-bold text-white">
                      Revenue Growth Suggestions
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Surface relevant add-ons without bypassing
                      customer budget or approval.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    loadGrowthSuggestions
                  }
                  disabled={
                    growthLoading ||
                    cart.length === 0
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {growthLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
                      Finding Add-ons...
                    </>
                  ) : (
                    <>
                      <Gift size={17} />
                      Show Add-on Suggestions
                    </>
                  )}
                </button>

                {growthMessage && (
                  <p className="mt-3 text-sm text-slate-400">
                    {growthMessage}
                  </p>
                )}

                {growthSuggestions.length >
                  0 && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {growthSuggestions.map(
                      (product) => (
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
                            {Number(
                              product.price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                          {product.reasons?.length >
                            0 && (
                            <div className="mt-4 space-y-2">
                              {product.reasons.map(
                                (
                                  reason,
                                  index
                                ) => (
                                  <div
                                    key={`${reason}-${index}`}
                                    className="flex items-start gap-2 text-xs text-slate-400"
                                  >
                                    <CheckCircle2
                                      size={14}
                                      className="mt-0.5 shrink-0 text-emerald-400"
                                    />
                                    <span>
                                      {reason}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              addToCart(product)
                            }
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                          >
                            <ShoppingCart size={16} />
                            Add to Cart
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

            </section>

            <aside className="h-fit space-y-5 xl:sticky xl:top-24">
              <section className="rounded-[2rem] border border-indigo-500/20 bg-slate-900 p-6 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                    <Truck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Delivery
                    </p>
                    <p className="text-xs text-slate-500">
                      Demo zone-based shipping
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {[
                    {
                      value: "LOCAL",
                      label: "Nearby • 0–15 km",
                      helper: "FREE",
                    },
                    {
                      value: "STANDARD",
                      label: "Standard • >15–30 km",
                      helper: "₹50",
                    },
                    {
                      value: "FAR",
                      label: "Far • >30–50 km",
                      helper: "₹100",
                    },
                  ].map((zone) => (
                    <button
                      key={zone.value}
                      type="button"
                      onClick={() =>
                        handleDeliveryZoneChange(
                          zone.value
                        )
                      }
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        deliveryZone === zone.value
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-white/10 bg-white/[0.025] hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm font-semibold text-white">
                        {zone.label}
                      </span>

                      <span className="text-xs text-slate-400">
                        {zone.helper}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  Above 50 km: delivery unavailable in this demo.
                  In production, distance should be derived from a validated
                  address or postcode instead of customer selection.
                </p>
              </section>

              <section className="rounded-[2rem] border border-emerald-500/15 bg-slate-900 p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <HeartHandshake size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Social Contribution
                    </p>
                    <p className="text-xs text-slate-500">
                      Optional • default ₹0
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 10, 25, 50, 100].map(
                    (amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() =>
                          handleContributionChange(
                            amount
                          )
                        }
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          socialContribution ===
                            amount &&
                          customContribution === ""
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.025] text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        {amount === 0
                          ? "No"
                          : `₹${amount}`}
                      </button>
                    )
                  )}
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-400">
                    Custom contribution
                  </label>

                  <div className="relative mt-2">
                    <IndianRupee
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={customContribution}
                      onChange={(event) =>
                        handleCustomContribution(
                          event.target.value
                        )
                      }
                      placeholder="Enter amount"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                {socialContribution > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-400">
                      Select cause
                    </p>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        "EDUCATION",
                        "FOOD",
                        "HEALTHCARE",
                      ].map((cause) => (
                        <button
                          key={cause}
                          type="button"
                          onClick={() =>
                            handleCauseChange(cause)
                          }
                          className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition ${
                            socialCause === cause
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          {cause === "HEALTHCARE"
                            ? "Healthcare"
                            : cause.charAt(0) +
                              cause
                                .slice(1)
                                .toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  Contribution is never selected automatically and is not
                  included in the taxable value in this prototype.
                </p>
              </section>

              <section className="rounded-[2rem] border border-indigo-500/20 bg-slate-900 p-6 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                    <ShoppingBag size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Order Summary
                    </p>

                    <p className="text-xs text-slate-500">
                      {cartItemCount} item
                      {cartItemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Product Subtotal
                    </span>

                    <span className="font-semibold text-white">
                      ₹
                      {Number(
                        checkoutQuote?.subtotal ??
                          cartTotal
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Sale Discount
                    </span>

                    <span className="font-semibold text-emerald-300">
                      -₹
                      {Number(
                        checkoutQuote?.discount ?? 0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Configured Demo Tax
                    </span>

                    <span className="font-semibold text-white">
                      ₹
                      {Number(
                        checkoutQuote?.tax ?? 0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Delivery ({deliveryZone})
                    </span>

                    <span className="font-semibold text-white">
                      ₹
                      {Number(
                        checkoutQuote?.shipping ?? 0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Social Contribution
                    </span>

                    <span className="font-semibold text-white">
                      ₹
                      {Number(
                        checkoutQuote?.social_contribution ??
                          socialContribution
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>

                  {detectedBudget !== null && (
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                      <span className="text-slate-400">
                        Detected Budget
                      </span>

                      <span className="font-semibold text-emerald-300">
                        ₹
                        {Number(
                          detectedBudget
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        Final Payable
                      </span>

                      <span className="flex items-center text-2xl font-bold text-white">
                        <IndianRupee size={21} />
                        {Number(
                          checkoutQuote?.grand_total ??
                            cartTotal
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {checkoutQuote && (
                  <div
                    className={`mt-5 rounded-xl border p-3 text-xs ${
                      checkoutQuote.budget_passed
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {checkoutQuote.budget_passed
                      ? "Server quote is within the detected budget."
                      : "Final payable exceeds the detected budget."}
                  </div>
                )}

                {quoteError && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                    {quoteError}
                  </div>
                )}

                <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-5 py-3 text-sm font-semibold text-indigo-300">
                  {quoteLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
                      Updating final payable...
                    </>
                  ) : checkoutQuote ? (
                    <>
                      <CheckCircle2 size={17} />
                      Final payable updated automatically
                    </>
                  ) : (
                    <>
                      <IndianRupee size={17} />
                      Final payable will update automatically
                    </>
                  )}
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />

                  <p className="text-xs leading-5 text-slate-400">
                    Discount, configured tax, delivery and optional
                    contribution are calculated server-side. Policy,
                    approval and Razorpay Test payment use the same
                    locked quote.
                  </p>
                </div>
              </section>
            </aside>
          </div>

          <section className="mt-6 rounded-[2rem] border border-emerald-500/20 bg-slate-900 p-6 shadow-2xl shadow-black/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <h2 className="font-bold text-white">
                      Secure Checkout
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Final payable review → backend policy validation →
                      explicit approval → Razorpay Test payment.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handlePolicyCheck
                  }
                  disabled={
                    policyLoading ||
                    !checkoutQuote
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {policyLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Checking Policies...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      {checkoutQuote
                        ? "Run Policy Check"
                        : "Waiting for Final Payable"}
                    </>
                  )}
                </button>

                {policyError && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <XCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      {policyError}
                    </span>
                  </div>
                )}

                {policyResult && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                    <div
                      className={`border-b p-5 ${
                        policyResult.passed
                          ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                          : "border-red-500/20 bg-red-500/[0.06]"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              policyResult.passed
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {policyResult.passed ? (
                              <BadgeCheck size={22} />
                            ) : (
                              <XCircle size={22} />
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Policy Decision
                            </p>

                            <p
                              className={`mt-1 text-2xl font-bold ${
                                policyResult.passed
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {policyResult.decision}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-500">
                            Backend Verified Total
                          </p>

                          <p className="mt-1 text-2xl font-bold text-white">
                            ₹
                            {Number(
                              policyResult.server_total
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="space-y-3">
                        {(policyResult.checks ||
                          []).map(
                          (check) => (
                            <div
                              key={check.name}
                              className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.035] p-4 sm:flex-row sm:items-start"
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
                                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                  check.passed
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-red-500/10 text-red-300"
                                }`}
                              >
                                {check.passed ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <XCircle size={13} />
                                )}

                                {check.passed
                                  ? "PASS"
                                  : "BLOCK"}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      {policyResult.passed && (
                        <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                              <LockKeyhole size={18} />
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                                Human Approval Required
                              </p>

                              <h3 className="mt-1 text-xl font-bold text-white">
                                Approve this purchase?
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                No payment can start until you explicitly
                                approve this exact validated transaction.
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                            <span className="text-sm text-slate-400">
                              Approved amount
                            </span>

                            <span className="flex items-center text-xl font-bold text-white">
                              <IndianRupee size={18} />
                              {Number(
                                policyResult.server_total
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>
                          </div>

                          {!userApproved ? (
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={
                                  handleApprovePurchase
                                }
                                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                              >
                                <BadgeCheck size={17} />
                                Approve Purchase
                              </button>

                              <button
                                type="button"
                                onClick={
                                  handleCancelApproval
                                }
                                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                              >
                                <XCircle size={17} />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-5">
                              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                <CheckCircle2
                                  size={19}
                                  className="mt-0.5 shrink-0 text-emerald-300"
                                />

                                <div>
                                  <p className="font-semibold text-emerald-300">
                                    Purchase explicitly approved
                                  </p>

                                  <p className="mt-1 text-sm text-emerald-200/70">
                                    Payment initiation is now permitted.
                                  </p>
                                </div>
                              </div>

                              {approvalId && (
                                <div className="mt-4">
                                  <button
                                    type="button"
                                    onClick={
                                      handleTestPayment
                                    }
                                    disabled={
                                      paymentLoading
                                    }
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <CreditCard size={18} />

                                    {paymentLoading
                                      ? "Starting Test Checkout..."
                                      : "Pay with Razorpay — Test Mode"}
                                  </button>

                                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                                    <ShieldCheck size={13} />
                                    Test Mode only. No real money will be charged.
                                  </p>
                                </div>
                              )}

                              {paymentMessage && (
                                <div
                                  className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                                    paymentStatus ===
                                    "success"
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                      : paymentStatus ===
                                        "cancelled"
                                      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                      : "border-red-500/20 bg-red-500/10 text-red-300"
                                  }`}
                                >
                                  {paymentStatus ===
                                  "success" ? (
                                    <CheckCircle2
                                      size={18}
                                      className="mt-0.5 shrink-0"
                                    />
                                  ) : paymentStatus ===
                                    "cancelled" ? (
                                    <AlertTriangle
                                      size={18}
                                      className="mt-0.5 shrink-0"
                                    />
                                  ) : (
                                    <XCircle
                                      size={18}
                                      className="mt-0.5 shrink-0"
                                    />
                                  )}

                                  <span>
                                    {paymentMessage}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Cart;

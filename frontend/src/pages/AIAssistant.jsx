import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  WalletCards,
} from "lucide-react";

import {
  getRecommendations,
} from "../services/api";

import { useCart } from "../context/CartContext";

function AIAssistant() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");

  const {
    cart,
    setDetectedBudget,
    detectedBudget,
    addToCart,
    cartItemCount,
  } = useCart();

  const exampleQueries = [
    "Something comfortable for morning runs under 4000",
    "A device for writing programs under 70000",
    "Something elegant to wear on my wrist for office under 7000",
  ];

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

  const handleAddToCart = (product) => {
    const existingItem = cart.find(
      (item) => item.id === product.id
    );

    if (
      existingItem &&
      existingItem.quantity >= Number(product.stock)
    ) {
      setCartMessage(
        `Maximum available stock for ${product.productName} is already in your cart.`
      );
      return;
    }

    addToCart(product);

    setCartMessage(
      `${product.productName} added to cart successfully.`
    );

    window.setTimeout(() => {
      setCartMessage("");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            to="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20 transition group-hover:scale-105">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="font-bold tracking-tight text-white">
                AgentPass
              </p>
              <p className="text-xs text-slate-500">
                AI Commerce
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/cart"
              className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline">
                Cart
              </span>

              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                {cartItemCount}
              </span>
            </Link>

            <Link
              to="/merchant"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:px-4"
            >
              <Store size={17} />
              <span className="hidden sm:inline">
                Merchant Portal
              </span>
            </Link>
          </div>
        </div>
      </header>

      {cartMessage && (
        <div className="fixed right-5 top-20 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-300"
          />

          <div>
            <p className="text-sm font-semibold text-emerald-200">
              Added to cart
            </p>
            <p className="mt-0.5 text-xs leading-5 text-emerald-100/70">
              {cartMessage}
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] px-5 py-10 text-center shadow-2xl shadow-black/20 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300">
              <BrainCircuit size={16} />
              Semantic Product Discovery
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find the right product with
              <span className="text-indigo-400">
                {" "}AI assistance
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Describe what you need naturally. AgentPass evaluates intent,
              relevance, budget and live catalogue data. Checkout, policy
              approval and payment are handled securely inside the cart.
            </p>

            <div className="mx-auto mt-9 max-w-3xl rounded-3xl border border-white/10 bg-slate-900/90 p-2 shadow-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. elegant office watch under ₹7,000"
                    className="w-full rounded-2xl border border-white/10 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Finding Products...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Find Products
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>

            {detectedBudget !== null && (
              <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left">
                <WalletCards
                  size={19}
                  className="text-emerald-400"
                />

                <div>
                  <p className="text-xs text-emerald-200/70">
                    Detected budget
                  </p>
                  <p className="font-bold text-emerald-300">
                    ₹
                    {Number(
                      detectedBudget
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}

            {message && (
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-200">
                {message}
              </div>
            )}
          </div>
        </section>

        {recommendations.length > 0 && (
          <section className="mt-14">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles size={18} />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                    AI Results
                  </p>
                </div>

                <h2 className="mt-2 text-3xl font-bold">
                  Recommended Products
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Add products here. Review, policy validation,
                  approval and payment happen in the cart.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400">
                <Tags size={16} />
                {recommendations.length} match
                {recommendations.length === 1
                  ? ""
                  : "es"}
              </div>
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
                      className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/10 transition duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-950/20"
                    >
                      <div className="absolute right-5 top-5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                        #{index + 1}
                      </div>

                      <div className="flex items-start gap-3 pr-12">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                          <Package size={20} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                            {product.category}
                          </p>

                          <h3 className="mt-1 text-xl font-bold">
                            {product.productName}
                          </h3>

                          {product.subcategory && (
                            <p className="mt-1 text-sm text-slate-400">
                              {product.subcategory}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-slate-400">
                        {product.description}
                      </p>

                      {product.brand && (
                        <div className="mt-4 flex items-center gap-2 text-sm">
                          <span className="text-slate-500">
                            Brand
                          </span>
                          <span className="font-medium text-slate-300">
                            {product.brand}
                          </span>
                        </div>
                      )}

                      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
                        <div className="rounded-xl bg-white/[0.035] p-3">
                          <p className="text-xs text-slate-500">
                            Price
                          </p>
                          <p className="mt-1 text-xl font-bold">
                            ₹
                            {Number(
                              product.price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.035] p-3">
                          <p className="text-xs text-slate-500">
                            Stock
                          </p>
                          <p
                            className={`mt-1 text-xl font-bold ${
                              Number(product.stock) > 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {product.stock}
                          </p>
                        </div>
                      </div>

                      {product.reasons &&
                        product.reasons.length > 0 && (
                          <div className="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
                            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                              <BrainCircuit size={14} />
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
                                    <CheckCircle2
                                      size={15}
                                      className="mt-0.5 shrink-0 text-emerald-400"
                                    />
                                    <span>
                                      {reason}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      <div className="mt-5 rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.07] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-medium text-indigo-300">
                              <Sparkles size={15} />
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

                      <details className="mt-3 rounded-xl border border-white/5 bg-white/[0.025]">
                        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-slate-400">
                          <span className="flex items-center justify-between">
                            Technical ranking details
                            <ChevronRight size={14} />
                          </span>
                        </summary>

                        <div className="grid grid-cols-2 gap-3 border-t border-white/5 p-3">
                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[11px] text-slate-500">
                              Semantic
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-300">
                              {Number(
                                product.semantic_score ||
                                  0
                              ).toFixed(4)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[11px] text-slate-500">
                              Keyword
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-300">
                              {Number(
                                product.keyword_score ||
                                  0
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </details>

                      <div className="mt-auto pt-6">
                        <button
                          type="button"
                          onClick={() =>
                            handleAddToCart(product)
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
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShoppingCart size={17} />
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

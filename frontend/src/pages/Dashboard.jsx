import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

import {
  getProducts,
  getPaymentTransactions,
  getAuditLogs,
} from "../services/api";


function Dashboard() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // =========================================
  // LOAD DASHBOARD DATA
  // =========================================

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          productData,
          transactionData,
          auditData,
        ] = await Promise.all([
          getProducts(),
          getPaymentTransactions(),
          getAuditLogs(),
        ]);

        setProducts(
          Array.isArray(productData)
            ? productData
            : []
        );

        setTransactions(
          Array.isArray(transactionData)
            ? transactionData
            : []
        );

        setAuditLogs(
          Array.isArray(auditData)
            ? auditData
            : []
        );

      } catch (err) {
        setError(
          err.message ||
            "Could not load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);


  // =========================================
  // MAIN DASHBOARD METRICS
  // =========================================

  const dashboardData = useMemo(() => {
    const categories = new Set(
      products
        .map((product) => product.category)
        .filter(Boolean)
    );

    const totalStock = products.reduce(
      (total, product) =>
        total + Number(product.stock || 0),
      0
    );

    const lowStockProducts = products.filter(
      (product) =>
        Number(product.stock) > 0 &&
        Number(product.stock) <= 5
    );

    const outOfStockProducts = products.filter(
      (product) =>
        Number(product.stock) === 0
    );

    const inventoryValue = products.reduce(
      (total, product) =>
        total +
        Number(product.price || 0) *
          Number(product.stock || 0),
      0
    );


    const fulfilledTransactions =
      transactions.filter((transaction) => {
        const status = String(
          transaction.status || ""
        ).toUpperCase();

        return (
          transaction.fulfilled === true ||
          status === "FULFILLED"
        );
      }).length;


    const blockedTransactions =
      transactions.filter((transaction) => {
        const status = String(
          transaction.status || ""
        ).toUpperCase();

        return (
          status.includes("BLOCKED") ||
          status === "FAILED"
        );
      }).length;


    const blockedAuditEvents =
      auditLogs.filter((log) => {
        const status = String(
          log.status || ""
        ).toUpperCase();

        return (
          status === "BLOCKED" ||
          status === "FAILED"
        );
      }).length;


    const transactionValue =
      transactions.reduce(
        (total, transaction) => {
          if (
            transaction.amount_rupees !==
              undefined &&
            transaction.amount_rupees !== null
          ) {
            return (
              total +
              Number(
                transaction.amount_rupees || 0
              )
            );
          }

          return (
            total +
            Number(
              transaction.amount_paise || 0
            ) /
              100
          );
        },
        0
      );


    return {
      totalProducts: products.length,
      totalCategories: categories.size,
      totalStock,

      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length,

      inventoryValue,

      totalTransactions:
        transactions.length,

      fulfilledTransactions,

      blockedTransactions,

      blockedAuditEvents,

      auditEvents:
        auditLogs.length,

      transactionValue,
    };

  }, [
    products,
    transactions,
    auditLogs,
  ]);


  // =========================================
  // CATEGORY DISTRIBUTION
  // =========================================

  const categoryDistribution = useMemo(() => {
    const counts = {};

    products.forEach((product) => {
      const category =
        product.category || "Uncategorized";

      counts[category] =
        (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );

  }, [products]);


  // =========================================
  // RECENT PRODUCTS
  // =========================================

  const recentProducts = useMemo(() => {
    return [...products]
      .sort(
        (a, b) =>
          Number(b.id || 0) -
          Number(a.id || 0)
      )
      .slice(0, 5);

  }, [products]);


  // =========================================
  // RECENT TRANSACTIONS
  // =========================================

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA =
          new Date(
            a.created_at || 0
          ).getTime();

        const dateB =
          new Date(
            b.created_at || 0
          ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);

  }, [transactions]);


  // =========================================
  // RECENT AUDIT EVENTS
  // =========================================

  const recentAuditLogs = useMemo(() => {
  const sortedLogs = [...auditLogs].sort((a, b) => {
    const dateA = new Date(
      a.created_at || 0
    ).getTime();

    const dateB = new Date(
      b.created_at || 0
    ).getTime();

    return dateB - dateA;
  });

  const seen = new Set();

  const uniqueLogs = sortedLogs.filter((log) => {
    const key = [
      log.event_type,
      log.status,
      log.message,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return uniqueLogs.slice(0, 6);
}, [auditLogs]);


  // =========================================
  // HELPERS
  // =========================================

  function formatStatus(status) {
    return String(status || "UNKNOWN")
      .replaceAll("_", " ");
  }


  function getStatusClass(status) {
    const value = String(
      status || ""
    ).toUpperCase();

    if (
      value === "FULFILLED" ||
      value === "CAPTURED" ||
      value === "APPROVED" ||
      value === "COMPLETED"
    ) {
      return (
        "bg-emerald-50 text-emerald-700 " +
        "border-emerald-200"
      );
    }

    if (
      value === "CREATED" ||
      value === "PENDING" ||
      value === "VERIFIED_NOT_CAPTURED"
    ) {
      return (
        "bg-amber-50 text-amber-700 " +
        "border-amber-200"
      );
    }

    if (
      value.includes("BLOCKED") ||
      value === "FAILED"
    ) {
      return (
        "bg-red-50 text-red-700 " +
        "border-red-200"
      );
    }

    return (
      "bg-slate-50 text-slate-600 " +
      "border-slate-200"
    );
  }


  function transactionAmount(transaction) {
    if (
      transaction.amount_rupees !==
        undefined &&
      transaction.amount_rupees !== null
    ) {
      return Number(
        transaction.amount_rupees
      );
    }

    return (
      Number(
        transaction.amount_paise || 0
      ) / 100
    );
  }


  // =========================================
  // METRIC CARDS
  // =========================================

  const catalogueCards = [
    {
      label: "Total Products",
      value:
        dashboardData.totalProducts,
      helper:
        "Products in merchant catalogue",
    },
    {
      label: "Categories",
      value:
        dashboardData.totalCategories,
      helper:
        "Active product categories",
    },
    {
      label: "Total Stock",
      value:
        dashboardData.totalStock,
      helper:
        "Units currently available",
    },
    {
      label: "Low Stock",
      value:
        dashboardData.lowStock,
      helper:
        "Products with 5 or fewer units",
    },
  ];


  const commerceCards = [
    {
      label: "Transactions",
      value:
        dashboardData.totalTransactions,
      helper:
        "Persistent payment records",
    },
    {
      label: "Fulfilled Orders",
      value:
        dashboardData.fulfilledTransactions,
      helper:
        "Captured and fulfilled transactions",
    },
    {
      label: "Audit Events",
      value:
        dashboardData.auditEvents,
      helper:
        "Recorded decision events",
    },
    {
      label: "Blocked Events",
      value:
        dashboardData.blockedAuditEvents,
      helper:
        "Rejected or failed actions",
    },
  ];


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading merchant dashboard...
            </p>
          </div>
        </main>
      </div>
    );
  }


  // =========================================
  // UI
  // =========================================

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />


      <main className="flex-1 p-6 lg:p-10">

        <div className="mx-auto max-w-7xl">


          {/* =================================
              HEADER
          ================================= */}

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Merchant Portal
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Commerce Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Monitor catalogue health, AI commerce,
                transaction activity, fulfilment and
                policy audit events.
              </p>
            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                to="/assistant"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open AI Assistant
              </Link>

              <Link
                to="/products/add"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                + Add Product
              </Link>

            </div>
          </div>


          {/* =================================
              ERROR
          ================================= */}

          {error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}


          {/* =================================
              CATALOGUE METRICS
          ================================= */}

          <div className="mt-8">

            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Catalogue Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current inventory and catalogue status
              </p>
            </div>


            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {catalogueCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.helper}
                  </p>
                </div>
              ))}

            </div>
          </div>


          {/* =================================
              COMMERCE METRICS
          ================================= */}

          <div className="mt-8">

            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Commerce Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Payment, fulfilment and governance activity
              </p>
            </div>


            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {commerceCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.helper}
                  </p>
                </div>
              ))}

            </div>
          </div>


          {/* =================================
              VALUE SUMMARY
          ================================= */}

          <div className="mt-6 grid gap-5 lg:grid-cols-3">

            {/* Inventory Value */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <p className="text-sm font-medium text-slate-500">
                Estimated Inventory Value
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                ₹
                {dashboardData.inventoryValue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Price × available stock across catalogue
              </p>

            </div>


            {/* Transaction Value */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <p className="text-sm font-medium text-slate-500">
                Test Transaction Value
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                ₹
                {dashboardData.transactionValue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Value represented by stored Test Mode transactions
              </p>

            </div>


            {/* Inventory Health */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inventory Health
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {dashboardData.outOfStock}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Products currently out of stock
                  </p>
                </div>


                <div
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    dashboardData.outOfStock === 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {dashboardData.outOfStock === 0
                    ? "Healthy"
                    : "Attention Needed"}
                </div>

              </div>
            </div>

          </div>


          {/* =================================
              PRODUCTS + CATEGORY
          ================================= */}

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">


            {/* Recent Products */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between gap-4">

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Recent Products
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest catalogue additions
                  </p>
                </div>


                <Link
                  to="/products"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View Catalogue
                </Link>

              </div>


              {recentProducts.length === 0 ? (

                <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    No products added yet.
                  </p>
                </div>

              ) : (

                <div className="mt-6 divide-y divide-slate-100">

                  {recentProducts.map((product) => (

                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-5 py-4"
                    >

                      <div className="min-w-0">

                        <p className="truncate font-semibold text-slate-900">
                          {product.productName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {product.category}

                          {product.subcategory
                            ? ` • ${product.subcategory}`
                            : ""}
                        </p>

                      </div>


                      <div className="text-right">

                        <p className="font-semibold text-slate-900">
                          ₹
                          {Number(
                            product.price
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </p>


                        <p
                          className={`mt-1 text-xs font-medium ${
                            Number(product.stock) > 5
                              ? "text-emerald-600"
                              : Number(product.stock) > 0
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          Stock: {product.stock}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </section>


            {/* Category Distribution */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-bold text-slate-900">
                Category Distribution
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Products across catalogue categories
              </p>


              <div className="mt-6 space-y-5">

                {categoryDistribution.length === 0 ? (

                  <p className="text-sm text-slate-500">
                    No category data available.
                  </p>

                ) : (

                  categoryDistribution.map(
                    ({ category, count }) => {

                      const percentage =
                        products.length > 0
                          ? (
                              count /
                              products.length
                            ) *
                            100
                          : 0;


                      return (

                        <div key={category}>

                          <div className="flex items-center justify-between">

                            <p className="text-sm font-medium text-slate-700">
                              {category}
                            </p>

                            <p className="text-sm text-slate-500">
                              {count}
                            </p>

                          </div>


                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )
                )}

              </div>

            </section>

          </div>


          {/* =================================
              TRANSACTIONS
          ================================= */}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Recent Transactions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Latest persistent payment records
                </p>
              </div>


              <Link
                to="/transactions"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View All
              </Link>

            </div>


            {recentTransactions.length === 0 ? (

              <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">

                <p className="text-sm text-slate-500">
                  No payment transactions recorded yet.
                </p>

              </div>

            ) : (

              <div className="mt-6 overflow-x-auto">

                <table className="min-w-full">

                  <thead>

                    <tr className="border-b border-slate-100">

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Transaction
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Amount
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Fulfilled
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {recentTransactions.map(
                      (transaction) => (

                        <tr
                          key={transaction.id}
                          className="border-b border-slate-50"
                        >

                          <td className="py-4 text-sm font-medium text-slate-900">
                            #{transaction.id}
                          </td>


                          <td className="py-4">

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                transaction.status
                              )}`}
                            >
                              {formatStatus(
                                transaction.status
                              )}
                            </span>

                          </td>


                          <td className="py-4 text-sm font-semibold text-slate-900">
                            ₹
                            {transactionAmount(
                              transaction
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>


                          <td className="py-4 text-sm text-slate-600">
                            {transaction.fulfilled
                              ? "Yes"
                              : "No"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </section>


          {/* =================================
              AUDIT TRAIL
          ================================= */}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Recent Audit Activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Policy, approval, payment and growth events
                </p>
              </div>


              <Link
                to="/audit-logs"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View Audit Logs
              </Link>

            </div>


            {recentAuditLogs.length === 0 ? (

              <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">

                <p className="text-sm text-slate-500">
                  No audit events recorded yet.
                </p>

              </div>

            ) : (

              <div className="mt-6 space-y-3">

                {recentAuditLogs.map((log) => (

                  <div
                    key={log.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center"
                  >

                    <div>

                      <p className="font-semibold text-slate-900">
                        {formatStatus(
                          log.event_type
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {log.message}
                      </p>

                    </div>


                    <div className="flex items-center gap-3">

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          log.status
                        )}`}
                      >
                        {formatStatus(
                          log.status
                        )}
                      </span>


                      <span className="whitespace-nowrap text-xs text-slate-400">
                        {log.created_at
                          ? new Date(
                              log.created_at
                            ).toLocaleString()
                          : "—"}
                      </span>

                    </div>

                  </div>

                ))}

              </div>
            )}

          </section>


          {/* =================================
              AI COMMERCE READINESS
          ================================= */}

          <section className="mt-8 overflow-hidden rounded-3xl bg-slate-900 p-7 text-white shadow-sm">

            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

              <div>

                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
                  AgentPass Commerce
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  AI Commerce System Active
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Semantic product discovery, bounded policy
                  checks, explicit human approval, Razorpay
                  Test Mode payments, persistent transactions,
                  audit logging and revenue growth suggestions
                  are connected.
                </p>

              </div>


              <div className="grid gap-2 text-sm sm:grid-cols-2">

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Semantic Recommendations
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Policy Engine
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Human Approval
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Audit Trail
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Persistent Transactions
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3 text-emerald-300">
                  ✓ Revenue Growth Suggestions
                </div>

              </div>

            </div>


            <div className="mt-6">

              <Link
                to="/assistant"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Open AI Shopping Assistant
              </Link>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}


export default Dashboard;
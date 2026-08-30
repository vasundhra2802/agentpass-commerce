import { useEffect, useState } from "react";
import { getPaymentTransactions } from "../services/api";
const formatUtcToIst = (value) => {
  if (!value) return "—";

  const utcValue =
    value.endsWith("Z") ||
    value.includes("+")
      ? value
      : `${value}Z`;

  return new Date(utcValue).toLocaleString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  );
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const data = await getPaymentTransactions();

      setTransactions(data);
    } catch (err) {
      setError("Could not load payment transactions.");
    } finally {
      setLoading(false);
    }
  }

  function formatStatus(status) {
    return String(status || "")
      .replaceAll("_", " ");
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Payment Transactions
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          View payment status, fulfilment and inventory activity.
        </p>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">
            {error}
          </p>
        </div>
      )}

      {!error && transactions.length === 0 && (
        <div className="border rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No payment transactions yet.
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium">
                  ID
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Status
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Amount
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Items
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Fulfilled
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Failure Reason
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-t"
                >
                  <td className="px-5 py-4 text-sm">
                    #{transaction.id}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium">
                    {formatStatus(transaction.status)}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    ₹{Number(
                      transaction.amount_rupees || 0
                    ).toLocaleString("en-IN")}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {Array.isArray(transaction.items)
                      ? transaction.items.length
                      : 0}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {transaction.fulfilled
                      ? "Yes"
                      : "No"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {transaction.failure_reason || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {formatUtcToIst(transaction.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={loadTransactions}
        className="px-4 py-2 border rounded-lg text-sm"
      >
        Refresh
      </button>
    </div>
  );
}
import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");

      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError("Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  function formatText(value) {
    return String(value || "")
      .replaceAll("_", " ");
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Audit Logs
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Review policy, approval and payment decision history.
        </p>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">
            {error}
          </p>
        </div>
      )}

      {!error && logs.length === 0 && (
        <div className="border rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No audit events recorded yet.
          </p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium">
                  ID
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Event
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Status
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Message
                </th>

                <th className="text-left px-5 py-3 text-sm font-medium">
                  Time
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t"
                >
                  <td className="px-5 py-4 text-sm">
                    #{log.id}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium">
                    {formatText(log.event_type)}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {formatText(log.status)}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {log.message}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {log.created_at
                      ? new Date(
                          log.created_at
                        ).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={loadLogs}
        className="px-4 py-2 border rounded-lg text-sm"
      >
        Refresh
      </button>
    </div>
  );
}
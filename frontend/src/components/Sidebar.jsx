import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-white p-5">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-slate-900">
          AgentPass
        </h1>

        <p className="text-sm text-slate-500">
          Commerce
        </p>
      </div>

      <nav className="space-y-2">
        <NavLink to="/merchant" className={linkClass}>
          Dashboard
        </NavLink>

        <NavLink to="/products" className={linkClass}>
          Products
        </NavLink>

        <NavLink to="/products/add" className={linkClass}>
          Add Product
        </NavLink>

        <NavLink to="/assistant" className={linkClass}>
          AI Assistant
        </NavLink>
        <NavLink
  to="/transactions"
  className="block px-4 py-2 rounded-lg hover:bg-gray-100"
>
  Transactions
</NavLink>
<NavLink
  to="/audit-logs"
  className="block px-4 py-2 rounded-lg hover:bg-gray-100"
>
  Audit Logs
</NavLink>
      </nav>

      <div className="mt-10 rounded-xl bg-emerald-50 p-4">
        <p className="text-xs font-semibold text-emerald-700">
          AI Engine Active
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Sparkles,
  CreditCard,
  ScrollText,
  Activity,
} from "lucide-react";

function Sidebar() {
  const navigationItems = [
    {
      to: "/merchant",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      to: "/products",
      label: "Products",
      icon: Package,
    },
    {
      to: "/products/add",
      label: "Add Product",
      icon: PackagePlus,
    },
    {
      to: "/assistant",
      label: "AI Assistant",
      icon: Sparkles,
    },
    {
      to: "/transactions",
      label: "Transactions",
      icon: CreditCard,
    },
    {
      to: "/audit-logs",
      label: "Audit Logs",
      icon: ScrollText,
    },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-white p-5">
      {/* Brand */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
          <Sparkles size={21} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            AgentPass
          </h1>

          <p className="text-xs font-medium text-slate-500">
            AI Commerce
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1.5">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* AI Status */}
      <div className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Activity size={17} />
          </div>

          <div>
            <p className="text-xs font-semibold text-emerald-800">
              AI Engine Active
            </p>

            <p className="mt-0.5 text-[11px] text-emerald-600">
              Semantic commerce ready
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
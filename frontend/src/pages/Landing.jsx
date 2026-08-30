import { Link } from "react-router-dom";

function Landing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-4xl text-center">
        <span className="rounded-full bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300">
          AI Powered Commerce
        </span>

        <h1 className="mt-8 text-5xl font-bold tracking-tight text-white">
          AgentPass Commerce
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
          Intelligent product discovery connecting merchant catalogues
          with natural language customer intent.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/merchant"
            className="rounded-3xl border border-slate-700 bg-slate-900 p-8 text-left transition hover:border-indigo-500"
          >
            <p className="text-sm font-semibold text-indigo-400">
              FOR MERCHANTS
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Merchant Portal
            </h2>

            <p className="mt-3 text-slate-400">
              Manage products, catalogue, stock and commerce
              operations.
            </p>
          </Link>

          <Link
            to="/assistant"
            className="rounded-3xl bg-indigo-600 p-8 text-left transition hover:bg-indigo-500"
          >
            <p className="text-sm font-semibold text-indigo-100">
              FOR CUSTOMERS
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              AI Shopping Assistant
            </h2>

            <p className="mt-3 text-indigo-100">
              Describe what you need and let AI discover the most
              relevant products.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;
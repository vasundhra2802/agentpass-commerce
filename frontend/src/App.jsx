import {
  Routes,
  Route,
} from "react-router-dom";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import AIAssistant from "./pages/AIAssistant";
import Transactions from "./pages/Transactions";
import AuditLogs from "./pages/AuditLogs";
import Cart from "./pages/Cart";

import {
  CartProvider,
} from "./context/CartContext";

function App() {
  return (
    <CartProvider>
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/merchant"
          element={<Dashboard />}
        />

        <Route
          path="/products"
          element={<Products />}
        />

        <Route
          path="/products/add"
          element={<AddProduct />}
        />

        <Route
          path="/assistant"
          element={<AIAssistant />}
        />

        <Route
          path="/transactions"
          element={<Transactions />}
        />

        <Route
          path="/audit-logs"
          element={<AuditLogs />}
        />

        <Route
          path="/cart"
          element={<Cart />}
        />
      </Routes>
    </CartProvider>
  );
}

export default App;
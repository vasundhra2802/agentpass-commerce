import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "agentpass-cart";

function loadStoredCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return {
        cart: [],
        detectedBudget: null,
      };
    }

    const parsed = JSON.parse(stored);

    return {
      cart: Array.isArray(parsed.cart)
        ? parsed.cart
        : [],
      detectedBudget:
        parsed.detectedBudget ?? null,
    };
  } catch {
    return {
      cart: [],
      detectedBudget: null,
    };
  }
}

export function CartProvider({ children }) {
  const storedState = loadStoredCart();

  const [cart, setCart] = useState(
    storedState.cart
  );

  const [
    detectedBudget,
    setDetectedBudget,
  ] = useState(
    storedState.detectedBudget
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cart,
        detectedBudget,
      })
    );
  }, [cart, detectedBudget]);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingItem =
        currentCart.find(
          (item) =>
            item.id === product.id
        );

      if (existingItem) {
        if (
          existingItem.quantity >=
          Number(product.stock)
        ) {
          return currentCart;
        }

        return currentCart.map(
          (item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
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

  const increaseQuantity = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (
          item.quantity >=
          Number(item.stock)
        ) {
          return item;
        }

        return {
          ...item,
          quantity:
            item.quantity + 1,
        };
      })
    );
  };

  const decreaseQuantity = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  const removeFromCart = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item.id !== productId
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDetectedBudget(null);
  };

  const cartItemCount = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.quantity),
        0
      ),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price) *
            Number(item.quantity),
        0
      ),
    [cart]
  );

  const value = {
    cart,
    setCart,

    detectedBudget,
    setDetectedBudget,

    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,

    cartItemCount,
    cartTotal,
  };

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}
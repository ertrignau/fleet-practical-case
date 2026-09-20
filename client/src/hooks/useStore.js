import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

function useStore({
  activeTab,
  setStatusMessage,
  setErrors,
}) {
  const [products, setProducts] =
    useState([]);

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(false);

  const [cart, setCart] =
    useState([]);

  const [
    loadingCart,
    setLoadingCart,
  ] = useState(false);

  const [orders, setOrders] =
    useState([]);

  const [
    loadingOrders,
    setLoadingOrders,
  ] = useState(false);

  const [
    creatingOrder,
    setCreatingOrder,
  ] = useState(false);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.line_total,
      0,
    );
  }, [cart]);

  const fetchProducts =
    useCallback(async () => {
      setLoadingProducts(true);

      try {
        const response =
          await fetch("/api/products");

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.message ||
              "Could not load product",
          );
        }

        setProducts(
          Array.isArray(json)
            ? json
            : [],
        );
      } catch (error) {
        setErrors((prev) => [
          ...prev,
          `Products fetch failed: ${error.message}`,
        ]);
      } finally {
        setLoadingProducts(false);
      }
    }, [setErrors]);

  const fetchCart =
    useCallback(async () => {
      setLoadingCart(true);

      try {
        const response =
          await fetch("/api/cart");

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.message ||
              "Could not load cart",
          );
        }

        setCart(
          Array.isArray(json)
            ? json
            : [],
        );
      } catch (error) {
        setErrors((prev) => [
          ...prev,
          `Cart fetch failed: ${error.message}`,
        ]);
      } finally {
        setLoadingCart(false);
      }
    }, [setErrors]);

  const fetchOrders =
    useCallback(async () => {
      setLoadingOrders(true);

      try {
        const response =
          await fetch("/api/orders");

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.message ||
              "Could not load orders",
          );
        }

        setOrders(
          Array.isArray(json)
            ? json
            : [],
        );
      } catch (error) {
        setErrors((prev) => [
          ...prev,
          `Orders fetch failed: ${error.message}`,
        ]);
      } finally {
        setLoadingOrders(false);
      }
    }, [setErrors]);

  useEffect(() => {
    if (activeTab === "catalog") {
      fetchProducts();
      fetchCart();
    }
  }, [
    activeTab,
    fetchProducts,
    fetchCart,
  ]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [
    activeTab,
    fetchOrders,
  ]);

  async function addToCart(
    variantId,
  ) {
    try {
      const response = await fetch(
        "/api/cart/items",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            variantId,
          }),
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not add item to cart",
        );
      }

      setStatusMessage(
        "Item added to cart",
      );

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Add to cart failed: ${error.message}`,
      ]);
    }
  }

  async function updateCartQuantity(
    variantId,
    quantity,
  ) {
    if (quantity < 1) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cart/items/${variantId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            quantity,
          }),
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not update cart item",
        );
      }

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Cart update failed: ${error.message}`,
      ]);
    }
  }

  async function removeCartItem(
    variantId,
  ) {
    try {
      const response = await fetch(
        `/api/cart/items/${variantId}`,
        {
          method: "DELETE",
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not remove cart item",
        );
      }

      setStatusMessage(
        "Item removed from cart",
      );

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Cart remove failed: ${error.message}`,
      ]);
    }
  }

  async function createOrder() {
    if (cart.length === 0) {
      return;
    }

    setCreatingOrder(true);

    try {
      const response =
        await fetch("/api/orders", {
          method: "POST",
        });

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not create order",
        );
      }

      setStatusMessage(
        `Order #${json.orderId} created`,
      );

      await Promise.all([
        fetchCart(),
        fetchProducts(),
        fetchOrders(),
      ]);
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Order creation failed: ${error.message}`,
      ]);
    } finally {
      setCreatingOrder(false);
    }
  }

  return {
    products,
    loadingProducts,

    cart,
    loadingCart,
    cartTotal,

    orders,
    loadingOrders,

    creatingOrder,

    fetchProducts,
    fetchCart,
    fetchOrders,

    addToCart,
    updateCartQuantity,
    removeCartItem,
    createOrder,
  };
}

export default useStore;
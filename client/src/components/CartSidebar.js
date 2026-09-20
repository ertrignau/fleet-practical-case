function CartSidebar({
  cart,
  loadingCart,
  creatingOrder,
  cartTotal,
  onUpdateQuantity,
  onRemove,
  onCreateOrder,
}) {
  return (
    <aside className="cart-sidebar">
      <h3>Cart</h3>

      {loadingCart ? <p>Loading cart...</p> : null}

      {!loadingCart && cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : null}

      {!loadingCart && cart.length > 0 ? (
        <>
          {cart.map((item) => (
            <div
              key={item.product_variant_id}
              className="cart-item"
            >
              <strong>{item.name}</strong>

              <p>{item.configuration}</p>

              <p>
                {item.unit_price.toFixed(2)} € each
              </p>

              <div className="cart-actions">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateQuantity(
                      item.product_variant_id,
                      item.quantity - 1,
                    )
                  }
                  disabled={item.quantity <= 1}
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateQuantity(
                      item.product_variant_id,
                      item.quantity + 1,
                    )
                  }
                  disabled={item.quantity >= item.stock}
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(item.product_variant_id)
                  }
                >
                  Remove
                </button>
              </div>

              <p>
                <strong>
                  {item.line_total.toFixed(2)} €
                </strong>
              </p>
            </div>
          ))}

          <hr />

          <p>
            <strong>Total: {cartTotal.toFixed(2)} €</strong>
          </p>

          <button
            type="button"
            onClick={onCreateOrder}
            disabled={creatingOrder}
          >
            {creatingOrder
              ? "Creating order..."
              : "Create order"}
          </button>
        </>
      ) : null}
    </aside>
  );
}

export default CartSidebar;
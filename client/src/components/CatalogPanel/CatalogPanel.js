import CartSidebar from "../CartSidebar/CartSidebar";
import "./CatalogPanel.css";

function CatalogPanel({
  products,
  loadingProducts,
  cart,
  loadingCart,
  creatingOrder,
  cartTotal,
  onAddToCart,
  onUpdateQuantity,
  onRemove,
  onCreateOrder,
}) {
  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <section className="panel">
      <h2>Catalog</h2>

      <p>Cart items: {cartItemCount}</p>

      {loadingProducts ? (
        <p>Loading catalog...</p>
      ) : null}

      <div className="catalog-layout">
        <div>
          {!loadingProducts && products.length === 0 ? (
            <p>No products available.</p>
          ) : null}

          {!loadingProducts && products.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Configuration</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const price =
                    product.base_price +
                    product.price_delta;

                  return (
                    <tr key={product.variant_id}>
                      <td>{product.name}</td>
                      <td>{product.configuration}</td>
                      <td>{product.sku}</td>
                      <td>{price.toFixed(2)} €</td>

                      <td>
                        {product.stock > 0
                          ? product.stock
                          : "Out of stock"}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            onAddToCart(product.variant_id)
                          }
                          disabled={product.stock <= 0}
                        >
                          Add to cart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        <CartSidebar
          cart={cart}
          loadingCart={loadingCart}
          creatingOrder={creatingOrder}
          cartTotal={cartTotal}
          onUpdateQuantity={onUpdateQuantity}
          onRemove={onRemove}
          onCreateOrder={onCreateOrder}
        />
      </div>
    </section>
  );
}

export default CatalogPanel;
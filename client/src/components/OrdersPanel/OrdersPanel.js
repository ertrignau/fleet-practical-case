import "./OrdersPanel.css"

function OrdersPanel({
  orders,
  loadingOrders,
}) {
  return (
    <section className="panel">
      <h2>Orders</h2>

      {loadingOrders ? (
        <p>Loading orders...</p>
      ) : null}

      {!loadingOrders &&
      orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : null}

      {!loadingOrders &&
      orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order) => (
            <article
              key={order.id}
              className="order-card"
            >
              <div className="order-header">
                <h3>
                  Order #{order.id}
                </h3>

                <p>
                  {new Date(
                    order.created_at,
                  ).toLocaleString()}
                </p>
              </div>

              <p>
                <strong>
                  Items:
                </strong>{" "}
                {order.item_count}
              </p>

              <p>
                <strong>
                  Total:
                </strong>{" "}
                {order.total_amount.toFixed(
                  2,
                )}{" "}
                €
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>
                      Configuration
                    </th>
                    <th>SKU</th>
                    <th>
                      Unit price
                    </th>
                    <th>
                      Quantity
                    </th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {order.items.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >
                        <td>
                          {
                            item.product_name
                          }
                        </td>

                        <td>
                          {
                            item.configuration
                          }
                        </td>

                        <td>
                          {item.sku}
                        </td>

                        <td>
                          {item.unit_price.toFixed(
                            2,
                          )}{" "}
                          €
                        </td>

                        <td>
                          {
                            item.quantity
                          }
                        </td>

                        <td>
                          {item.line_total.toFixed(
                            2,
                          )}{" "}
                          €
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default OrdersPanel;
const express = require("express");

const {
  dbRun,
  dbAll,
} = require("../db/database");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const cartItems = await dbAll(`
      SELECT
        ci.product_variant_id,
        ci.quantity,
        p.id AS product_id,
        p.name AS product_name,
        pv.configuration,
        pv.sku,
        pv.stock,
        (
          p.base_price +
          pv.price_delta
        ) AS unit_price
      FROM cart_items ci
      JOIN product_variants pv
        ON pv.id =
          ci.product_variant_id
      JOIN products p
        ON p.id =
          pv.product_id
      WHERE p.status = 'active'
      ORDER BY
        ci.product_variant_id
    `);

    if (cartItems.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const unavailableItem =
      cartItems.find(
        (item) =>
          item.quantity > item.stock,
      );

    if (unavailableItem) {
      return res.status(400).json({
        message:
          "One or more cart items exceed available stock",
      });
    }

    const itemCount =
      cartItems.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      );

    const totalAmount = Number(
      cartItems
        .reduce(
          (total, item) =>
            total +
            item.unit_price *
              item.quantity,
          0,
        )
        .toFixed(2),
    );

    await dbRun("BEGIN TRANSACTION");

    try {
      const order = await dbRun(
        `
          INSERT INTO orders (
            total_amount,
            item_count
          )
          VALUES (?, ?)
        `,
        [
          totalAmount,
          itemCount,
        ],
      );

      for (const item of cartItems) {
        const lineTotal = Number(
          (
            item.unit_price *
            item.quantity
          ).toFixed(2),
        );

        await dbRun(
          `
            INSERT INTO order_items (
              order_id,
              product_id,
              product_variant_id,
              product_name,
              configuration,
              sku,
              unit_price,
              quantity,
              line_total
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `,
          [
            order.lastID,
            item.product_id,
            item.product_variant_id,
            item.product_name,
            item.configuration,
            item.sku,
            item.unit_price,
            item.quantity,
            lineTotal,
          ],
        );

        const stockUpdate =
          await dbRun(
            `
              UPDATE product_variants
              SET stock = stock - ?
              WHERE id = ?
                AND stock >= ?
            `,
            [
              item.quantity,
              item.product_variant_id,
              item.quantity,
            ],
          );

        if (
          stockUpdate.changes === 0
        ) {
          throw new Error(
            `Insufficient stock for variant ${item.product_variant_id}`,
          );
        }
      }

      await dbRun(
        "DELETE FROM cart_items",
      );

      await dbRun("COMMIT");

      return res.status(201).json({
        success: true,
        orderId: order.lastID,
        totalAmount,
        itemCount,
      });
    } catch (error) {
      await dbRun("ROLLBACK");
      throw error;
    }
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to create order",
      detail: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT
        o.id AS order_id,
        o.total_amount,
        o.item_count,
        o.created_at
          AS order_created_at,

        oi.id
          AS order_item_id,
        oi.product_id,
        oi.product_variant_id,
        oi.product_name,
        oi.configuration,
        oi.sku,
        oi.unit_price,
        oi.quantity,
        oi.line_total

      FROM orders o

      LEFT JOIN order_items oi
        ON oi.order_id = o.id

      ORDER BY
        o.id DESC,
        oi.id ASC
    `);

    const ordersById =
      new Map();

    for (const row of rows) {
      if (
        !ordersById.has(
          row.order_id,
        )
      ) {
        ordersById.set(
          row.order_id,
          {
            id: row.order_id,
            total_amount:
              row.total_amount,
            item_count:
              row.item_count,
            created_at:
              row.order_created_at,
            items: [],
          },
        );
      }

      if (
        row.order_item_id !== null
      ) {
        ordersById
          .get(row.order_id)
          .items.push({
            id:
              row.order_item_id,
            product_id:
              row.product_id,
            product_variant_id:
              row.product_variant_id,
            product_name:
              row.product_name,
            configuration:
              row.configuration,
            sku:
              row.sku,
            unit_price:
              row.unit_price,
            quantity:
              row.quantity,
            line_total:
              row.line_total,
          });
      }
    }

    return res.json(
      Array.from(
        ordersById.values(),
      ),
    );
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to fetch orders",
      detail: error.message,
    });
  }
});

module.exports = router;
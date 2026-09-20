const express = require("express");

const {
  dbRun,
  dbAll,
  dbGet,
} = require("../db/database");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cart = await dbAll(`
      SELECT
        ci.product_variant_id,
        ci.quantity,
        p.id AS product_id,
        p.name,
        pv.configuration,
        pv.sku,
        pv.stock,
        p.base_price,
        pv.price_delta,
        (
          p.base_price + pv.price_delta
        ) AS unit_price,
        (
          p.base_price + pv.price_delta
        ) * ci.quantity AS line_total
      FROM cart_items ci
      JOIN product_variants pv
        ON pv.id = ci.product_variant_id
      JOIN products p
        ON p.id = pv.product_id
      ORDER BY p.id, pv.id
    `);

    res.json(cart);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch cart",
      detail: error.message,
    });
  }
});

router.post("/items", async (req, res) => {
  const variantId =
    Number(req.body?.variantId);

  if (!variantId) {
    return res.status(400).json({
      message:
        "Invalid product variant id",
    });
  }

  try {
    const variant = await dbGet(
      `
        SELECT
          pv.id,
          pv.stock
        FROM product_variants pv
        JOIN products p
          ON p.id = pv.product_id
        WHERE pv.id = ?
          AND p.status = 'active'
      `,
      [variantId],
    );

    if (!variant) {
      return res.status(404).json({
        message:
          "Product variant not found",
      });
    }

    if (variant.stock <= 0) {
      return res.status(400).json({
        message:
          "Product variant is out of stock",
      });
    }

    const cartItem = await dbGet(
      `
        SELECT quantity
        FROM cart_items
        WHERE product_variant_id = ?
      `,
      [variantId],
    );

    const nextQuantity =
      (cartItem?.quantity || 0) + 1;

    if (nextQuantity > variant.stock) {
      return res.status(400).json({
        message:
          "Requested quantity exceeds available stock",
      });
    }

    await dbRun(
      `
        INSERT INTO cart_items (
          product_variant_id,
          quantity
        )
        VALUES (?, 1)
        ON CONFLICT(product_variant_id)
        DO UPDATE
          SET quantity = quantity + 1
      `,
      [variantId],
    );

    return res.status(201).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to add item to cart",
      detail: error.message,
    });
  }
});

router.patch(
  "/items/:variantId",
  async (req, res) => {
    const variantId =
      Number(req.params.variantId);

    const quantity =
      Number(req.body?.quantity);

    if (!variantId) {
      return res.status(400).json({
        message:
          "Invalid product variant id",
      });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message:
          "Quantity must be a positive integer",
      });
    }

    try {
      const variant = await dbGet(
        `
          SELECT stock
          FROM product_variants
          WHERE id = ?
        `,
        [variantId],
      );

      if (!variant) {
        return res.status(404).json({
          message:
            "Product variant not found",
        });
      }

      if (quantity > variant.stock) {
        return res.status(400).json({
          message:
            "Requested quantity exceeds available stock",
        });
      }

      const result = await dbRun(
        `
          UPDATE cart_items
          SET quantity = ?
          WHERE product_variant_id = ?
        `,
        [
          quantity,
          variantId,
        ],
      );

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Cart item not found",
        });
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to update cart item",
        detail: error.message,
      });
    }
  },
);

router.delete(
  "/items/:variantId",
  async (req, res) => {
    const variantId =
      Number(req.params.variantId);

    if (!variantId) {
      return res.status(400).json({
        message:
          "Invalid product variant id",
      });
    }

    try {
      const result = await dbRun(
        `
          DELETE FROM cart_items
          WHERE product_variant_id = ?
        `,
        [variantId],
      );

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Cart item not found",
        });
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to remove cart item",
        detail: error.message,
      });
    }
  },
);

module.exports = router;
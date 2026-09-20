const express = require("express");

const { dbAll } = require("../db/database");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const products = await dbAll(`
      SELECT
        p.id AS product_id,
        p.name,
        p.status,
        p.base_price,
        pv.id AS variant_id,
        pv.configuration,
        pv.sku,
        pv.price_delta,
        pv.stock
      FROM products p
      LEFT JOIN product_variants pv
        ON pv.product_id = p.id
      WHERE p.status = 'active'
      ORDER BY p.id, pv.id
    `);

    res.json(products);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
      detail: error.message,
    });
  }
});

module.exports = router;
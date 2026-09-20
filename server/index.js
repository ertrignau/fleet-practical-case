const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "fleet.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not open sqlite database", err);
  } else {
    console.log("Connected to sqlite database at", dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      owner_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS cart_items (
      product_variant_id INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id) ON DELETE CASCADE
    )
  `);
  });

  app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/products", (req, res) => {
  const sql = `
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
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.status = 'active'
    ORDER BY p.id, pv.id
  `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to fetch products",
          detail: err.message,
        });
      }

      res.json(rows);
    });
});

app.get("/api/cart", (req, res) => {
  const sql = `
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
      (p.base_price + pv.price_delta) AS unit_price,
      (p.base_price + pv.price_delta) * ci.quantity AS line_total
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.product_variant_id
    JOIN products p ON p.id = pv.product_id
    ORDER BY p.id, pv.id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch cart",
        detail: err.message,
      });
    }

    res.json(rows);
  });
});

app.post("/api/cart/items", (req, res) => {
  const variantId = Number(req.body?.variantId);

  if (!variantId) {
    return res.status(400).json({
      message: "Invalid product variant id",
    });
  }

  db.get(
    `
    SELECT
      pv.id,
      pv.stock
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = ?
      AND p.status = 'active'
    `,
    [variantId],
    (variantErr, variant) => {
      if (variantErr) {
        return res.status(500).json({
          message: "Failed to validate product variant",
          detail: varriantErr.message,
        });
      }

      if (!variant) {
        return res.status(404).json({
          message: "Product variant not found",
        });
      }

      if (variant.stock <= 0) {
        return res.status(400).json({
          message: "Product variant is out of stock",
        });
      }

      db.get(
        "SELECT quantity FROM cart_items WHERE product_variant_id = ?",
        [variantId],
        (cartErr, cartItem) => {
          if (cartErr) {
            return res.status(500).json({
              message: "Failed to check cart",
              detail: cartErr.message,
            });
          }

          const nextQuantity = (cartItem?.quantity || 0) + 1;

          if (nextQuantity > variant.stock) {
            return res.status(400).json({
              message: "Requested quantity exceeds available stock",
            });
          }

          db.run(
            `
              INSERT INTO cart_items (product_variant_id, quantity)
              VALUES (?, 1)
              ON CONFLICT(product_variant_id)
              DO UPDATE SET quantity = quantity + 1
            `,
            [variantId],
            function onUpsert(err) {
              if (err) {
                return res.status(500).json({
                  message: "Failed to add item to cart",
                  detail: err.message,
                });
              }

              res.status(201).json({
                success: true,
              });
            },
          );
        },
      );
    },
  );
});

app.patch("/api/cart/items/:variantId", (req, res) => {
  const variantId = Number(req.params.variantId);
  const quantity = Number(req.body?.quantity);

  if (!variantId) {
    return res.status(400).json({
      message: "Invalid product variant id",
    });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive integer",
    });
  }

  db.get(
    "SELECT stock FROM product_variants WHERE id = ?",
    [variantId],
    (variantErr, variant) => {
      if (variantErr) {
        return res.status(500).json({
          message: "Failed to validate product variant",
          detail: variantErr.message,
        });
      }

      if (!variant) {
        return res.status(404).json({
          message: "Product variant not found",
        });
      }

      if (quantity > variant.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      db.run(
        `
          UPDATE cart_items
          SET quantity = ?
          WHERE product_variant_id = ?
        `,
        [quantity, variantId],
        function onUpdate(err) {
          if (err) {
            return res.status(500).json({
              message: "Failed to update cart item",
              detail: err.message,
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              message: "Cart item not found",
            });
          }

          res.json({
            success: true,
          });
        },
      );
    },
  );
});

app.delete("/api/cart/items/:variantId", (req, res) => {
  const variantId = Number(req.params.variantId);

  if (!variantId) {
    return res.status(400).json({
      message: "Invalid product variant id",
    });
  }

  db.run(
    "DELETE FROM cart_items WHERE product_variant_id = ?",
    [variantId],
    function onDelete(err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to remove cart item",
          detail: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Cart item not found",
        });
      }

      res.json({
        success: true,
      });
    },
  );
});

app.get("/api/employees", (req, res) => {
  const role = req.query.role || "";
  const search = req.query.search || "";
  let sql = `
    SELECT
      e.id,
      e.name,
      e.role,
      e.created_at,
      COUNT(d.id) AS device_count
    FROM employees e
    LEFT JOIN devices d ON d.owner_id = e.id
    WHERE 1 = 1
  `;
  const params = [];

  if (role) {
    sql += " AND e.role = ?";
    params.push(role);
  }

  if (search) {
    sql += " AND (LOWER(e.name) LIKE ? OR LOWER(e.role) LIKE ?)";
    params.push(`%${search.toLowerCase()}%`);
    params.push(`%${search.toLowerCase()}%`);
  }

  sql += " GROUP BY e.id ORDER BY e.id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch employees", detail: err.message });
    }
    res.json(rows);
  });
});

app.get("/api/employees/:id", (req, res) => {
  const employeeId = Number(req.params.id);
  if (!employeeId) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  db.get(
    "SELECT id, name, role, created_at FROM employees WHERE id = ?",
    [employeeId],
    (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch employee", detail: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: "Employee not found" });
      }
      return res.json(row);
    },
  );
});

app.post("/api/employees", (req, res) => {
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const role = (payload.role || "").toString().trim();

  if (!name || !role) {
    return res.status(400).json({ message: "Both name and role are required" });
  }

  db.run(
    "INSERT INTO employees (name, role) VALUES (?, ?)",
    [name, role],
    function onInsert(err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to create employee", detail: err.message });
      }

      db.get(
        "SELECT id, name, role, created_at FROM employees WHERE id = ?",
        [this.lastID],
        (fetchErr, row) => {
          if (fetchErr) {
            return res
              .status(500)
              .json({ message: "Created employee but failed to fetch it" });
          }
          res.status(201).json(row);
        },
      );
    },
  );
});

app.put("/api/employees/:id", (req, res) => {
  const employeeId = Number(req.params.id);
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const role = (payload.role || "").toString().trim();

  if (!employeeId) {
    return res.status(400).json({ message: "Invalid employee id" });
  }
  if (!name || !role) {
    return res.status(400).json({ message: "Both name and role are required" });
  }

  db.run(
    "UPDATE employees SET name = ?, role = ? WHERE id = ?",
    [name, role, employeeId],
    function onUpdate(err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to update employee", detail: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "Employee not found" });
      }

      db.get(
        "SELECT id, name, role, created_at FROM employees WHERE id = ?",
        [employeeId],
        (fetchErr, row) => {
          if (fetchErr) {
            return res
              .status(500)
              .json({ message: "Employee updated but fetch failed" });
          }
          res.json(row);
        },
      );
    },
  );
});

app.delete("/api/employees/:id", (req, res) => {
  const employeeId = Number(req.params.id);
  if (!employeeId) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  db.serialize(() => {
    db.run(
      "UPDATE devices SET owner_id = NULL WHERE owner_id = ?",
      [employeeId],
      (unassignErr) => {
        if (unassignErr) {
          return res
            .status(500)
            .json({ message: "Failed to unassign employee devices" });
        }

        db.run(
          "DELETE FROM employees WHERE id = ?",
          [employeeId],
          function onDelete(err) {
            if (err) {
              return res.status(500).json({
                message: "Failed to delete employee",
                detail: err.message,
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({ message: "Employee not found" });
            }

            res.json({ success: true });
          },
        );
      },
    );
  });
});

app.get("/api/devices", (req, res) => {
  const type = req.query.type || "";
  const ownerId = req.query.ownerId || "";
  const search = req.query.search || "";

  let sql = `
    SELECT
      d.id,
      d.name,
      d.type,
      d.owner_id,
      d.created_at
    FROM devices d
    WHERE 1 = 1
  `;
  const params = [];

  if (type) {
    sql += " AND d.type = ?";
    params.push(type);
  }

  if (ownerId) {
    sql += " AND d.owner_id = ?";
    params.push(ownerId);
  }

  if (search) {
    sql += " AND (LOWER(d.name) LIKE ? OR LOWER(d.type) LIKE ?)";
    params.push(`%${search.toLowerCase()}%`);
    params.push(`%${search.toLowerCase()}%`);
  }

  sql += " ORDER BY d.id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch devices", detail: err.message });
    }
    res.json(rows);
  });
});

app.post("/api/devices", (req, res) => {
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const type = (payload.type || "").toString().trim();
  const ownerId = payload.ownerId ? Number(payload.ownerId) : null;

  if (!name || !type) {
    return res.status(400).json({ message: "Both name and type are required" });
  }

  const insertRecord = () => {
    db.run(
      "INSERT INTO devices (name, type, owner_id) VALUES (?, ?, ?)",
      [name, type, ownerId],
      function onInsert(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to create device", detail: err.message });
        }

        db.get(
          `
          SELECT
            d.id,
            d.name,
            d.type,
            d.owner_id,
            d.created_at,
            e.name AS owner_name
          FROM devices d
          LEFT JOIN employees e ON e.id = d.owner_id
          WHERE d.id = ?
          `,
          [this.lastID],
          (fetchErr, row) => {
            if (fetchErr) {
              return res
                .status(500)
                .json({ message: "Created device but failed to fetch it" });
            }
            res.status(201).json(row);
          },
        );
      },
    );
  };

  if (!ownerId) {
    return insertRecord();
  }

  db.get(
    "SELECT id FROM employees WHERE id = ?",
    [ownerId],
    (ownerErr, ownerRow) => {
      if (ownerErr) {
        return res.status(500).json({
          message: "Failed to validate owner",
          detail: ownerErr.message,
        });
      }
      if (!ownerRow) {
        return res
          .status(400)
          .json({ message: "Owner employee does not exist" });
      }
      insertRecord();
    },
  );
});

app.put("/api/devices/:id", (req, res) => {
  const deviceId = Number(req.params.id);
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const type = (payload.type || "").toString().trim();
  const ownerId = payload.ownerId ? Number(payload.ownerId) : null;

  if (!deviceId) {
    return res.status(400).json({ message: "Invalid device id" });
  }
  if (!name || !type) {
    return res.status(400).json({ message: "Both name and type are required" });
  }

  const updateRecord = () => {
    db.run(
      "UPDATE devices SET name = ?, type = ?, owner_id = ? WHERE id = ?",
      [name, type, ownerId, deviceId],
      function onUpdate(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to update device", detail: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "Device not found" });
        }

        db.get(
          `
          SELECT
            d.id,
            d.name,
            d.type,
            d.owner_id,
            d.created_at,
            e.name AS owner_name
          FROM devices d
          LEFT JOIN employees e ON e.id = d.owner_id
          WHERE d.id = ?
          `,
          [deviceId],
          (fetchErr, row) => {
            if (fetchErr) {
              return res
                .status(500)
                .json({ message: "Device updated but fetch failed" });
            }
            res.json(row);
          },
        );
      },
    );
  };

  if (!ownerId) {
    return updateRecord();
  }

  db.get(
    "SELECT id FROM employees WHERE id = ?",
    [ownerId],
    (ownerErr, ownerRow) => {
      if (ownerErr) {
        return res.status(500).json({
          message: "Failed to validate owner",
          detail: ownerErr.message,
        });
      }
      if (!ownerRow) {
        return res
          .status(400)
          .json({ message: "Owner employee does not exist" });
      }
      updateRecord();
    },
  );
});

app.delete("/api/devices/:id", (req, res) => {
  const deviceId = Number(req.params.id);
  if (!deviceId) {
    return res.status(400).json({ message: "Invalid device id" });
  }

  db.run(
    "DELETE FROM devices WHERE id = ?",
    [deviceId],
    function onDelete(err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to delete device", detail: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json({ success: true });
    },
  );
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

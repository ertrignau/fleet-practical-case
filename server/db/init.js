const { db } = require("./database");

function initializeDatabase() {
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
        FOREIGN KEY (owner_id)
          REFERENCES employees(id)
          ON DELETE SET NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS cart_items (
        product_variant_id INTEGER PRIMARY KEY,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        FOREIGN KEY (product_variant_id)
          REFERENCES product_variants(id)
          ON DELETE CASCADE
      )
    `);
  });
}

module.exports = initializeDatabase;
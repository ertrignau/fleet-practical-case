const express = require("express");
const cors = require("cors");

const initializeDatabase =
  require("./db/init");

const employeeRoutes =
  require("./routes/employees");

const deviceRoutes =
  require("./routes/devices");

const productRoutes =
  require("./routes/products");

const cartRoutes =
  require("./routes/cart");

const orderRoutes =
  require("./routes/orders");

const app = express();

const PORT =
  process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initializeDatabase();

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp:
      new Date().toISOString(),
  });
});

app.use(
  "/api/employees",
  employeeRoutes,
);

app.use(
  "/api/devices",
  deviceRoutes,
);

app.use(
  "/api/products",
  productRoutes,
);

app.use(
  "/api/cart",
  cartRoutes,
);

app.use(
  "/api/orders",
  orderRoutes,
);

app.listen(PORT, () => {
  console.log(
    `API running on http://localhost:${PORT}`,
  );
});
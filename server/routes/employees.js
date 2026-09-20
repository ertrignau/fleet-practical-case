const express = require("express");

const {
  dbRun,
  dbAll,
  dbGet,
} = require("../db/database");

const router = express.Router();

router.get("/", async (req, res) => {
  const role =
    req.query.role || "";

  const search =
    req.query.search || "";

  let sql = `
    SELECT
      e.id,
      e.name,
      e.role,
      e.created_at,
      COUNT(d.id) AS device_count
    FROM employees e
    LEFT JOIN devices d
      ON d.owner_id = e.id
    WHERE 1 = 1
  `;

  const params = [];

  if (role) {
    sql += " AND e.role = ?";
    params.push(role);
  }

  if (search) {
    sql += `
      AND (
        LOWER(e.name) LIKE ?
        OR LOWER(e.role) LIKE ?
      )
    `;

    const normalizedSearch =
      `%${search.toLowerCase()}%`;

    params.push(
      normalizedSearch,
      normalizedSearch,
    );
  }

  sql += `
    GROUP BY e.id
    ORDER BY e.id DESC
  `;

  try {
    const employees =
      await dbAll(sql, params);

    return res.json(employees);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to fetch employees",
      detail: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  const employeeId =
    Number(req.params.id);

  if (!employeeId) {
    return res.status(400).json({
      message:
        "Invalid employee id",
    });
  }

  try {
    const employee = await dbGet(
      `
        SELECT
          id,
          name,
          role,
          created_at
        FROM employees
        WHERE id = ?
      `,
      [employeeId],
    );

    if (!employee) {
      return res.status(404).json({
        message:
          "Employee not found",
      });
    }

    return res.json(employee);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to fetch employee",
      detail: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  const payload = req.body || {};

  const name =
    (payload.name || "")
      .toString()
      .trim();

  const role =
    (payload.role || "")
      .toString()
      .trim();

  if (!name || !role) {
    return res.status(400).json({
      message:
        "Both name and role are required",
    });
  }

  try {
    const result = await dbRun(
      `
        INSERT INTO employees (
          name,
          role
        )
        VALUES (?, ?)
      `,
      [name, role],
    );

    const employee = await dbGet(
      `
        SELECT
          id,
          name,
          role,
          created_at
        FROM employees
        WHERE id = ?
      `,
      [result.lastID],
    );

    return res
      .status(201)
      .json(employee);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to create employee",
      detail: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const employeeId =
    Number(req.params.id);

  const payload = req.body || {};

  const name =
    (payload.name || "")
      .toString()
      .trim();

  const role =
    (payload.role || "")
      .toString()
      .trim();

  if (!employeeId) {
    return res.status(400).json({
      message:
        "Invalid employee id",
    });
  }

  if (!name || !role) {
    return res.status(400).json({
      message:
        "Both name and role are required",
    });
  }

  try {
    const result = await dbRun(
      `
        UPDATE employees
        SET
          name = ?,
          role = ?
        WHERE id = ?
      `,
      [
        name,
        role,
        employeeId,
      ],
    );

    if (result.changes === 0) {
      return res.status(404).json({
        message:
          "Employee not found",
      });
    }

    const employee = await dbGet(
      `
        SELECT
          id,
          name,
          role,
          created_at
        FROM employees
        WHERE id = ?
      `,
      [employeeId],
    );

    return res.json(employee);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to update employee",
      detail: error.message,
    });
  }
});

router.delete(
  "/:id",
  async (req, res) => {
    const employeeId =
      Number(req.params.id);

    if (!employeeId) {
      return res.status(400).json({
        message:
          "Invalid employee id",
      });
    }

    try {
      await dbRun(
        `
          UPDATE devices
          SET owner_id = NULL
          WHERE owner_id = ?
        `,
        [employeeId],
      );

      const result = await dbRun(
        `
          DELETE FROM employees
          WHERE id = ?
        `,
        [employeeId],
      );

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Employee not found",
        });
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to delete employee",
        detail: error.message,
      });
    }
  },
);

module.exports = router;
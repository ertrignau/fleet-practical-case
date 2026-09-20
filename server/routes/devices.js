const express = require("express");

const {
  dbRun,
  dbAll,
  dbGet,
} = require("../db/database");

const router = express.Router();

async function findDeviceById(
  deviceId,
) {
  return dbGet(
    `
      SELECT
        d.id,
        d.name,
        d.type,
        d.owner_id,
        d.created_at,
        e.name AS owner_name
      FROM devices d
      LEFT JOIN employees e
        ON e.id = d.owner_id
      WHERE d.id = ?
    `,
    [deviceId],
  );
}

async function ownerExists(
  ownerId,
) {
  if (!ownerId) {
    return true;
  }

  const owner = await dbGet(
    `
      SELECT id
      FROM employees
      WHERE id = ?
    `,
    [ownerId],
  );

  return Boolean(owner);
}

router.get("/", async (req, res) => {
  const type =
    req.query.type || "";

  const ownerId =
    req.query.ownerId || "";

  const search =
    req.query.search || "";

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
    sql +=
      " AND d.owner_id = ?";

    params.push(ownerId);
  }

  if (search) {
    sql += `
      AND (
        LOWER(d.name) LIKE ?
        OR LOWER(d.type) LIKE ?
      )
    `;

    const normalizedSearch =
      `%${search.toLowerCase()}%`;

    params.push(
      normalizedSearch,
      normalizedSearch,
    );
  }

  sql += " ORDER BY d.id DESC";

  try {
    const devices =
      await dbAll(sql, params);

    return res.json(devices);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to fetch devices",
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

  const type =
    (payload.type || "")
      .toString()
      .trim();

  const ownerId =
    payload.ownerId
      ? Number(payload.ownerId)
      : null;

  if (!name || !type) {
    return res.status(400).json({
      message:
        "Both name and type are required",
    });
  }

  try {
    if (
      ownerId &&
      !(await ownerExists(ownerId))
    ) {
      return res.status(400).json({
        message:
          "Owner employee does not exist",
      });
    }

    const result = await dbRun(
      `
        INSERT INTO devices (
          name,
          type,
          owner_id
        )
        VALUES (?, ?, ?)
      `,
      [
        name,
        type,
        ownerId,
      ],
    );

    const device =
      await findDeviceById(
        result.lastID,
      );

    return res
      .status(201)
      .json(device);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to create device",
      detail: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const deviceId =
    Number(req.params.id);

  const payload = req.body || {};

  const name =
    (payload.name || "")
      .toString()
      .trim();

  const type =
    (payload.type || "")
      .toString()
      .trim();

  const ownerId =
    payload.ownerId
      ? Number(payload.ownerId)
      : null;

  if (!deviceId) {
    return res.status(400).json({
      message:
        "Invalid device id",
    });
  }

  if (!name || !type) {
    return res.status(400).json({
      message:
        "Both name and type are required",
    });
  }

  try {
    if (
      ownerId &&
      !(await ownerExists(ownerId))
    ) {
      return res.status(400).json({
        message:
          "Owner employee does not exist",
      });
    }

    const result = await dbRun(
      `
        UPDATE devices
        SET
          name = ?,
          type = ?,
          owner_id = ?
        WHERE id = ?
      `,
      [
        name,
        type,
        ownerId,
        deviceId,
      ],
    );

    if (result.changes === 0) {
      return res.status(404).json({
        message:
          "Device not found",
      });
    }

    const device =
      await findDeviceById(
        deviceId,
      );

    return res.json(device);
  } catch (error) {
    return res.status(500).json({
      message:
        "Failed to update device",
      detail: error.message,
    });
  }
});

router.delete(
  "/:id",
  async (req, res) => {
    const deviceId =
      Number(req.params.id);

    if (!deviceId) {
      return res.status(400).json({
        message:
          "Invalid device id",
      });
    }

    try {
      const result = await dbRun(
        `
          DELETE FROM devices
          WHERE id = ?
        `,
        [deviceId],
      );

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Device not found",
        });
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to delete device",
        detail: error.message,
      });
    }
  },
);

module.exports = router;
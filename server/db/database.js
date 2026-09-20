const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(
  __dirname,
  "..",
  "fleet.sqlite",
);

const db = new sqlite3.Database(
  dbPath,
  (err) => {
    if (err) {
      console.error(
        "Could not open sqlite database",
        err,
      );
      return;
    }

    console.log(
      "Connected to sqlite database at",
      dbPath,
    );
  },
);

function dbRun(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.run(
        sql,
        params,
        function onRun(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            lastID: this.lastID,
            changes: this.changes,
          });
        },
      );
    },
  );
}

function dbAll(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.all(
        sql,
        params,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows);
        },
      );
    },
  );
}

function dbGet(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.get(
        sql,
        params,
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(row);
        },
      );
    },
  );
}

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet,
};
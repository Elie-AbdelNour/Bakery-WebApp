require("dotenv").config();
const mysql = require("mysql2");
const { URL } = require("url");

let connectionConfig;
let usingDatabaseUrl = false;

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    connectionConfig = {
      host: dbUrl.hostname,
      port: dbUrl.port ? Number(dbUrl.port) : undefined,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname ? dbUrl.pathname.replace(/^\//, "") : undefined,
      // sensible defaults
      connectTimeout: 10000,
    };
    usingDatabaseUrl = true;
    console.log("Using DATABASE_URL for DB connection.");
  } catch (err) {
    console.error("Invalid DATABASE_URL:", err.message);
  }
} else {
  connectionConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  };
}

// Helper to create and connect, with optional SSL fallback for cloud providers
function createAndConnect(cfg, cb, triedSSL = false) {
  const db = mysql.createConnection(cfg);

  db.connect((err) => {
    if (err) {
      console.error("❌ Database connection failed:", err.code || err.message);

      // If using a cloud DB URL and SSL hasn't been tried, attempt with SSL disabled verification
      if (usingDatabaseUrl && !triedSSL) {
        console.log("Retrying DB connection with relaxed SSL settings...");
        const cfg2 = Object.assign({}, cfg, { ssl: { rejectUnauthorized: false } });
        return createAndConnect(cfg2, cb, true);
      }

      // fallback: return the error and the connection object (which may be unusable)
      return cb(err, null);
    }

    console.log("✅ Connected to MySQL database:", cfg.database);
    return cb(null, db);
  });
}

// Create connection and export the connected client (or throw on require-time failure)
let exportedDb = null;
createAndConnect(connectionConfig, (err, db) => {
  if (err) {
    // Log but don't throw — other parts of app can handle missing DB more gracefully
    console.error("Database final connection error:", err);
    exportedDb = {
      query: function () {
        const cb = arguments[arguments.length - 1];
        if (typeof cb === "function") cb(new Error("DB not connected"));
      },
    };
  } else {
    exportedDb = db;
  }
});

function callClientMethod(methodName, args) {
  const client = exportedDb;
  const cb = args[args.length - 1];
  if (!client || typeof client[methodName] !== "function") {
    if (typeof cb === "function") return cb(new Error("DB not connected"));
    // if no callback provided, throw to help debugging
    throw new Error("DB not connected");
  }

  return client[methodName].apply(client, args);
}

module.exports = {
  getClient: () => exportedDb,
  query: function () {
    return callClientMethod("query", Array.from(arguments));
  },
  execute: function () {
    return callClientMethod("execute", Array.from(arguments));
  },
  beginTransaction: function () {
    return callClientMethod("beginTransaction", Array.from(arguments));
  },
  commit: function () {
    return callClientMethod("commit", Array.from(arguments));
  },
  rollback: function () {
    return callClientMethod("rollback", Array.from(arguments));
  },
  end: function () {
    return callClientMethod("end", Array.from(arguments));
  },
  escape: function () {
    const client = exportedDb;
    if (!client || typeof client.escape !== "function") return mysql.escape.apply(mysql, arguments);
    return client.escape.apply(client, arguments);
  },
};

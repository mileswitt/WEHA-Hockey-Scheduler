const mysql = require("mysql2/promise");
require("dotenv").config() // get the env variables
const connectionPool = mysql.createPool
({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10, // allow up to 10 simultaneous connections to database at once
    ssl: { rejectUnauthorized: true }, // Needed by TIDB Cloud
    queueLimit: 0
});

module.exports = connectionPool;

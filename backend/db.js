const mysql = require('mysql2');
require('dotenv').config();
//https://www.geeksforgeeks.org/node-js/how-to-use-connection-pooling-with-mysql-in-nodejs/
// making a connection to the database with the credentials
// const connection = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "Chargers17#",
//   database: "weha_hockey_scheduler",
//   port: 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
// });

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  //TiDB cloud requires SSL connection
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
});

// error checking for the connection to the database
connection.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    return;
  }
  console.log("Connected to the database");
  connection.release();
});

module.exports = connection.promise();
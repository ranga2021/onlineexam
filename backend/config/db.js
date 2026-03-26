// const mysql = require("mysql2");

// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD, 
//   database: process.env.DB_NAME
// });

// // Function to handle the connection
// function connectToDatabase() {
//   db.connect(err => {
//     if (err) {
//       console.error("DB CONNECTION FAILED:", err);
//       setTimeout(connectToDatabase, 5000); // Retry after 5 seconds if connection fails
//     } else {
//       console.log("MySQL Connected");
//     }
//   });
// }

// // Handle automatic reconnection if the connection is lost
// db.on('error', err => {
//   console.error("Database error:", err);
//   if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//     // Lost connection, try to reconnect
//     connectToDatabase();
//   } else {
//     // Other types of errors
//     console.error('Unhandled MySQL error', err);
//   }
// });

// // Initial connection attempt
// connectToDatabase();

// module.exports = db;

const mysql = require("mysql2");

// Create a Connection Pool instead of a single connection
// This automatically handles reconnections and timeouts
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,     // Max number of simultaneous connections
  queueLimit: 0,
  enableKeepAlive: true,   // Keeps the connection alive
  keepAliveInitialDelay: 10000
});

// Test the pool connection on startup and run migrations
pool.getConnection((err, connection) => {
  if (err) {
    console.error("DB CONNECTION FAILED:", err.message);
  } else {
    console.log("MySQL Pool Connected successfully");

    // Alter questions table columns to TEXT to support long descriptions
    const alterStatements = [
      "ALTER TABLE questions MODIFY COLUMN question TEXT",
      "ALTER TABLE questions MODIFY COLUMN option_a TEXT",
      "ALTER TABLE questions MODIFY COLUMN option_b TEXT",
      "ALTER TABLE questions MODIFY COLUMN option_c TEXT",
      "ALTER TABLE questions MODIFY COLUMN option_d TEXT",
      "ALTER TABLE questions MODIFY COLUMN explanation TEXT",
      "ALTER TABLE questions MODIFY COLUMN explanation_1 TEXT",
      "ALTER TABLE questions MODIFY COLUMN explanation_2 TEXT",
      "ALTER TABLE questions MODIFY COLUMN explanation_3 TEXT"
    ];

    let completed = 0;
    alterStatements.forEach(sql => {
      connection.query(sql, (alterErr) => {
        if (alterErr) console.error("Migration warning:", alterErr.message);
        completed++;
        if (completed === alterStatements.length) {
          console.log("DB migrations checked successfully");
          connection.release();
        }
      });
    });
  }
});

// Export the pool. 
// mysql2 pools allow calling .query() directly, so your existing code won't break.
module.exports = pool;

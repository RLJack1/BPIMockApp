// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  //password: 'justgivememymoneyeyyy',  //PC mysqlpassword
  password: 'jackmaster', //Laptop MySQlpassword
  database: 'mydb'
});

// Test connection
db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
  } else {
    console.log('✅ MySQL connected successfully.');
  }
});

module.exports = db;
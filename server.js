const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();

app.use(express.json());
//app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM user WHERE Email = ? AND Password = ?', [email, password], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      res.json({ message: 'Login successful', user: results[0] });
    });
  });
  

// Get all users (for display)
app.get('/users', (req, res) => {
    db.query('SELECT Account_Number, First_Name, Last_Name, Email, Balance FROM user', (err, results) => {
      if (err) return res.status(500).json({ message: 'Error fetching users' });
      res.json(results);
    });
  });

  app.listen(3000, () => {
    console.log('🌐 Server running at http://localhost:3000');
  });
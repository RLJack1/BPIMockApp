const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');

// Session setup
app.use(session({
  secret: 'mock-secret',
  resave: false,
  saveUninitialized: true
}));

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM user WHERE Email = ? AND Password = ?', [email, password], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results[0];
    req.session.user = {
      firstName: user.First_Name,
      lastName: user.Last_Name,
      balance: user.Balance,
      email: user.Email
    };

    res.json({ message: 'Login successful', redirect: '/home.html' });
  });
});

// Session user info
app.get('/session-user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
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
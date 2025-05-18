const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');

// Session setup
app.use(session({
  secret: 'mock-secret',
  resave: false,
  saveUninitialized: true
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Routes
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM user WHERE Email = ? AND Password = ?', [email, password], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    // Set session
    req.session.user = {
      accountNumber: results[0].Account_Number, // added account number to session
      name: `${results[0].First_Name} ${results[0].Last_Name}`,
      balance: parseFloat(results[0].Balance)
    };

    res.json({ message: 'Login successful', redirect: '/home' });
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

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/');

  res.render('home', {
    name: req.session.user.name,
    balance: req.session.user.balance
  });
});

// route to get transactions and render transaction page
app.get('/transactions', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const accountNumber = req.session.user.accountNumber;
  const sql = `
    SELECT 
      t.Transaction_ID,
      b.Biller_Name,
      t.Transaction_Date,
      t.Transaction_Time,
      t.Amount,
      pm.Payment_Method,
      t.Reference_Number
    FROM transaction t
    JOIN biller b ON t.Biller_ID = b.Biller_ID
    JOIN payment_methods pm ON t.Payment_Method_ID = pm.Payment_ID
    WHERE t.Account_Number = ?
    ORDER BY t.Transaction_Date DESC, t.Transaction_Time DESC
  `;

  db.query(sql, [accountNumber], (err, results) => {
    if (err) {
      console.error('Transaction fetch error:', err);
      return res.sendStatus(500);
    }

    res.render('transactions', { name: req.session.user.name, transactions: results });
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
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

    res.json({ redirect: '/home' });
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

// Route to get transactions and render transaction page
app.get('/transactions', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const accountNumber = req.session.user.accountNumber;
  const sql = `
    SELECT 
      t.Transaction_ID,
      b.Biller_Name,
      t.Transaction_Timestamp,
      t.Amount,
      pm.Payment_Method,
      t.Reference_Number
    FROM transaction t
    JOIN biller b ON t.Biller_ID = b.Biller_ID
    JOIN payment_methods pm ON t.Payment_Method_ID = pm.Payment_ID
    WHERE t.Account_Number = ?
    ORDER BY t.Transaction_Timestamp DESC
  `;

  db.query(sql, [accountNumber], (err, results) => {
    if (err) {
      console.error('Transaction fetch error:', err);
      return res.sendStatus(500);
    }

    res.render('transactions', { name: req.session.user.name, transactions: results });
  });
});

// Route to display bills/billers page
app.get('/billers', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const accountNumber = req.session.user.accountNumber;
  
  // Query for bills
  const billsQuery = `
    SELECT 
      bills.Bill_ID,
      bills.Bill_Amount,
      bills.Due_Date,
      bills.Bill_Status,
      bills.Bill_Reference,
      biller.Biller_Name,
      biller.Biller_Category
    FROM bills
    JOIN biller ON bills.Biller_ID = biller.Biller_ID
    WHERE bills.Account_Number = ?
    ORDER BY bills.Due_Date ASC
  `;

  // Query for all billers
  const billersQuery = `
    SELECT 
      Biller_ID,
      Biller_Name,
      Biller_Category
    FROM biller
    ORDER BY Biller_Category, Biller_Name
  `;

  // Execute both queries
  db.query(billsQuery, [accountNumber], (err, billsResults) => {
    if (err) {
      console.error('Bills fetch error:', err);
      return res.sendStatus(500);
    }

    db.query(billersQuery, (err, billersResults) => {
      if (err) {
        console.error('Billers fetch error:', err);
        return res.sendStatus(500);
      }

      // Separate bills by status
      const pendingBills = billsResults.filter(bill => bill.Bill_Status === 'Pending');
      const paidBills = billsResults.filter(bill => bill.Bill_Status === 'Paid');
      const overdueBills = billsResults.filter(bill => bill.Bill_Status === 'Overdue');

      // Group billers by category
      const billersByCategory = {};
      billersResults.forEach(biller => {
        const category = biller.Biller_Category || 'Other';
        if (!billersByCategory[category]) {
          billersByCategory[category] = [];
        }
        billersByCategory[category].push(biller);
      });

      res.render('billers', { 
        name: req.session.user.name, 
        balance: req.session.user.balance,
        pendingBills: pendingBills,
        paidBills: paidBills,
        overdueBills: overdueBills,
        billersByCategory: billersByCategory,
        query: req.query // Pass query parameters to template
      });
    });
  });
});

// Route to display individual bill payment page
app.get('/pay-bill/:billId', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const billId = req.params.billId;
  const accountNumber = req.session.user.accountNumber;

  const billQuery = `
    SELECT 
      bills.Bill_ID,
      bills.Bill_Amount,
      bills.Due_Date,
      bills.Bill_Status,
      bills.Bill_Reference,
      biller.Biller_Name,
      biller.Biller_Category,
      biller.Biller_ID
    FROM bills
    JOIN biller ON bills.Biller_ID = biller.Biller_ID
    WHERE bills.Bill_ID = ? AND bills.Account_Number = ? AND bills.Bill_Status = 'Pending'
  `;

  db.query(billQuery, [billId, accountNumber], (err, results) => {
    if (err) {
      console.error('Bill fetch error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('Bill not found or already paid');
    }

    const bill = results[0];
    
    res.render('paybill', {
      bill: bill,
      balance: req.session.user.balance,
      name: req.session.user.name
    });
  });
});

// Route to process bill payment
app.post('/pay-bill', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { billId, paymentMethod } = req.body;
  const accountNumber = req.session.user.accountNumber;

  // Start transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).send('Payment processing failed');
    }

    // First, get the bill details and verify it's still payable
    const billQuery = `
      SELECT 
        bills.Bill_ID,
        bills.Bill_Amount,
        bills.Bill_Status,
        biller.Biller_ID,
        biller.Biller_Name
      FROM bills
      JOIN biller ON bills.Biller_ID = biller.Biller_ID
      WHERE bills.Bill_ID = ? AND bills.Account_Number = ? AND bills.Bill_Status = 'Pending'
    `;

    db.query(billQuery, [billId, accountNumber], (err, billResults) => {
      if (err) {
        return db.rollback(() => {
          console.error('Bill fetch error:', err);
          res.status(500).send('Payment processing failed');
        });
      }

      if (billResults.length === 0) {
        return db.rollback(() => {
          res.status(404).send('Bill not found or already paid');
        });
      }

      const bill = billResults[0];
      const billAmount = parseFloat(bill.Bill_Amount);

      // Check if user has sufficient balance
      if (billAmount > req.session.user.balance) {
        return db.rollback(() => {
          res.status(400).send(`Insufficient balance! You need ₱${(billAmount - req.session.user.balance).toFixed(2)} more.`);
        });
      }

      // Update user balance
      const newBalance = req.session.user.balance - billAmount;
      const updateBalanceQuery = 'UPDATE user SET Balance = ? WHERE Account_Number = ?';
      
      db.query(updateBalanceQuery, [newBalance, accountNumber], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Balance update error:', err);
            res.status(500).send('Payment processing failed');
          });
        }

        // Update bill status to 'Paid'
        const updateBillQuery = 'UPDATE bills SET Bill_Status = ? WHERE Bill_ID = ?';
        
        db.query(updateBillQuery, ['Paid', billId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Bill update error:', err);
              res.status(500).send('Payment processing failed');
            });
          }

          // Create transaction record
          const transactionQuery = `
            INSERT INTO transaction (Account_Number, Biller_ID, Transaction_Timestamp, Amount, Payment_Method_ID, Reference_Number)
            VALUES (?, ?, NOW(), ?, 1, ?)
          `;
          
          const referenceNumber = 'TXN' + Date.now().toString().slice(-8);
          
          db.query(transactionQuery, [accountNumber, bill.Biller_ID, -billAmount, referenceNumber], (err, transactionResult) => {
            if (err) {
              return db.rollback(() => {
                console.error('Transaction record error:', err);
                res.status(500).send('Payment processing failed');
              });
            }

            // Commit the transaction
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Transaction commit error:', err);
                  res.status(500).send('Payment processing failed');
                });
              }

              // Update session balance
              req.session.user.balance = newBalance;

              // Redirect to success page or back to billers with success message
              res.redirect(`/payment-success?ref=${referenceNumber}&biller=${encodeURIComponent(bill.Biller_Name)}&amount=${billAmount}`);
            });
          });
        });
      });
    });
  });
});

// Route to display biller registration form
app.get('/register-biller/:billerId', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const billerId = req.params.billerId;
  
  // Get biller details
  const billerQuery = 'SELECT * FROM biller WHERE Biller_ID = ?';
  
  db.query(billerQuery, [billerId], (err, results) => {
    if (err) {
      console.error('Biller fetch error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('Biller not found');
    }

    const biller = results[0];
    
    res.render('registerbiller', {
      biller: biller,
      name: req.session.user.name,
      balance: req.session.user.balance
    });
  });
});

// Route to process biller registration and create a new bill
app.post('/register-biller', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { billerId, billAmount, dueDate, billReference } = req.body;
  const accountNumber = req.session.user.accountNumber;

  // Validate input
  if (!billerId || !billAmount || !dueDate) {
    return res.status(400).send('All fields are required');
  }

  const amount = parseFloat(billAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).send('Invalid bill amount');
  }

  // Check if the due date is not in the past
  const today = new Date();
  const dueDateObj = new Date(dueDate);
  if (dueDateObj < today.setHours(0, 0, 0, 0)) {
    return res.status(400).send('Due date cannot be in the past');
  }

  // Check if biller exists
  const billerQuery = 'SELECT * FROM biller WHERE Biller_ID = ?';
  
  db.query(billerQuery, [billerId], (err, billerResults) => {
    if (err) {
      console.error('Biller validation error:', err);
      return res.status(500).send('Database error');
    }

    if (billerResults.length === 0) {
      return res.status(404).send('Biller not found');
    }

    // Check if user already has a pending bill for this biller
    const existingBillQuery = `
      SELECT * FROM bills 
      WHERE Account_Number = ? AND Biller_ID = ? AND Bill_Status = 'Pending'
    `;

    db.query(existingBillQuery, [accountNumber, billerId], (err, existingResults) => {
      if (err) {
        console.error('Existing bill check error:', err);
        return res.status(500).send('Database error');
      }

      if (existingResults.length > 0) {
        return res.status(400).send('You already have a pending bill for this biller');
      }

      // Create new bill
      const insertBillQuery = `
        INSERT INTO bills (Account_Number, Biller_ID, Bill_Amount, Due_Date, Bill_Reference, Bill_Status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
      `;

      const reference = billReference || `REF${Date.now().toString().slice(-6)}`;

      db.query(insertBillQuery, [accountNumber, billerId, amount, dueDate, reference], (err, result) => {
        if (err) {
          console.error('Bill creation error:', err);
          return res.status(500).send('Failed to register biller');
        }

        // Redirect to billers page with success message
        res.redirect('/billers?registered=success&biller=' + encodeURIComponent(billerResults[0].Biller_Name));
      });
    });
  });
});

// Route to get available billers for registration (API endpoint)
app.get('/api/available-billers', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  const accountNumber = req.session.user.accountNumber;

  // Get billers that don't have pending bills for this user
  const availableBillersQuery = `
    SELECT b.Biller_ID, b.Biller_Name, b.Biller_Category
    FROM biller b
    WHERE b.Biller_ID NOT IN (
      SELECT bills.Biller_ID 
      FROM bills 
      WHERE bills.Account_Number = ? AND bills.Bill_Status = 'Pending'
    )
    ORDER BY b.Biller_Category, b.Biller_Name
  `;

  db.query(availableBillersQuery, [accountNumber], (err, results) => {
    if (err) {
      console.error('Available billers fetch error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(results);
  });
});

// Payment success page
app.get('/payment-success', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { ref, biller, amount } = req.query;
  
  res.render('paymentsuccess', {
    referenceNumber: ref,
    billerName: decodeURIComponent(biller),
    amount: amount,
    newBalance: req.session.user.balance,
    name: req.session.user.name
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

  // Route to display e-wallet setup page
app.get('/setup-ewallet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  res.render('setup-ewallet', {
    name: req.session.user.name,
    balance: req.session.user.balance
  });
});

// Route to process e-wallet setup (phone number and OTP)
app.post('/setup-ewallet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { phoneNumber, otp } = req.body;
  const accountNumber = req.session.user.accountNumber;

  // Validate input (basic validation)
  if (!phoneNumber || !otp) {
    return res.status(400).send('Phone number and OTP are required');
  }

  // Simulate OTP verification (accept any 6-digit OTP)
  if (otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).send('Invalid OTP format');
  }

  // Add user to e-wallet payment method junction table
  const addEwalletQuery = `
    INSERT IGNORE INTO user_payment_junction (Payment_ID, Account_Number)
    VALUES (2, ?)
  `;

  db.query(addEwalletQuery, [accountNumber], (err, result) => {
    if (err) {
      console.error('E-wallet setup error:', err);
      return res.status(500).send('Failed to setup e-wallet');
    }

    // Update session to indicate e-wallet is available
    req.session.user.hasEwallet = true;

    // Redirect back to the bill payment page or billers page
    const returnUrl = req.query.returnUrl || '/billers';
    res.redirect(returnUrl + '?ewallet=setup');
  });
});

// Route to display e-wallet payment confirmation
app.get('/ewallet-payment/:billId', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const billId = req.params.billId;
  const accountNumber = req.session.user.accountNumber;

  // Check if user has e-wallet setup
  const checkEwalletQuery = `
    SELECT * FROM user_payment_junction 
    WHERE Account_Number = ? AND Payment_ID = 2
  `;

  db.query(checkEwalletQuery, [accountNumber], (err, ewalletResults) => {
    if (err) {
      console.error('E-wallet check error:', err);
      return res.status(500).send('Database error');
    }

    if (ewalletResults.length === 0) {
      return res.redirect(`/setup-ewallet?returnUrl=/ewallet-payment/${billId}`);
    }

    // Get bill details
    const billQuery = `
      SELECT 
        bills.Bill_ID,
        bills.Bill_Amount,
        bills.Due_Date,
        bills.Bill_Status,
        bills.Bill_Reference,
        biller.Biller_Name,
        biller.Biller_Category,
        biller.Biller_ID
      FROM bills
      JOIN biller ON bills.Biller_ID = biller.Biller_ID
      WHERE bills.Bill_ID = ? AND bills.Account_Number = ? AND bills.Bill_Status = 'Pending'
    `;

    db.query(billQuery, [billId, accountNumber], (err, billResults) => {
      if (err) {
        console.error('Bill fetch error:', err);
        return res.status(500).send('Database error');
      }

      if (billResults.length === 0) {
        return res.status(404).send('Bill not found or already paid');
      }

      const bill = billResults[0];
      
      res.render('ewallet-payment', {
        bill: bill,
        balance: req.session.user.balance,
        name: req.session.user.name
      });
    });
  });
});

// Route to process e-wallet payment
app.post('/ewallet-payment', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { billId, otp } = req.body;
  const accountNumber = req.session.user.accountNumber;

  // Validate OTP (accept any 6-digit OTP)
  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).send('Invalid OTP');
  }

  // Check if user has e-wallet setup
  const checkEwalletQuery = `
    SELECT * FROM user_payment_junction 
    WHERE Account_Number = ? AND Payment_ID = 2
  `;

  db.query(checkEwalletQuery, [accountNumber], (err, ewalletResults) => {
    if (err) {
      console.error('E-wallet check error:', err);
      return res.status(500).send('Database error');
    }

    if (ewalletResults.length === 0) {
      return res.status(400).send('E-wallet not setup');
    }

    // Start transaction (same logic as regular payment but with Payment_Method_ID = 2)
    db.beginTransaction((err) => {
      if (err) {
        console.error('Transaction start error:', err);
        return res.status(500).send('Payment processing failed');
      }

      // Get bill details
      const billQuery = `
        SELECT 
          bills.Bill_ID,
          bills.Bill_Amount,
          bills.Bill_Status,
          biller.Biller_ID,
          biller.Biller_Name
        FROM bills
        JOIN biller ON bills.Biller_ID = biller.Biller_ID
        WHERE bills.Bill_ID = ? AND bills.Account_Number = ? AND bills.Bill_Status = 'Pending'
      `;

      db.query(billQuery, [billId, accountNumber], (err, billResults) => {
        if (err) {
          return db.rollback(() => {
            console.error('Bill fetch error:', err);
            res.status(500).send('Payment processing failed');
          });
        }

        if (billResults.length === 0) {
          return db.rollback(() => {
            res.status(404).send('Bill not found or already paid');
          });
        }

        const bill = billResults[0];
        const billAmount = parseFloat(bill.Bill_Amount);

        // For e-wallet, we don't deduct from user balance, just process the payment
        // Update bill status to 'Paid'
        const updateBillQuery = 'UPDATE bills SET Bill_Status = ? WHERE Bill_ID = ?';
        
        db.query(updateBillQuery, ['Paid', billId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Bill update error:', err);
              res.status(500).send('Payment processing failed');
            });
          }

          // Create transaction record with e-wallet payment method
          const transactionQuery = `
            INSERT INTO transaction (Account_Number, Biller_ID, Transaction_Timestamp, Amount, Payment_Method_ID, Reference_Number)
            VALUES (?, ?, NOW(), ?, 2, ?)
          `;
          
          const referenceNumber = 'EWT' + Date.now().toString().slice(-8);
          
          db.query(transactionQuery, [accountNumber, bill.Biller_ID, -billAmount, referenceNumber], (err, transactionResult) => {
            if (err) {
              return db.rollback(() => {
                console.error('Transaction record error:', err);
                res.status(500).send('Payment processing failed');
              });
            }

            // Commit the transaction
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Transaction commit error:', err);
                  res.status(500).send('Payment processing failed');
                });
              }

              // Redirect to success page
              res.redirect(`/payment-success?ref=${referenceNumber}&biller=${encodeURIComponent(bill.Biller_Name)}&amount=${billAmount}&method=ewallet`);
            });
          });
        });
      });
    });
  });
});

// Add route to check if user has e-wallet setup
app.get('/api/check-ewallet', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  const accountNumber = req.session.user.accountNumber;
  
  const checkEwalletQuery = `
    SELECT * FROM user_payment_junction 
    WHERE Account_Number = ? AND Payment_ID = 2
  `;

  db.query(checkEwalletQuery, [accountNumber], (err, results) => {
    if (err) {
      console.error('E-wallet check error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ hasEwallet: results.length > 0 });
  });
});
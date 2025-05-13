document.addEventListener('DOMContentLoaded', () => {
  loadUsers();

  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (response.ok) {
      window.location.href = result.redirect;
    } else {
      document.getElementById('response').textContent = result.message;
    }
  });
});
  
  async function loadUsers() {
    const res = await fetch('/users');
    const users = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
  
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.Account_Number}</td>
        <td>${user.First_Name} ${user.Last_Name}</td>
        <td>${user.Email}</td>
        <td>₱${parseFloat(user.Balance).toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    });
  }
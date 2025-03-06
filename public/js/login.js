document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const employeeTab = document.getElementById('employee-tab');
  const adminTab = document.getElementById('admin-tab');
  const employeeForm = document.getElementById('employee-login-form');
  const adminForm = document.getElementById('admin-login-form');
  const employeeError = document.getElementById('employee-error');
  const adminError = document.getElementById('admin-error');

  // Tab switching functionality
  employeeTab.addEventListener('click', function() {
    employeeTab.classList.add('active');
    adminTab.classList.remove('active');
    employeeForm.classList.remove('hide');
    adminForm.classList.add('hide');
    employeeError.textContent = '';
    adminError.textContent = '';
  });

  adminTab.addEventListener('click', function() {
    adminTab.classList.add('active');
    employeeTab.classList.remove('active');
    adminForm.classList.remove('hide');
    employeeForm.classList.add('hide');
    employeeError.textContent = '';
    adminError.textContent = '';
  });

  // Employee login form submission
  employeeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const employeeCode = document.getElementById('employee-code').value.trim();
    
    employeeError.textContent = '';
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, employeeCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Invalid credentials');
      }
      
      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      
      // Redirect to employee dashboard
      window.location.href = '/employee';
      
    } catch (error) {
      employeeError.textContent = error.message;
    }
  });

  // Admin login form submission
  adminForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    
    adminError.textContent = '';
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Invalid admin credentials');
      }
      
      // Store the admin token in localStorage
      localStorage.setItem('adminToken', data.token);
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
      
    } catch (error) {
      adminError.textContent = error.message;
    }
  });

  // Check if already logged in
  const token = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  
  if (token) {
    window.location.href = '/employee';
  } else if (adminToken) {
    window.location.href = '/admin';
  }
});
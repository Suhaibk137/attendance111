document.addEventListener('DOMContentLoaded', function() {
    // Check if token exists, if not redirect to login
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
  
    // DOM elements
    const welcomeName = document.getElementById('welcome-name');
    const employeeName = document.getElementById('employee-name');
    const employeePosition = document.getElementById('employee-position');
    const checkInBtn = document.getElementById('check-in-btn');
    const checkOutBtn = document.getElementById('check-out-btn');
    const todayStatus = document.getElementById('today-status');
    const checkInTime = document.getElementById('check-in-time');
    const checkOutTime = document.getElementById('check-out-time');
    const leaveRequestForm = document.getElementById('leave-request-form');
    const leaveRequestMessage = document.getElementById('leave-request-message');
    const logoutBtn = document.getElementById('logout-btn');
    const notificationsList = document.getElementById('notifications-list');
    const attendanceCalendar = document.getElementById('attendance-calendar');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
  
    // Current date and month for calendar
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
  
    // API headers with token
    const headers = {
      'Content-Type': 'application/json',
      'x-auth-token': token
    };
  
    // Fetch employee data
    async function fetchEmployeeData() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/me`, {
          headers
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch employee data');
        }
  
        const employee = await response.json();
        
        // Update UI with employee data
        welcomeName.textContent = employee.name;
        employeeName.textContent = employee.name;
        employeePosition.textContent = employee.position;
        
        return employee;
      } catch (error) {
        console.error('Error fetching employee data:', error);
        showErrorMessage('Failed to load employee data. Please logout and try again.');
      }
    }
  
    // Fetch today's attendance
    async function fetchTodayAttendance() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/attendance`, {
          headers
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch attendance data');
        }
  
        const attendanceData = await response.json();
        
        // Filter attendance for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAttendance = attendanceData.find(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === today.getTime();
        });
        
        updateAttendanceUI(todayAttendance);
        
        return attendanceData;
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    }
  
    // Update attendance UI based on today's attendance
    function updateAttendanceUI(todayAttendance) {
      if (todayAttendance) {
        todayStatus.textContent = todayAttendance.status;
        
        if (todayAttendance.checkInTime) {
          checkInBtn.disabled = true;
          checkOutBtn.disabled = false;
          checkInTime.textContent = `Checked in at: ${formatTime(new Date(todayAttendance.checkInTime))}`;
        }
        
        if (todayAttendance.checkOutTime) {
          checkOutBtn.disabled = true;
          checkOutTime.textContent = `Checked out at: ${formatTime(new Date(todayAttendance.checkOutTime))}`;
        }
      } else {
        todayStatus.textContent = 'Not checked in';
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
      }
    }
  
    // Format time to HH:MM AM/PM
    function formatTime(date) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
  
    // Format date to YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  
    // Check-in functionality
    checkInBtn.addEventListener('click', async function() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/check-in`, {
          method: 'POST',
          headers
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.msg || 'Failed to check in');
        }
  
        const attendance = await response.json();
        
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
        todayStatus.textContent = 'Present';
        checkInTime.textContent = `Checked in at: ${formatTime(new Date(attendance.checkInTime))}`;
        
        showSuccessMessage('Checked in successfully!');
      } catch (error) {
        console.error('Error checking in:', error);
        showErrorMessage(error.message || 'Failed to check in');
      }
    });
  
    // Check-out functionality
    checkOutBtn.addEventListener('click', async function() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/check-out`, {
          method: 'POST',
          headers
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.msg || 'Failed to check out');
        }
  
        const attendance = await response.json();
        
        checkOutBtn.disabled = true;
        checkOutTime.textContent = `Checked out at: ${formatTime(new Date(attendance.checkOutTime))}`;
        
        showSuccessMessage('Checked out successfully!');
      } catch (error) {
        console.error('Error checking out:', error);
        showErrorMessage(error.message || 'Failed to check out');
      }
    });
  
    // Submit leave request
    leaveRequestForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const leaveDate = document.getElementById('leave-date').value;
      const reason = document.getElementById('leave-reason').value;
      
      if (!leaveDate || !reason) {
        showErrorMessage('Please fill in all fields', leaveRequestMessage);
        return;
      }
      
      // Disable form during submission
      const submitBtn = this.querySelector('.submit-btn');
      submitBtn.disabled = true;
      
      try {
        const response = await fetch(`${API_BASE_URL}/employee/leave-request`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ leaveDate, reason })
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          throw new Error('Server response error');
        }

        if (!response.ok) {
          throw new Error(data.msg || 'Failed to submit leave request');
        }

        leaveRequestForm.reset();
        showSuccessMessage('Leave request submitted successfully', leaveRequestMessage);
        
        // Refresh notifications after submitting a leave request
        fetchNotifications();
      } catch (error) {
        console.error('Error submitting leave request:', error);
        showErrorMessage(error.message, leaveRequestMessage);
      } finally {
        // Re-enable form
        submitBtn.disabled = false;
      }
    });
  
    // Fetch notifications
    async function fetchNotifications() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/notifications`, {
          headers
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
  
        const notifications = await response.json();
        
        updateNotificationsUI(notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }
  
    // Update notifications UI
    function updateNotificationsUI(notifications) {
      if (!notificationsList) return;
      
      if (notifications.length === 0) {
        notificationsList.innerHTML = '<p class="no-notifications">No notifications yet.</p>';
        return;
      }
      
      notificationsList.innerHTML = '';
      
      notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification-item');
        
        if (!notification.read) {
          notificationElement.classList.add('unread');
        }
        
        const messageElement = document.createElement('p');
        messageElement.classList.add('message');
        messageElement.textContent = notification.message;
        
        const timeElement = document.createElement('p');
        timeElement.classList.add('time');
        timeElement.textContent = new Date(notification.createdAt).toLocaleString();
        
        notificationElement.appendChild(messageElement);
        notificationElement.appendChild(timeElement);
        
        notificationsList.appendChild(notificationElement);
      });
    }
  
    // Render attendance calendar
    function renderCalendar(attendanceData) {
      // Update month and year display
      const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
      currentMonthElement.textContent = `${monthName} ${currentYear}`;
      
      // Clear calendar
      attendanceCalendar.innerHTML = '';
      
      // Add weekday headers
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-weekday');
        dayElement.textContent = day;
        attendanceCalendar.appendChild(dayElement);
      });
      
      // Get first day of month and number of days in month
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Add empty cells for days before first day of month
      for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'inactive');
        attendanceCalendar.appendChild(emptyDay);
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        
        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = i;
        
        const status = document.createElement('div');
        status.classList.add('status');
        
        dayElement.appendChild(dayNumber);
        dayElement.appendChild(status);
        
        // Check if this is today
        const today = new Date();
        if (today.getDate() === i && today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
          dayElement.classList.add('today');
        }
        
        // Find attendance record for this day
        const date = new Date(currentYear, currentMonth, i);
        const record = attendanceData.find(record => {
          const recordDate = new Date(record.date);
          return recordDate.getDate() === i && recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });
        
        if (record) {
          dayElement.classList.add(record.status.toLowerCase().replace('-', '-'));
        }
        
        attendanceCalendar.appendChild(dayElement);
      }
    }
  
    // Previous month button
    prevMonthBtn.addEventListener('click', function() {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      fetchMonthlyAttendance();
    });
  
    // Next month button
    nextMonthBtn.addEventListener('click', function() {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      fetchMonthlyAttendance();
    });
  
    // Fetch monthly attendance data
    async function fetchMonthlyAttendance() {
      try {
        const response = await fetch(`${API_BASE_URL}/employee/attendance`, {
          headers
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch attendance data');
        }
  
        const attendanceData = await response.json();
        renderCalendar(attendanceData);
      } catch (error) {
        console.error('Error fetching monthly attendance:', error);
      }
    }
  
    // Show success message
    function showSuccessMessage(message, element = leaveRequestMessage) {
      element.textContent = message;
      element.className = 'status-message success';
      
      setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
      }, 3000);
    }
  
    // Show error message
    function showErrorMessage(message, element = leaveRequestMessage) {
      element.textContent = message;
      element.className = 'status-message error';
      
      setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
      }, 3000);
    }
  
    // Logout functionality
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  
    // Initialize page
    async function initPage() {
      await fetchEmployeeData();
      await fetchTodayAttendance();
      await fetchNotifications();
      await fetchMonthlyAttendance();
    }
  
    // Start the application
    initPage();
});

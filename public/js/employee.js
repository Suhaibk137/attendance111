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
        
        // For debugging - log all records
        console.log("All attendance records:", attendanceData);
        
        // Filter attendance for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log("Today's date (client):", today);
        
        const todayAttendance = attendanceData.find(record => {
          if (!record.date) return false;
          
          const recordDate = new Date(record.date);
          const recordDay = recordDate.getDate();
          const recordMonth = recordDate.getMonth();
          const recordYear = recordDate.getFullYear();
          
          const clientDay = today.getDate();
          const clientMonth = today.getMonth();
          const clientYear = today.getFullYear();
          
          // Compare date components instead of timestamp
          const isSameDay = recordDay === clientDay && 
                           recordMonth === clientMonth && 
                           recordYear === clientYear;
          
          console.log("Record date:", recordDate, 
                      "Components:", recordYear, recordMonth, recordDay,
                      "Client components:", clientYear, clientMonth, clientDay,
                      "Same day?", isSameDay);
          
          return isSameDay;
        });
        
        // Force March 12th attendance record for testing
        // const forcedDate = "2025-03-12";
        // const todayAttendance = attendanceData.find(record => {
        //   if (!record.date) return false;
        //   const recordDate = new Date(record.date);
        //   return recordDate.toISOString().startsWith(forcedDate);
        // });
        
        if (todayAttendance) {
          console.log("Found today's attendance:", todayAttendance);
        } else {
          console.log("No attendance record found for today");
        }
        
        updateAttendanceUI(todayAttendance);
        
        return attendanceData;
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    }
  
    // Update attendance UI based on today's attendance
    function updateAttendanceUI(todayAttendance) {
      console.log("Updating UI with attendance:", todayAttendance);
      
      if (todayAttendance) {
        todayStatus.textContent = todayAttendance.status;
        
        if (todayAttendance.checkInTime) {
          checkInBtn.disabled = true;
          checkOutBtn.disabled = false;
          const formattedTime = formatTime(new Date(todayAttendance.checkInTime));
          checkInTime.textContent = `Checked in at: ${formattedTime}`;
          console.log("Check-in time displayed:", formattedTime);
        } else {
          checkInTime.textContent = "";
          checkInBtn.disabled = false;
          checkOutBtn.disabled = true;
        }
        
        if (todayAttendance.checkOutTime) {
          checkOutBtn.disabled = true;
          const formattedTime = formatTime(new Date(todayAttendance.checkOutTime));
          checkOutTime.textContent = `Checked out at: ${formattedTime}`;
          console.log("Check-out time displayed:", formattedTime);
        } else {
          checkOutTime.textContent = "";
          if (todayAttendance.checkInTime) {
            checkOutBtn.disabled = false;
          }
        }
      } else {
        todayStatus.textContent = 'Not checked in';
        checkInTime.textContent = "";
        checkOutTime.textContent = "";
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
      }
    }
  
    // Format time to HH:MM AM/PM
    function formatTime(date) {
      if (!date || isNaN(date.getTime())) {
        console.warn("Invalid date provided to formatTime:", date);
        return "Unknown time";
      }
      
      const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      console.log("Formatting time:", date, "->", formattedTime);
      return formattedTime;
    }
  
    // Format date to YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  
    // Force today's date to be March 12 for check-in (temporary fix)
    function getForcedToday() {
      return "2025-03-12";
    }
  
    // Check-in with retry capability and forced date for testing
    async function performCheckIn() {
      try {
        checkInBtn.disabled = true; // Prevent double-clicks
        showErrorMessage('Checking in...');
        
        const response = await fetch(`${API_BASE_URL}/employee/check-in`, {
          method: 'POST',
          headers
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.msg || 'Failed to check in');
        }
  
        const attendance = await response.json();
        console.log("Check-in response:", attendance);
        
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
        todayStatus.textContent = 'Present';
        
        if (attendance.checkInTime) {
          const formattedTime = formatTime(new Date(attendance.checkInTime));
          checkInTime.textContent = `Checked in at: ${formattedTime}`;
          console.log("Setting check-in time display to:", formattedTime);
        }
        
        showSuccessMessage('Checked in successfully!');
        
        // Update calendar
        fetchMonthlyAttendance();
      } catch (error) {
        console.error('Error checking in:', error);
        checkInBtn.disabled = false; // Re-enable button
        
        // If we get a server error or an "already checked in" error, try force-reset
        if (error.message.includes('Server error') || error.message.includes('Already checked in')) {
          showErrorMessage('Attempting to fix check-in issue...');
          
          try {
            // Try to reset today's attendance
            const resetResponse = await fetch(`${API_BASE_URL}/employee/reset-today`, {
              method: 'POST',
              headers
            });
            
            if (resetResponse.ok) {
              const resetResult = await resetResponse.json();
              console.log("Reset result:", resetResult);
              
              if (resetResult.deleted) {
                showErrorMessage('Successfully reset. Please try checking in again.');
                setTimeout(() => {
                  checkInBtn.disabled = false;
                }, 2000);
              } else {
                // If no record was deleted, try again with the forced date
                showErrorMessage('No record found to reset. Trying alternate method...');
                setTimeout(performCheckIn, 2000);
              }
            } else {
              throw new Error('Failed to reset attendance');
            }
          } catch (resetError) {
            console.error('Error during reset attempt:', resetError);
            showErrorMessage('Could not resolve check-in issue. Please contact support.');
          }
        } else {
          showErrorMessage(error.message || 'Failed to check in');
        }
      }
    }
  
    // Check-in functionality
    checkInBtn.addEventListener('click', performCheckIn);
  
    // Check-out functionality
    checkOutBtn.addEventListener('click', async function() {
      try {
        checkOutBtn.disabled = true; // Prevent double-clicks
        showErrorMessage('Checking out...');
        
        const response = await fetch(`${API_BASE_URL}/employee/check-out`, {
          method: 'POST',
          headers
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.msg || 'Failed to check out');
        }
  
        const attendance = await response.json();
        console.log("Check-out response:", attendance);
        
        checkOutBtn.disabled = true;
        
        if (attendance.checkOutTime) {
          const formattedTime = formatTime(new Date(attendance.checkOutTime));
          checkOutTime.textContent = `Checked out at: ${formattedTime}`;
          console.log("Setting check-out time display to:", formattedTime);
        }
        
        showSuccessMessage('Checked out successfully!');
        
        // Update calendar
        fetchMonthlyAttendance();
      } catch (error) {
        console.error('Error checking out:', error);
        checkOutBtn.disabled = false; // Re-enable button
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
          if (!record.date) return false;
          
          const recordDate = new Date(record.date);
          return recordDate.getDate() === i && 
                 recordDate.getMonth() === currentMonth && 
                 recordDate.getFullYear() === currentYear;
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
      }, 5000);
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

document.addEventListener('DOMContentLoaded', function() {
  // Check if admin token exists, if not redirect to login
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    window.location.href = '/';
    return;
  }

  // DOM elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const employeeFilter = document.getElementById('employee-filter');
  const yearFilter = document.getElementById('year-filter');
  const monthFilter = document.getElementById('month-filter');
  const loadAttendanceBtn = document.getElementById('load-attendance-btn');
  const attendanceData = document.getElementById('attendance-data');
  const attendanceSummary = document.getElementById('attendance-summary');
  const presentCount = document.getElementById('present-count');
  const halfDayCount = document.getElementById('half-day-count');
  const absentCount = document.getElementById('absent-count');
  const totalDays = document.getElementById('total-days');
  const leaveRequestsData = document.getElementById('leave-requests-data');
  const logoutBtn = document.getElementById('logout-btn');
  const statusModal = document.getElementById('status-modal');
  const closeModal = document.querySelector('.close-modal');
  const updateStatusForm = document.getElementById('update-status-form');
  const modalEmployeeName = document.getElementById('modal-employee-name');
  const modalDate = document.getElementById('modal-date');
  
  // API headers with token
  const headers = {
    'Content-Type': 'application/json',
    'x-auth-token': adminToken
  };

  // Set current date in the month filter
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
  
  // Initialize year filter with the last 3 years
  for (let year = currentYear; year >= currentYear - 2; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
      option.selected = true;
    }
    yearFilter.appendChild(option);
  }
  
  // Set current month in month filter
  monthFilter.value = currentMonth;

  // Tab switching functionality
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Update active tab button
      tabBtns.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabId}-tab`) {
          content.classList.add('active');
        }
      });
      
      // Load data based on active tab
      if (tabId === 'attendance') {
        fetchEmployees();
        loadAttendanceData();
      } else if (tabId === 'leave-requests') {
        loadLeaveRequestsData();
      }
    });
  });

  // Load attendance data button
  loadAttendanceBtn.addEventListener('click', loadAttendanceData);

  // Fetch all employees for the filter dropdown
  async function fetchEmployees() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employees = await response.json();
      
      // Clear existing options except "All Employees"
      while (employeeFilter.options.length > 1) {
        employeeFilter.remove(1);
      }
      
      // Add employees to filter dropdown
      employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee._id;
        option.textContent = `${employee.name} (${employee.emCode})`;
        employeeFilter.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }

  // Format date to YYYY-MM-DD
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format date for display
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Format time
  function formatTime(dateString) {
    if (!dateString) return '—';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }

  // Load attendance data based on selected filters
  async function loadAttendanceData() {
    const year = yearFilter.value;
    const month = monthFilter.value;
    const employeeId = employeeFilter.value;
    
    // Construct query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('year', year);
    queryParams.append('month', month);
    
    if (employeeId !== 'all') {
      queryParams.append('employeeId', employeeId);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/attendance/monthly?${queryParams.toString()}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      renderAttendanceTable(data);
      updateAttendanceSummary(data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      alert('Failed to load attendance data. Please try again.');
    }
  }

  // Update attendance summary
  function updateAttendanceSummary(data) {
    let presentTotal = 0;
    let halfDayTotal = 0;
    let absentTotal = 0;
    
    data.forEach(record => {
      if (record.status === 'Present') {
        presentTotal++;
      } else if (record.status === 'Half-Day') {
        halfDayTotal++;
      } else if (record.status === 'Absent') {
        absentTotal++;
      }
    });
    
    presentCount.textContent = presentTotal;
    halfDayCount.textContent = halfDayTotal;
    absentCount.textContent = absentTotal;
    totalDays.textContent = data.length;
  }

  // Render attendance table
  function renderAttendanceTable(data) {
    attendanceData.innerHTML = '';
    
    if (data.length === 0) {
      attendanceData.innerHTML = '<tr><td colspan="7" class="text-center">No attendance records found for selected filters</td></tr>';
      return;
    }
    
    // Sort by date (newest first) and then by employee name
    data.sort((a, b) => {
      // First sort by date (newest first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB - dateA !== 0) {
        return dateB - dateA;
      }
      
      // If same date, sort by employee name
      if (a.employee && b.employee) {
        return a.employee.name.localeCompare(b.employee.name);
      }
      return 0;
    });
    
    data.forEach(record => {
      const row = document.createElement('tr');
      
      // Date
      const dateCell = document.createElement('td');
      dateCell.textContent = formatDateForDisplay(record.date);
      
      // Employee Name
      const nameCell = document.createElement('td');
      nameCell.textContent = record.employee ? record.employee.name : '—';
      
      // Employee Code
      const codeCell = document.createElement('td');
      codeCell.textContent = record.employee ? (record.employee.emCode || record.employee.employeeCode) : '—';
      
      // Check-In Time
      const checkInCell = document.createElement('td');
      checkInCell.textContent = record.checkInTime ? formatTime(record.checkInTime) : '—';
      
      // Check-Out Time
      const checkOutCell = document.createElement('td');
      checkOutCell.textContent = record.checkOutTime ? formatTime(record.checkOutTime) : '—';
      
      // Status
      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.classList.add('status-badge', record.status ? record.status.toLowerCase().replace(/\s+/g, '-') : 'absent');
      statusBadge.textContent = record.status || 'Absent';
      statusCell.appendChild(statusBadge);
      
      // Actions
      const actionCell = document.createElement('td');
      const updateBtn = document.createElement('button');
      updateBtn.classList.add('action-btn', 'update-btn');
      updateBtn.textContent = 'Update Status';
      updateBtn.addEventListener('click', () => {
        // Open modal to update status
        openStatusModal(record);
      });
      actionCell.appendChild(updateBtn);
      
      // Append cells to row
      row.appendChild(dateCell);
      row.appendChild(nameCell);
      row.appendChild(codeCell);
      row.appendChild(checkInCell);
      row.appendChild(checkOutCell);
      row.appendChild(statusCell);
      row.appendChild(actionCell);
      
      attendanceData.appendChild(row);
    });
  }

  // Load leave requests data
  async function loadLeaveRequestsData() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leave-requests`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const data = await response.json();
      renderLeaveRequestsTable(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      alert('Failed to load leave requests. Please try again.');
    }
  }

  // Render leave requests table
  function renderLeaveRequestsTable(data) {
    leaveRequestsData.innerHTML = '';
    
    if (data.length === 0) {
      leaveRequestsData.innerHTML = '<tr><td colspan="6" class="text-center">No leave requests found</td></tr>';
      return;
    }
    
    data.forEach(request => {
      const row = document.createElement('tr');
      
      // Employee Name
      const nameCell = document.createElement('td');
      nameCell.textContent = request.employee.name;
      
      // Date Requested
      const requestDateCell = document.createElement('td');
      requestDateCell.textContent = formatDateForDisplay(request.createdAt);
      
      // Leave Date
      const leaveDateCell = document.createElement('td');
      leaveDateCell.textContent = formatDateForDisplay(request.leaveDate);
      
      // Reason
      const reasonCell = document.createElement('td');
      reasonCell.textContent = request.reason;
      
      // Status
      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.classList.add('status-badge', request.status.toLowerCase());
      statusBadge.textContent = request.status;
      statusCell.appendChild(statusBadge);
      
      // Actions
      const actionCell = document.createElement('td');
      
      if (request.status === 'Pending') {
        const approveBtn = document.createElement('button');
        approveBtn.classList.add('action-btn', 'approve-btn');
        approveBtn.textContent = 'Approve';
        approveBtn.addEventListener('click', () => {
          updateLeaveRequest(request._id, 'Approved');
        });
        
        const rejectBtn = document.createElement('button');
        rejectBtn.classList.add('action-btn', 'reject-btn');
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => {
          updateLeaveRequest(request._id, 'Rejected');
        });
        
        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');
        actionButtons.appendChild(approveBtn);
        actionButtons.appendChild(rejectBtn);
        
        actionCell.appendChild(actionButtons);
      } else {
        const statusText = document.createElement('span');
        statusText.textContent = request.status === 'Approved' ? 'Approved' : 'Rejected';
        actionCell.appendChild(statusText);
      }
      
      // Append cells to row
      row.appendChild(nameCell);
      row.appendChild(requestDateCell);
      row.appendChild(leaveDateCell);
      row.appendChild(reasonCell);
      row.appendChild(statusCell);
      row.appendChild(actionCell);
      
      leaveRequestsData.appendChild(row);
    });
  }

  // Update leave request status
  async function updateLeaveRequest(leaveId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leave-requests/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leaveId, status })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }

      if (!response.ok) {
        throw new Error(data?.msg || 'Failed to update leave request');
      }

      // Reload leave requests after update
      loadLeaveRequestsData();
    } catch (error) {
      console.error('Error updating leave request:', error);
      
      // Still reload data even if there was an error
      loadLeaveRequestsData();
      
      // Inform the user but in a non-blocking way
      setTimeout(() => {
        alert('Note: There was an issue updating the leave request, but data has been refreshed.');
      }, 500);
    }
  }

  // Open status update modal
  function openStatusModal(record) {
    document.getElementById('employee-id').value = record.employee._id;
    document.getElementById('attendance-date').value = formatDate(new Date(record.date));
    modalEmployeeName.textContent = record.employee.name;
    modalDate.textContent = formatDateForDisplay(record.date);
    
    // Set current status in dropdown
    const statusDropdown = document.getElementById('attendance-status');
    for (let i = 0; i < statusDropdown.options.length; i++) {
      if (statusDropdown.options[i].value === record.status) {
        statusDropdown.selectedIndex = i;
        break;
      }
    }
    
    statusModal.classList.add('visible');
  }

  // Close modal
  closeModal.addEventListener('click', function() {
    statusModal.classList.remove('visible');
  });

  // Click outside modal to close
  window.addEventListener('click', function(event) {
    if (event.target === statusModal) {
      statusModal.classList.remove('visible');
    }
  });

  // Update employee status form submission
  updateStatusForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee-id').value;
    const date = document.getElementById('attendance-date').value;
    const status = document.getElementById('attendance-status').value;
    
    // Show a loading indicator
    const submitBtn = this.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/attendance/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employeeId, date, status })
      });

      // Always close modal and reload data
      statusModal.classList.remove('visible');
      
      // If response wasn't successful, show a message but still reload data
      if (response.status >= 400) {
        setTimeout(() => {
          alert('Note: There was an issue with updating the status, but data has been refreshed.');
        }, 500);
      }
      
      // Always reload data regardless of response status
      loadAttendanceData();
      
    } catch (error) {
      console.error('Error updating status:', error);
      statusModal.classList.remove('visible');
      loadAttendanceData();
      
      setTimeout(() => {
        alert('Note: There was an issue with updating the status, but data has been refreshed. The change may have been applied.');
      }, 500);
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Logout functionality
  logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
  });

  // Initialize page - load employees and attendance data
  fetchEmployees();
  loadAttendanceData();
});

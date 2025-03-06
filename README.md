# Elite Resume Employee Web App

A mobile-friendly employee attendance management system with separate dashboards for employees and administrators.

## Features

- **Login Dashboard**: Secure login for employees and administrators
- **Employee Dashboard**:
  - Check-in & Check-out functionality
  - Leave request submission
  - Monthly attendance overview
  - Notifications panel
- **Admin Dashboard**:
  - Employee attendance management
  - Leave request approval/rejection
  - Status updates (Present, Absent, Half-Day, On Leave)

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB

## Step-by-Step Setup Instructions

### Prerequisites

1. Install Node.js and npm from [https://nodejs.org/](https://nodejs.org/)
2. Install MongoDB Community Edition from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
3. Install VS Code from [https://code.visualstudio.com/](https://code.visualstudio.com/)

### Step 1: Setup Project Structure

1. Open Terminal (Mac) or Command Prompt (Windows)
2. Create a new folder for your project:
   ```
   mkdir elite-employee-web-app
   cd elite-employee-web-app
   ```
3. Create the project structure as shown in the project files.

### Step 2: Initialize Node.js Project and Install Dependencies

1. Initialize a new Node.js project:
   ```
   npm init -y
   ```
2. Install required dependencies:
   ```
   npm install express mongoose cors dotenv body-parser bcryptjs jsonwebtoken moment
   ```
3. Install development dependencies:
   ```
   npm install nodemon --save-dev
   ```

### Step 3: Set Up MongoDB

1. Start MongoDB service (if not already running):
   - On Mac:
     ```
     brew services start mongodb-community
     ```
   - On Windows:
     MongoDB should be running as a service if installed with default settings

2. Create a new database and collection:
   - Open MongoDB Compass (GUI) or mongo shell
   - Create a database named `elite-employee-data-base`
   - Create a collection named `elite-employee-mail-codes`

3. Insert sample employee data:
   ```javascript
   db.getCollection('elite-employee-mail-codes').insertOne({
     "Name": "Ashid",
     "Employee Code": "ER 1040",
     "Email": "ashid@eliteresumes.co",
     "Position": "Digital Marketing Associate"
   });
   ```

### Step 4: Create Environment Variables

1. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/elite-employee-data-base
   JWT_SECRET=elite-resume-secure-jwt-secret-key
   ```

### Step 5: Copy Project Files

1. Copy all the provided files into your project structure:
   - Server files: `server.js`, models, routes, config
   - Frontend files: HTML, CSS, JavaScript

### Step 6: Start the Application

1. Open your project in VS Code:
   ```
   code .
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Step 7: Test the Application

1. **Login as Employee**:
   - Email: `ashid@eliteresumes.co`
   - Employee Code: `ER 1040`

2. **Login as Admin**:
   - Username: `Support@eliteresumes.in`
   - Password: `Elite@143`

## Troubleshooting

### Connection Issues with MongoDB

If you have trouble connecting to MongoDB, check:
1. MongoDB service is running
2. The connection URI in `.env` file is correct
3. Network settings allow connection to MongoDB port (default: 27017)

### Authentication Failures

If login is not working:
1. Check if employee data is correctly inserted in the MongoDB collection
2. Ensure the collection name and database name match exactly

### Browser Issues

If the application doesn't load properly in the browser:
1. Clear browser cache
2. Check browser console for JavaScript errors
3. Ensure all files are in the correct directories

## Next Steps for Enhancement

1. Add employee registration functionality for admins
2. Implement password hashing for better security
3. Add profile picture upload for employees
4. Create reports and analytics for attendance data
5. Implement email notifications for leave approvals/rejections

## Support

For any issues or questions, please contact admin@eliteresumes.co
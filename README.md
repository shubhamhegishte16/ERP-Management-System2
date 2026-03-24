# WorkPulse

AI-powered employee productivity and project tracking system built with React, Node.js, MongoDB, and Electron.

## Project Structure

```text
ERP-System-Tracker-main/
|-- backend/   # Express API + MongoDB models/routes/controllers
|-- frontend/  # React application
`-- desktop/   # Electron desktop tracker (optional)
```

## What This Project Does

WorkPulse has 3 main roles:

- Admin
  Can monitor the organization, manage users, assign projects/tasks, and delete users from the employee panel.
- Manager
  Can assign projects and tasks to employees, view dashboards, and track attendance/productivity for employees.
- Employee
  Can register, log in, view assigned projects/tasks, attendance, activity, and personal dashboard information.

## Current Workflow

### 1. Employee Registration

Employees register from the frontend registration form with:

- Name
- Email
- Password
- Manager
- Department
- Registration Date

Managers and admin are permanent accounts and are not created from the registration form.

### 2. Login

The login screen supports 3 role selections:

- Admin
- Manager
- Employee

The selected role must match the account role in the database.

### 3. Project and Task Assignment

- Admin can assign projects/tasks to managers and employees.
- Manager can assign projects/tasks to employees.
- Assigned projects appear in the employee panel.
- Assigned tasks appear in the employee tasks panel.

### 4. Dashboards

- Admin and manager use the manager-style dashboard layout.
- Employee has a separate employee dashboard.
- Attendance pages show attendance records and stats.

### 5. Desktop Tracker

The desktop app is optional. It is intended to track local activity and send activity data to the backend.

## Prerequisites

Before running the project, make sure you have:

- Node.js installed
- MongoDB Community Server installed and running locally
- MongoDB Compass optional, for viewing the database

Default local MongoDB connection:

```env
MONGO_URI=mongodb://localhost:27017/workpulse
```

## Environment Setup

The backend uses `backend/.env`.

Example:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/workpulse
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

## How To Run The Project Properly

This project is easiest to run in 2 or 3 terminals.

### Terminal 1: Backend

```powershell
cd C:\Users\SHUBHAM\Downloads\ERP-System-Tracker-main\ERP-System-Tracker-main\backend
npm.cmd install
npm.cmd start
```

Expected result:

- Backend starts on `http://localhost:5000`
- MongoDB connects successfully

Important:

- On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks `npm`.
- If you see `EADDRINUSE` on port `5000`, stop the old backend process first and restart.

### Terminal 2: Frontend

```powershell
cd C:\Users\SHUBHAM\Downloads\ERP-System-Tracker-main\ERP-System-Tracker-main\frontend
npm.cmd install
npm.cmd start
```

Expected result:

- Frontend starts on `http://localhost:3000`

### Terminal 3: Desktop App (Optional)

```powershell
cd C:\Users\SHUBHAM\Downloads\ERP-System-Tracker-main\ERP-System-Tracker-main\desktop
npm.cmd install
npm.cmd start
```

Expected result:

- Electron app opens
- Sign in with the same WorkPulse account used in the browser
- Tracker starts sending active application sessions to `POST /api/activity`

Note:

- The web application can run without the desktop app.
- The desktop app is only needed for activity tracking behavior.
- The tracker UI lets employees pause capture or enable privacy mode before logs are uploaded.

## Recommended Start Order

1. Start MongoDB Server
2. Start backend
3. Start frontend
4. Open the app in the browser
5. Start desktop app only if you need activity tracking

## Default Accounts

### Admin

- Email: `admin@workpulse.com`
- Password: `admin123`

### Managers

- `shubham@gmail.com`
- `vinaya@gmail.com`
- `rushan@gmail.com`

Password for all managers:

- `manager123`

## Main Backend Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/managers`
- `GET /api/auth/me`
- `PUT /api/auth/password`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Activity

- `POST /api/activity`
- `GET /api/activity/me`
- `GET /api/activity/hourly/:id`
- `GET /api/activity/team`

### Analytics

- `GET /api/analytics/me`
- `GET /api/analytics/team`
- `GET /api/analytics/summary`
- `GET /api/analytics/heatmap/:id`

### Admin

- `GET /api/admin/stats`
- `DELETE /api/admin/users/:id`

## Common Problems

### `Invalid email or password`

Check:

- Backend is actually restarted
- MongoDB is running
- You selected the correct role in the login dropdown

### `EADDRINUSE: address already in use :::5000`

Another backend process is already running on port `5000`. Stop it, then restart backend.

### MongoDB connection error

Check:

- MongoDB service is running
- `MONGO_URI` is correct in `backend/.env`

### Frontend starts but API calls fail

Check:

- Backend is running on port `5000`
- Frontend is running on port `3000`
- `CLIENT_URL=http://localhost:3000` in backend `.env`

## Tech Stack

- Frontend: React
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs
- Desktop: Electron
- Charts: Chart.js / react-chartjs-2

## Notes

- Tasks are stored inside projects.
- Deleting a project also removes its tasks.
- Admin can delete managers and employees from the Employee panel.
- Attendance currently shows attendance records and summaries without the clock widget.
- Employee activity now records application name, window title, session start/end time, duration, idle periods, and per-day summaries for productivity analysis.

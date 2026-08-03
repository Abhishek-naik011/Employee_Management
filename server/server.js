const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const cookieParser = require('cookie-parser');

const app = express();
const { runMigrations } = require('./migrate');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===============================
// Home Route
// ===============================
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Employee Management API is running successfully 🚀',
        version: '1.0.0'
    });
});

// ===============================
// Health Check Route
// ===============================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running normally'
    });
});

// ===============================
// Import Routes
// ===============================
const authRoutes       = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const employeeRoutes   = require('./routes/employees');
const projectRoutes    = require('./routes/projects');
const roleRoutes       = require('./routes/roles');
const assignmentRoutes = require('./routes/assignments');
const { verifyToken } = require('./middleware/authMiddleware');

// ===============================
// API Routes
// ===============================
// Public Auth Routes
app.use('/api/auth', authRoutes);

// Protected API Routes
app.use('/api/departments', verifyToken, departmentRoutes);
app.use('/api/employees',   verifyToken, employeeRoutes);
app.use('/api/projects',    verifyToken, projectRoutes);
app.use('/api/roles',       verifyToken, roleRoutes);
app.use('/api/assignments', verifyToken, assignmentRoutes);

// ===============================
// 404 Handler
// ===============================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API Route Not Found'
    });
});

// ===============================
// Start Server
// ===============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await runMigrations();

    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 API URL: http://localhost:${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
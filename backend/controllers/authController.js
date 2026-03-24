const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ensureDefaultUsers } = require('../config/defaultUsers');

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// @desc  Register user
// @route POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    await ensureDefaultUsers();
    const { name, email, password, manager, department, registrationDate } = req.body;

    if (!name || !email || !password || !manager || !registrationDate)
      return res.status(400).json({ success: false, message: 'Please provide name, email, password, manager and registration date' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'employee', manager, department, registrationDate });
    const token = generateToken(user._id);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    await ensureDefaultUsers();
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (role && user.role !== role)
      return res.status(401).json({ success: false, message: `This account is registered as ${user.role}` });

    const token = generateToken(user._id);
    const userObj = user.toJSON(); // strips password

    res.json({ success: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get current user
// @route GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc  Update password
// @route PUT /api/auth/password
// @access Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getManagers = async (req, res) => {
  try {
    await ensureDefaultUsers();
    const managers = await User.find({ role: 'manager' }).select('name email');
    res.json({ success: true, managers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, updatePassword, getManagers };

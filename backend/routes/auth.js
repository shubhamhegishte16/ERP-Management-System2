const express = require('express');
const router = express.Router();
const { register, login, getMe, updatePassword, getManagers } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/managers', getManagers);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);

module.exports = router;

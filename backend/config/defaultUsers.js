const User = require('../models/User');

const DEFAULT_USERS = [
  {
    name: 'System Admin',
    email: 'admin@workpulse.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
  },
  {
    name: 'Arjun Sharma',
    email: 'shubham@gmail.com',
    password: 'manager123',
    role: 'manager',
    department: 'Engineering',
  },
  {
    name: 'Neha Kapoor',
    email: 'vinaya@gmail.com',
    password: 'manager123',
    role: 'manager',
    department: 'Operations',
  },
  {
    name: 'Rohan Mehta',
    email: 'rushan@gmail.com',
    password: 'manager123',
    role: 'manager',
    department: 'Product',
  },
];

let defaultsEnsured = false;

const ensureDefaultUsers = async () => {
  if (defaultsEnsured) return;

  for (const userData of DEFAULT_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (!existing) {
      await User.create(userData);
    }
  }

  defaultsEnsured = true;
};

module.exports = { ensureDefaultUsers, DEFAULT_USERS };

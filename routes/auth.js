const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { auditLogin, getClientIP } = require('../middleware/audit');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const clientIP = getClientIP(req);
      await auditLogin(req.body.email, false, clientIP, req.get('User-Agent'), null, 
        new Error('Validation failed'));
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent');

    const db = getDb();
    
    // Find user by email
    const [users] = await db.execute(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await auditLogin(email, false, clientIP, userAgent, null, new Error('User not found'));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is blocked
    if (user.status === 'blocked') {
      await auditLogin(email, false, clientIP, userAgent, user.id, new Error('Account blocked'));
      return res.status(403).json({ error: 'Account is blocked. Contact administrator.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await auditLogin(email, false, clientIP, userAgent, user.id, new Error('Invalid password'));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Log successful login
    await auditLogin(email, true, clientIP, userAgent, user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    const clientIP = getClientIP(req);
    await auditLogin(req.body.email, false, clientIP, req.get('User-Agent'), null, error);
    res.status(500).json({ error: 'Login failed' });
  }
});


// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const [users] = await db.execute(
      'SELECT id, email, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just acknowledge the logout
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/verify - Verify token validity
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status
    }
  });
});

module.exports = router;
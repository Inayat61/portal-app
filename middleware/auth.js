const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'portal-app',
    audience: 'portal-users'
  });
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const db = getDb();
    const [users] = await db.execute(
      'SELECT id, email, role, status FROM users WHERE id = ? AND status = ?',
      [decoded.id, 'active']
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    const user = users[0];
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }
    
    // Add user info to request
    req.user = user;
    req.user.ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRole
      });
    }
    
    next();
  };
};

// Admin only middleware
const requireAdmin = requireRole(['admin']);

// User or Admin middleware
const requireUserOrAdmin = requireRole(['user', 'admin']);

// Owner or Admin middleware (for resource-based access)
const requireOwnerOrAdmin = async (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next(); // Admins can access everything
      }
      
      const resourceId = req.params[resourceIdParam];
      const db = getDb();
      
      let query;
      let params;
      
      switch (resourceType) {
        case 'project':
          query = 'SELECT owner_id FROM projects WHERE id = ?';
          params = [resourceId];
          break;
        case 'task':
          query = `
            SELECT p.owner_id 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id 
            WHERE t.id = ?
          `;
          params = [resourceId];
          break;
        default:
          return res.status(500).json({ error: 'Invalid resource type' });
      }
      
      const [results] = await db.execute(query, params);
      
      if (results.length === 0) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }
      
      const ownerId = results[0].owner_id;
      
      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: not owner' });
      }
      
      next();
    } catch (error) {
      console.error('Owner check error:', error);
      return res.status(500).json({ error: 'Access control error' });
    }
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireUserOrAdmin,
  requireOwnerOrAdmin,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
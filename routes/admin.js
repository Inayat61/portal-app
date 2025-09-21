const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { auditUserAction, auditAdminView, AUDIT_ACTIONS } = require('../middleware/audit');

const router = express.Router();

// Validation rules
const userIdValidation = [
  param('userId').isInt({ min: 1 }).withMessage('Valid user ID is required')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long')
];

// GET /api/admin/users - List all users with pagination and search
router.get('/users', paginationValidation, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;


    const db = getDb();

    // Build search query
    let whereClause = '';
    let searchParams = [];
    
    if (search) {
      whereClause = 'WHERE u.email LIKE ? OR u.role LIKE ?';
      searchParams = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const [countResult] = await db.execute(countQuery, searchParams);
    const total = countResult[0].total;

    // Get users with project count
    const usersQuery = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.status,
        u.created_at,
        COUNT(p.id) as project_count,
        MAX(al.ts) as last_login
      FROM users u
      LEFT JOIN projects p ON u.id = p.owner_id
      LEFT JOIN audit_logs al ON u.id = al.actor_user_id AND al.action = 'login.success'
      ${whereClause}
      GROUP BY u.id, u.email, u.role, u.status, u.created_at
      ORDER BY u.created_at DESC
      LIMIT ? offset ?`;
      const queryParams = [...searchParams, limit.toString(), offset.toString()];
   
    console.log({limit,offset,queryParams,usersQuery});
    const [users] = await db.execute(usersQuery, queryParams);

    // Log admin view
    await auditAdminView(req, 'users');

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:userId - Get specific user details
router.get('/users/:userId', userIdValidation, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const db = getDb();

    // Get user details with statistics
    const [users] = await db.execute(`
      SELECT 
        u.*,
        COUNT(DISTINCT p.id) as project_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN al.action = 'login.success' THEN al.id END) as login_count,
        MAX(CASE WHEN al.action = 'login.success' THEN al.ts END) as last_login
      FROM users u
      LEFT JOIN projects p ON u.id = p.owner_id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN audit_logs al ON u.id = al.actor_user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get user's recent projects
    const [projects] = await db.execute(`
      SELECT id, name, created_at
      FROM projects 
      WHERE owner_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);

    // Get user's recent audit logs
    const [recentLogs] = await db.execute(`
      SELECT action, entity_type, entity_id, result, ts, ip
      FROM audit_logs 
      WHERE actor_user_id = ? 
      ORDER BY ts DESC 
      LIMIT 10
    `, [userId]);

    res.json({
      user,
      projects,
      recent_activity: recentLogs
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// PUT /api/admin/users/:userId/block - Block a user
router.put('/users/:userId/block', userIdValidation, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const db = getDb();

    // Check if user exists and is not already blocked
    const [users] = await db.execute(
      'SELECT id, email, status FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent blocking admins (optional safety measure)
    const [adminCheck] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (adminCheck[0].role === 'admin') {
      return res.status(403).json({ error: 'Cannot block administrator accounts' });
    }

    if (user.status === 'blocked') {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Block the user
    const [result] = await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['blocked', userId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Failed to block user' });
    }

    // Log the admin action
    await auditUserAction(req, AUDIT_ACTIONS.ADMIN_USER_BLOCK, userId, {
      target_email: user.email,
      previous_status: user.status
    });

    res.json({ 
      message: 'User blocked successfully',
      user: {
        id: userId,
        email: user.email,
        status: 'blocked'
      }
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// PUT /api/admin/users/:userId/unblock - Unblock a user
router.put('/users/:userId/unblock', userIdValidation, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const db = getDb();

    // Check if user exists and is blocked
    const [users] = await db.execute(
      'SELECT id, email, status FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.status === 'active') {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Unblock the user
    const [result] = await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['active', userId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Failed to unblock user' });
    }

    // Log the admin action
    await auditUserAction(req, AUDIT_ACTIONS.ADMIN_USER_UNBLOCK, userId, {
      target_email: user.email,
      previous_status: user.status
    });

    res.json({ 
      message: 'User unblocked successfully',
      user: {
        id: userId,
        email: user.email,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/admin/logs - Get audit logs with filtering and pagination
router.get('/logs', [
  ...paginationValidation,
  query('action').optional().trim().isLength({ max: 100 }).withMessage('Action filter too long'),
  query('user_id').optional().isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  query('entity_type').optional().trim().isLength({ max: 50 }).withMessage('Entity type filter too long'),
  query('result').optional().isIn(['success', 'fail']).withMessage('Result must be success or fail'),
  query('date_from').optional().isISO8601().withMessage('Date from must be valid ISO date'),
  query('date_to').optional().isISO8601().withMessage('Date to must be valid ISO date')
], requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Build filters
    const filters = [];
    const params = [];

    if (req.query.action) {
      filters.push('al.action LIKE ?');
      params.push(`%${req.query.action}%`);
    }

    if (req.query.user_id) {
      filters.push('al.actor_user_id = ?');
      params.push(parseInt(req.query.user_id));
    }

    if (req.query.entity_type) {
      filters.push('al.entity_type = ?');
      params.push(req.query.entity_type);
    }

    if (req.query.result) {
      filters.push('al.result = ?');
      params.push(req.query.result);
    }

    if (req.query.date_from) {
      filters.push('al.ts >= ?');
      params.push(req.query.date_from);
    }

    if (req.query.date_to) {
      filters.push('al.ts <= ?');
      params.push(req.query.date_to);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const db = getDb();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`;
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Get logs with user information
    const logsQuery = `
      SELECT 
        al.*,
        u.email as actor_email,
        u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      ${whereClause}
      ORDER BY al.ts DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit.toString(), offset.toString()];
    const [logs] = await db.execute(logsQuery, queryParams);

    // Parse JSON details
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    // Log admin view
    await auditAdminView(req, 'logs');

    res.json({
      logs: parsedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        action: req.query.action,
        user_id: req.query.user_id,
        entity_type: req.query.entity_type,
        result: req.query.result,
        date_from: req.query.date_from,
        date_to: req.query.date_to
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const db = getDb();

    // Get various statistics
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users
      FROM users
    `);

    const [projectStats] = await db.execute(`
      SELECT COUNT(*) as total_projects
      FROM projects
    `);

    const [taskStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks
      FROM tasks
    `);

    const [activityStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN action = 'login.success' THEN 1 END) as successful_logins,
        COUNT(CASE WHEN action = 'login.fail' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN ts >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as last_24h_activity
      FROM audit_logs
    `);

    // Get recent registrations (last 7 days)
    const [recentUsers] = await db.execute(`
      SELECT COUNT(*) as new_users_7d
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Get most active users (by project count)
    const [activeUsers] = await db.execute(`
      SELECT 
        u.email,
        u.role,
        COUNT(p.id) as project_count
      FROM users u
      LEFT JOIN projects p ON u.id = p.owner_id
      WHERE u.status = 'active'
      GROUP BY u.id, u.email, u.role
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT 5
    `);

    res.json({
      users: userStats[0],
      projects: projectStats[0],
      tasks: taskStats[0],
      activity: activityStats[0],
      recent_registrations: recentUsers[0],
      most_active_users: activeUsers
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/projects - View all projects (admin overview)
router.get('/projects', paginationValidation, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build search query
    let whereClause = '';
    let searchParams = [];
    
    if (search) {
      whereClause = 'WHERE p.name LIKE ? OR u.email LIKE ?';
      searchParams = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects p 
      JOIN users u ON p.owner_id = u.id 
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, searchParams);
    const total = countResult[0].total;

    // Get projects with owner and task info
    const projectsQuery = `
      SELECT 
        p.*,
        u.email as owner_email,
        u.status as owner_status,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      ${whereClause}
      GROUP BY p.id, u.email, u.status
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...searchParams, limit, offset];
    const [projects] = await db.execute(projectsQuery, queryParams);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

module.exports = router;

const { getDb } = require('../config/database');

// Audit log actions
const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAIL: 'login.fail',
  PROJECT_VIEW: 'project.view',
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  TASK_VIEW: 'task.view',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  ADMIN_USER_BLOCK: 'admin.user.block',
  ADMIN_USER_UNBLOCK: 'admin.user.unblock',
  ADMIN_USERS_VIEW: 'admin.users.view',
  ADMIN_LOGS_VIEW: 'admin.logs.view'
};

// Create audit log entry
const createAuditLog = async ({
  actorUserId = null,
  action,
  entityType = null,
  entityId = null,
  result = 'success',
  ip = null,
  userAgent = null,
  details = null
}) => {
  try {
    const db = getDb();
    
    await db.execute(`
      INSERT INTO audit_logs (
        actor_user_id, action, entity_type, entity_id, 
        result, ip, user_agent, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      actorUserId,
      action,
      entityType,
      entityId,
      result,
      ip,
      userAgent,
      details ? JSON.stringify(details) : null
    ]);
    
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking the main flow
  }
};

// Middleware to capture basic request info
const auditLogger = (req, res, next) => {
  // Store audit function on request for use in routes
  req.audit = async (action, entityType = null, entityId = null, result = 'success', details = null) => {
    await createAuditLog({
      actorUserId: req.user?.id || null,
      action,
      entityType,
      entityId,
      result,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      details
    });
  };
  
  next();
};

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
};

// Specific audit functions for common actions
const auditLogin = async (email, success, ip, userAgent, userId = null, error = null) => {
  await createAuditLog({
    actorUserId: userId,
    action: success ? AUDIT_ACTIONS.LOGIN_SUCCESS : AUDIT_ACTIONS.LOGIN_FAIL,
    entityType: 'user',
    entityId: userId,
    result: success ? 'success' : 'fail',
    ip,
    userAgent,
    details: success ? null : { email, error: error?.message }
  });
};

const auditProjectView = async (req, projectId) => {
  await req.audit(AUDIT_ACTIONS.PROJECT_VIEW, 'project', projectId);
};

const auditTaskView = async (req, taskId) => {
  await req.audit(AUDIT_ACTIONS.TASK_VIEW, 'task', taskId);
};

const auditUserAction = async (req, action, targetUserId, details = null) => {
  await req.audit(action, 'user', targetUserId, 'success', details);
};

const auditAdminView = async (req, viewType) => {
  await req.audit(
    viewType === 'users' ? AUDIT_ACTIONS.ADMIN_USERS_VIEW : AUDIT_ACTIONS.ADMIN_LOGS_VIEW,
    'admin_view',
    null
  );
};

module.exports = {
  AUDIT_ACTIONS,
  createAuditLog,
  auditLogger,
  getClientIP,
  auditLogin,
  auditProjectView,
  auditTaskView,
  auditUserAction,
  auditAdminView
};
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { getDb } = require('../config/database');
const { requireUserOrAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { auditProjectView, auditTaskView, AUDIT_ACTIONS } = require('../middleware/audit');

const router = express.Router();

// Validation rules
const projectValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Project name is required and must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
];

const taskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Task title is required and must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('status')
    .optional()
    .isIn(['new', 'in_progress', 'done'])
    .withMessage('Status must be one of: new, in_progress, done')
];

const idValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required')
];

// GET /api/projects - List user's projects (or all for admin)
router.get('/', requireUserOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    let query = `
      SELECT p.*, u.email as owner_email,
             COUNT(t.id) as task_count,
             COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
    `;
    let params = [];

    if (req.user.role === 'user') {
      query += ' WHERE p.owner_id = ?';
      params.push(req.user.id);
    }

    query += ' GROUP BY p.id, u.email ORDER BY p.created_at DESC';

    const [projects] = await db.execute(query, params);

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:id', idValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.id);
    const db = getDb();

    // Get project with owner info
    let query = `
      SELECT p.*, u.email as owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `;
    let params = [projectId];

    // Non-admin users can only see their own projects
    if (req.user.role === 'user') {
      query += ' AND p.owner_id = ?';
      params.push(req.user.id);
    }

    const [projects] = await db.execute(query, params);

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[0];

    // Log project view
    await auditProjectView(req, projectId);

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', projectValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, description } = req.body;
    const db = getDb();

    const [result] = await db.execute(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );

    const projectId = result.insertId;

    // Get created project
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    await req.audit(AUDIT_ACTIONS.PROJECT_CREATE, 'project', projectId);

    res.status(201).json({ 
      message: 'Project created successfully',
      project: projects[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', idValidation, projectValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.id);
    const { name, description } = req.body;
    const db = getDb();

    // Check ownership (non-admin users can only update their own projects)
    if (req.user.role === 'user') {
      const [projects] = await db.execute(
        'SELECT owner_id FROM projects WHERE id = ?',
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (projects[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [result] = await db.execute(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get updated project
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    await req.audit(AUDIT_ACTIONS.PROJECT_UPDATE, 'project', projectId);

    res.json({ 
      message: 'Project updated successfully',
      project: projects[0]
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', idValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.id);
    const db = getDb();

    // Check ownership (non-admin users can only delete their own projects)
    if (req.user.role === 'user') {
      const [projects] = await db.execute(
        'SELECT owner_id FROM projects WHERE id = ?',
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (projects[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [result] = await db.execute(
      'DELETE FROM projects WHERE id = ?',
      [projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await req.audit(AUDIT_ACTIONS.PROJECT_DELETE, 'project', projectId);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:id/tasks - Get tasks for a project
router.get('/:id/tasks', idValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.id);
    const db = getDb();

    // Check if project exists and user has access
    let projectQuery = 'SELECT id, name, owner_id FROM projects WHERE id = ?';
    let projectParams = [projectId];

    if (req.user.role === 'user') {
      projectQuery += ' AND owner_id = ?';
      projectParams.push(req.user.id);
    }

    const [projects] = await db.execute(projectQuery, projectParams);

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get tasks for the project
    const [tasks] = await db.execute(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );

    res.json({ 
      project: projects[0],
      tasks 
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/projects/:id/tasks - Create new task
router.post('/:id/tasks', idValidation, taskValidation, requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.id);
    const { title, description, status = 'new' } = req.body;
    const db = getDb();

    // Check if project exists and user has access
    if (req.user.role === 'user') {
      const [projects] = await db.execute(
        'SELECT owner_id FROM projects WHERE id = ?',
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (projects[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [result] = await db.execute(
      'INSERT INTO tasks (project_id, title, description, status) VALUES (?, ?, ?, ?)',
      [projectId, title, description, status]
    );

    const taskId = result.insertId;

    // Get created task
    const [tasks] = await db.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    await req.audit(AUDIT_ACTIONS.TASK_CREATE, 'task', taskId);

    res.status(201).json({ 
      message: 'Task created successfully',
      task: tasks[0]
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/projects/:projectId/tasks/:taskId - Get specific task
router.get('/:projectId/tasks/:taskId', [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID is required'),
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID is required')
], requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    const db = getDb();

    // Get task with project info
    let query = `
      SELECT t.*, p.name as project_name, p.owner_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND t.project_id = ?
    `;
    let params = [taskId, projectId];

    if (req.user.role === 'user') {
      query += ' AND p.owner_id = ?';
      params.push(req.user.id);
    }

    const [tasks] = await db.execute(query, params);

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await auditTaskView(req, taskId);

    res.json({ task: tasks[0] });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId - Update task
router.put('/:projectId/tasks/:taskId', [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID is required'),
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID is required'),
  ...taskValidation
], requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    const { title, description, status } = req.body;
    const db = getDb();

    // Check access
    if (req.user.role === 'user') {
      const [tasks] = await db.execute(
        'SELECT p.owner_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND t.project_id = ?',
        [taskId, projectId]
      );

      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (tasks[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [result] = await db.execute(
      'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ? AND project_id = ?',
      [title, description, status, taskId, projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get updated task
    const [tasks] = await db.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    await req.audit(AUDIT_ACTIONS.TASK_UPDATE, 'task', taskId);

    res.json({ 
      message: 'Task updated successfully',
      task: tasks[0]
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId - Delete task
router.delete('/:projectId/tasks/:taskId', [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID is required'),
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID is required')
], requireUserOrAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    const db = getDb();

    // Check access
    if (req.user.role === 'user') {
      const [tasks] = await db.execute(
        'SELECT p.owner_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND t.project_id = ?',
        [taskId, projectId]
      );

      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (tasks[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [result] = await db.execute(
      'DELETE FROM tasks WHERE id = ? AND project_id = ?',
      [taskId, projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await req.audit(AUDIT_ACTIONS.TASK_DELETE, 'task', taskId);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
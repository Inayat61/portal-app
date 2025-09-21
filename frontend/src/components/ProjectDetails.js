import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, Table } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaCheck, FaClock, FaPlay } from 'react-icons/fa';
import { projectAPI, handleAPIError } from '../services/api';
import { format } from 'date-fns';

const ProjectDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'new'
  });
  const [error, setError] = useState('');

  // Fetch project details with tasks
  const { data, isLoading, error: fetchError } = useQuery(
    ['project', id],
    () => projectAPI.getTasks(id).then(res => res.data),
    {
      onError: (error) => {
        console.error('Failed to fetch project:', error);
      }
    }
  );

  // Create/Update task mutation
  const taskMutation = useMutation(
    (taskData) => {
      if (editingTask) {
        return projectAPI.updateTask(id, editingTask.id, taskData);
      } else {
        return projectAPI.createTask(id, taskData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', id]);
        handleCloseModal();
      },
      onError: (error) => {
        const errorInfo = handleAPIError(error);
        setError(errorInfo.message);
      }
    }
  );

  // Delete task mutation
  const deleteMutation = useMutation(
    (taskId) => projectAPI.deleteTask(id, taskId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', id]);
      },
      onError: (error) => {
        console.error('Delete failed:', error);
      }
    }
  );

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskFormData({ title: '', description: '', status: 'new' });
    setError('');
  };

  const handleShowModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        status: task.status
      });
    } else {
      setEditingTask(null);
      setTaskFormData({ title: '', description: '', status: 'new' });
    }
    setError('');
    setShowTaskModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    taskMutation.mutate(taskFormData);
  };

  const handleChange = (e) => {
    setTaskFormData({
      ...taskFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(taskId);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <FaCheck className="text-success" />;
      case 'in_progress':
        return <FaPlay className="text-warning" />;
      default:
        return <FaClock className="text-primary" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'new': 'primary',
      'in_progress': 'warning',
      'done': 'success'
    };
    
    const labels = {
      'new': 'New',
      'in_progress': 'In Progress',
      'done': 'Done'
    };

    return <Badge bg={variants[status]}>{labels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <Container className="mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (fetchError) {
    const errorInfo = handleAPIError(fetchError);
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          Failed to load project: {errorInfo.message}
        </Alert>
        <Link to="/projects" className="btn btn-outline-primary">
          <FaArrowLeft className="me-2" />
          Back to Projects
        </Link>
      </Container>
    );
  }

  const { project, tasks } = data;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <Container className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <Link to="/projects" className="btn btn-outline-secondary me-3">
              <FaArrowLeft />
            </Link>
            <div className="flex-grow-1">
              <h2 className="mb-1">{project.name}</h2>
              {project.description && (
                <p className="text-muted mb-0">{project.description}</p>
              )}
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <FaPlus className="me-2" />
              Add Task
            </Button>
          </div>
          
          {/* Project Stats */}
          <Row>
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h4 className="mb-1">{tasks.length}</h4>
                  <small className="text-muted">Total Tasks</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h4 className="mb-1">{completedTasks}</h4>
                  <small className="text-muted">Completed</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h4 className="mb-1">{completionPercentage}%</h4>
                  <small className="text-muted">Progress</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Tasks */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Tasks</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {tasks.length > 0 ? (
                <Table responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th width="40">Status</th>
                      <th>Task</th>
                      <th width="120">Status</th>
                      <th width="150">Created</th>
                      <th width="120">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td className="text-center">
                          {getStatusIcon(task.status)}
                        </td>
                        <td>
                          <div>
                            <strong>{task.title}</strong>
                            {task.description && (
                              <div className="small text-muted">
                                {task.description.length > 100
                                  ? task.description.substring(0, 100) + '...'
                                  : task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="small text-muted">
                          {format(new Date(task.created_at), 'MMM d, yyyy')}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleShowModal(task)}
                              disabled={taskMutation.isLoading}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                              disabled={deleteMutation.isLoading}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-5">
                  <FaClock size={48} className="text-muted mb-3" />
                  <h5>No Tasks Yet</h5>
                  <p className="text-muted mb-4">
                    Start by adding your first task to this project.
                  </p>
                  <Button variant="primary" onClick={() => handleShowModal()}>
                    <FaPlus className="me-2" />
                    Add First Task
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Task Modal */}
      <Modal show={showTaskModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Task Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={taskFormData.title}
                onChange={handleChange}
                placeholder="Enter task title"
                required
                disabled={taskMutation.isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={taskFormData.description}
                onChange={handleChange}
                placeholder="Enter task description (optional)"
                disabled={taskMutation.isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={taskFormData.status}
                onChange={handleChange}
                disabled={taskMutation.isLoading}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={handleCloseModal}
              disabled={taskMutation.isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={taskMutation.isLoading}
            >
              {taskMutation.isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  {editingTask ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingTask ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectDetail;
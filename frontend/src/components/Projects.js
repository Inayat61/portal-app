import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaPlus, FaEye, FaTasks, FaCalendarAlt } from 'react-icons/fa';
import { projectAPI, handleAPIError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const Projects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');

  // Fetch projects
  const { data: projects, isLoading, error: fetchError } = useQuery(
    'projects',
    () => projectAPI.list().then(res => res.data.projects),
    {
      onError: (error) => {
        console.error('Failed to fetch projects:', error);
      }
    }
  );

  // Create project mutation
  const createMutation = useMutation(
    (projectData) => projectAPI.create(projectData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        setShowModal(false);
        setFormData({ name: '', description: '' });
        setError('');
      },
      onError: (error) => {
        const errorInfo = handleAPIError(error);
        setError(errorInfo.message);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    createMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getTaskStatusColor = (completedTasks, totalTasks) => {
    if (totalTasks === 0) return 'secondary';
    const percentage = (completedTasks / totalTasks) * 100;
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'warning';
    return 'primary';
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
          Failed to load projects: {errorInfo.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>My Projects</h2>
              <p className="text-muted mb-0">
                {projects?.length || 0} project{projects?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <FaPlus className="me-2" />
              New Project
            </Button>
          </div>
        </Col>
      </Row>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <Row>
          {projects.map((project) => (
            <Col key={project.id} md={6} lg={4} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column">
                  <div className="mb-3">
                    <Card.Title className="h5">{project.name}</Card.Title>
                    {project.description && (
                      <Card.Text className="text-muted small">
                        {project.description.length > 100
                          ? project.description.substring(0, 100) + '...'
                          : project.description}
                      </Card.Text>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Tasks Progress</span>
                      <Badge 
                        bg={getTaskStatusColor(project.completed_tasks, project.task_count)}
                        className="small"
                      >
                        {project.completed_tasks}/{project.task_count}
                      </Badge>
                    </div>
                    
                    {project.task_count > 0 && (
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className={`progress-bar bg-${getTaskStatusColor(project.completed_tasks, project.task_count)}`}
                          style={{
                            width: `${(project.completed_tasks / project.task_count) * 100}%`
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="small text-muted mb-3">
                    <FaCalendarAlt className="me-1" />
                    Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                  </div>

                  <div className="mt-auto">
                    <Link
                      to={`/projects/${project.id}`}
                      className="btn btn-outline-primary btn-sm w-100"
                    >
                      <FaEye className="me-2" />
                      View Details
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="text-center py-5">
          <FaTasks size={64} className="text-muted mb-3" />
          <h4>No Projects Yet</h4>
          <p className="text-muted mb-4">
            Create your first project to get started with task management.
          </p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <FaPlus className="me-2" />
            Create First Project
          </Button>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter project name"
                required
                disabled={createMutation.isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter project description (optional)"
                disabled={createMutation.isLoading}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowModal(false)}
              disabled={createMutation.isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Projects;
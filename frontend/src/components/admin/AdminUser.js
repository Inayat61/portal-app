import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Badge, Alert, Pagination } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaSearch, FaUserShield, FaUserSlash, FaUser, FaCalendarAlt, FaProjectDiagram } from 'react-icons/fa';
import { adminAPI, handleAPIError } from '../../services/api';
import { format } from 'date-fns';

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  
  const limit = 20;

  // Fetch users
  const { data, isLoading, error: fetchError } = useQuery(  
    ['admin-users', { page: currentPage, search, limit }],
    () => adminAPI.getUsers({ page: currentPage || 1 ,search: search || '', limit: limit || 20 }).then(res => res.data),
    {
      keepPreviousData: true,
      onError: (error) => {
        console.error('Failed to fetch users:', error);
      }
    }
  );

  // Block user mutation
  const blockMutation = useMutation(
    (userId) => adminAPI.blockUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        setError('');
      },
      onError: (error) => {
        const errorInfo = handleAPIError(error);
        setError(errorInfo.message);
      }
    }
  );

  // Unblock user mutation
  const unblockMutation = useMutation(
    (userId) => adminAPI.unblockUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        setError('');
      },
      onError: (error) => {
        const errorInfo = handleAPIError(error);
        setError(errorInfo.message);
      }
    }
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleBlock = (userId, email) => {
    if (window.confirm(`Are you sure you want to block user: ${email}?`)) {
      blockMutation.mutate(userId);
    }
  };

  const handleUnblock = (userId, email) => {
    if (window.confirm(`Are you sure you want to unblock user: ${email}?`)) {
      unblockMutation.mutate(userId);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getUserStatusBadge = (status) => {
    return (
      <Badge bg={status === 'active' ? 'success' : 'danger'}>
        {status}
      </Badge>
    );
  };

  const getRoleBadge = (role) => {
    return (
      <Badge bg={role === 'admin' ? 'warning' : 'primary'}>
        {role === 'admin' ? (
          <>
            <FaUserShield className="me-1" />
            Admin
          </>
        ) : (
          <>
            <FaUser className="me-1" />
            User
          </>
        )}
      </Badge>
    );
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
          Failed to load users: {errorInfo.message}
        </Alert>
      </Container>
    );
  }

  const { users, pagination } = data || { users: [], pagination: {} };

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const { page, totalPages } = pagination;
    
    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        disabled={page <= 1}
        onClick={() => handlePageChange(page - 1)}
      />
    );

    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      items.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>1</Pagination.Item>);
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        disabled={page >= totalPages}
        onClick={() => handlePageChange(page + 1)}
      />
    );

    return items;
  };

  return (
    <Container className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>User Management</h2>
          <p className="text-muted">
            Manage user accounts, roles, and access permissions
          </p>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search by email or role..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button variant="outline-primary" type="submit">
                <FaSearch />
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col md={6} className="text-md-end">
          <div className="small text-muted">
            Showing {users.length} of {pagination.total || 0} users
          </div>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <Card.Body className="p-0">
          {users.length > 0 ? (
            <>
              <Table responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th width="100">Role</th>
                    <th width="100">Status</th>
                    <th width="120">Projects</th>
                    <th width="150">Last Login</th>
                    <th width="130">Registered</th>
                    <th width="120">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <strong>{user.email}</strong>
                          <div className="small text-muted">ID: {user.id}</div>
                        </div>
                      </td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{getUserStatusBadge(user.status)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaProjectDiagram className="me-1 text-muted" />
                          <span>{user.project_count || 0}</span>
                        </div>
                      </td>
                      <td className="small">
                        {user.last_login ? (
                          format(new Date(user.last_login), 'MMM d, yyyy HH:mm')
                        ) : (
                          <span className="text-muted">Never</span>
                        )}
                      </td>
                      <td className="small">
                        <FaCalendarAlt className="me-1 text-muted" />
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        {user.role !== 'admin' && (
                          <div className="d-flex gap-1">
                            {user.status === 'active' ? (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleBlock(user.id, user.email)}
                                disabled={blockMutation.isLoading}
                                title="Block User"
                              >
                                <FaUserSlash />
                              </Button>
                            ) : (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleUnblock(user.id, user.email)}
                                disabled={unblockMutation.isLoading}
                                title="Unblock User"
                              >
                                <FaUser />
                              </Button>
                            )}
                          </div>
                        )}
                        {user.role === 'admin' && (
                          <small className="text-muted">Protected</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="small text-muted">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <Pagination className="mb-0">
                    {generatePaginationItems()}
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <FaUser size={48} className="text-muted mb-3" />
              <h5>No Users Found</h5>
              <p className="text-muted">
                {search ? 'No users match your search criteria.' : 'No users in the system.'}
              </p>
              {search && (
                <Button 
                  variant="outline-primary" 
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                    setCurrentPage(1);
                  }}
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      {data && (
        <Row className="mt-4">
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="mb-1">{pagination.total || 0}</h4>
                <small className="text-muted">Total Users</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="mb-1 text-success">
                  {users.filter(u => u.status === 'active').length}
                </h4>
                <small className="text-muted">Active</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="mb-1 text-danger">
                  {users.filter(u => u.status === 'blocked').length}
                </h4>
                <small className="text-muted">Blocked</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="mb-1 text-warning">
                  {users.filter(u => u.role === 'admin').length}
                </h4>
                <small className="text-muted">Admins</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default AdminUsers;
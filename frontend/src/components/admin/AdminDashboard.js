import React from 'react';
import { Container, Row, Col, Card, Table } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { FaUsers, FaProjectDiagram, FaTasks, FaChartLine, FaEye, FaClock } from 'react-icons/fa';
import { adminAPI, handleAPIError } from '../../services/api';
import { format } from 'date-fns';

const AdminDashboard = () => {
  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'admin-stats',
    () => adminAPI.getStats().then(res => res.data),
    {
      onError: (error) => {
        console.error('Failed to fetch stats:', error);
      }
    }
  );

  // Fetch recent logs
  const { data: recentLogs, isLoading: logsLoading } = useQuery(
    'recent-logs',
    () => adminAPI.getLogs({ limit: 10 }).then(res => res.data.logs),
    {
      onError: (error) => {
        console.error('Failed to fetch recent logs:', error);
      }
    }
  );

  const StatCard = ({ title, value, icon, color = 'primary', subtitle = null }) => (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body className="d-flex align-items-center">
        <div className={`rounded-circle bg-${color} bg-opacity-10 p-3 me-3`}>
          <div className={`text-${color}`} style={{ fontSize: '1.5rem' }}>
            {icon}
          </div>
        </div>
        <div className="flex-grow-1">
          <h3 className="mb-0">{value}</h3>
          <p className="text-muted mb-0">{title}</p>
          {subtitle && (
            <small className="text-success">{subtitle}</small>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  const getActionBadgeColor = (action) => {
    if (action.includes('login.success')) return 'success';
    if (action.includes('login.fail')) return 'danger';
    if (action.includes('block') || action.includes('unblock')) return 'warning';
    if (action.includes('admin')) return 'info';
    return 'secondary';
  };

  if (statsLoading || logsLoading) {
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

  return (
    <Container className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>Admin Dashboard</h2>
          <p className="text-muted">System overview and recent activity</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={6} lg={3} className="mb-3">
            <StatCard
              title="Total Users"
              value={stats.users?.total_users || 0}
              icon={<FaUsers />}
              color="primary"
              subtitle={`${stats.recent_registrations?.new_users_7d || 0} new this week`}
            />
          </Col>
          
          <Col md={6} lg={3} className="mb-3">
            <StatCard
              title="Active Users"
              value={stats.users?.active_users || 0}
              icon={<FaUsers />}
              color="success"
              subtitle={`${stats.users?.blocked_users || 0} blocked`}
            />
          </Col>
          
          <Col md={6} lg={3} className="mb-3">
            <StatCard
              title="Projects"
              value={stats.projects?.total_projects || 0}
              icon={<FaProjectDiagram />}
              color="info"
            />
          </Col>
          
          <Col md={6} lg={3} className="mb-3">
            <StatCard
              title="Tasks"
              value={stats.tasks?.total_tasks || 0}
              icon={<FaTasks />}
              color="warning"
              subtitle={`${stats.tasks?.completed_tasks || 0} completed`}
            />
          </Col>
        </Row>
      )}

      <Row>
        {/* Quick Actions */}
        <Col lg={4} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Link to="/admin/users" className="btn btn-outline-primary">
                  <FaUsers className="me-2" />
                  Manage Users
                </Link>
                <Link to="/admin/logs" className="btn btn-outline-info">
                  <FaChartLine className="me-2" />
                  View Audit Logs
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* System Stats */}
          {stats && (
            <Card className="mt-4">
              <Card.Header>
                <h5 className="mb-0">Activity Stats</h5>
              </Card.Header>
              <Card.Body>
                <div className="small">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total Login Attempts:</span>
                    <strong>{stats.activity?.total_logs || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-success">Successful Logins:</span>
                    <strong>{stats.activity?.successful_logins || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-danger">Failed Logins:</span>
                    <strong>{stats.activity?.failed_logins || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Last 24h Activity:</span>
                    <strong>{stats.activity?.last_24h_activity || 0}</strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Recent Activity */}
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Activity</h5>
              <Link to="/admin/logs" className="btn btn-sm btn-outline-primary">
                <FaEye className="me-1" />
                View All
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {recentLogs && recentLogs.length > 0 ? (
                <Table responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th width="120">Time</th>
                      <th width="150">User</th>
                      <th>Action</th>
                      <th width="80">Result</th>
                      <th width="120">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td className="small">
                          <FaClock className="me-1" />
                          {format(new Date(log.ts), 'HH:mm:ss')}
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {format(new Date(log.ts), 'MMM d')}
                          </div>
                        </td>
                        <td className="small">
                          {log.actor_email ? (
                            <div>
                              <div>{log.actor_email}</div>
                              <small className="text-muted">{log.actor_role}</small>
                            </div>
                          ) : (
                            <span className="text-muted">System</span>
                          )}
                        </td>
                        <td>
                          <span 
                            className={`badge bg-${getActionBadgeColor(log.action)}`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {log.action}
                          </span>
                          {log.entity_type && (
                            <div className="small text-muted">
                              {log.entity_type} #{log.entity_id}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            log.result === 'success' ? 'bg-success' : 'bg-danger'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                        <td className="small font-monospace">
                          {log.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <FaChartLine size={32} className="text-muted mb-2" />
                  <p className="text-muted">No recent activity</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Most Active Users */}
      {stats?.most_active_users && stats.most_active_users.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Most Active Users</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Email</th>
                      <th width="100">Role</th>
                      <th width="120">Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.most_active_users.map((user, index) => (
                      <tr key={index}>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge ${
                            user.role === 'admin' ? 'bg-warning' : 'bg-primary'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <strong>{user.project_count}</strong> project{user.project_count !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default AdminDashboard;
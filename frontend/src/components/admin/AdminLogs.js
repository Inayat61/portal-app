import { Container, Row, Col, Card, Table, Alert } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { FaClock, FaUser, FaCheck, FaTimes } from 'react-icons/fa';
import { adminAPI, handleAPIError } from '../../services/api';
import { format } from 'date-fns';

const AdminLogs = () => {
  
  // Fetch logs - simplified without parameters
  const { data, isLoading, error: fetchError } = useQuery(
    'admin-logs',
    () => adminAPI.getLogs({ page: 1 ,search: '', limit: 20 }).then(res => res.data),
    {
      onError: (error) => {
        console.error('Failed to fetch logs:', error);
      }
    }
  );

  const getActionBadge = (action) => {
    const variants = {
      'login.success': 'success',
      'login.fail': 'danger',
      'project.view': 'info',
      'project.create': 'primary',
      'project.update': 'warning',
      'project.delete': 'danger',
      'task.view': 'info',
      'task.create': 'primary',
      'task.update': 'warning',
      'task.delete': 'danger',
      'admin.user.block': 'warning',
      'admin.user.unblock': 'success',
      'admin.users.view': 'info',
      'admin.logs.view': 'info'
    };

    return (
      <span className={`badge bg-${variants[action] || 'secondary'} font-monospace`}>
        {action}
      </span>
    );
  };

  const getResultBadge = (result) => {
    return (
      <span className={`badge bg-${result === 'success' ? 'success' : 'danger'}`}>
        {result === 'success' ? (
          <>
            <FaCheck className="me-1" />
            Success
          </>
        ) : (
          <>
            <FaTimes className="me-1" />
            Failed
          </>
        )}
      </span>
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
          Failed to load audit logs: {errorInfo.message}
        </Alert>
      </Container>
    );
  }

  const { logs } = data || { logs: [] };

  return (
    <Container className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>Audit Logs</h2>
          <p className="text-muted mb-0">
            System activity and security audit trail
          </p>
        </Col>
      </Row>

      {/* Logs Table */}
      <Card>
        <Card.Body className="p-0">
          {logs.length > 0 ? (
            <Table responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th width="140">Timestamp</th>
                  <th width="180">User</th>
                  <th>Action</th>
                  <th width="100">Entity</th>
                  <th width="80">Result</th>
                  <th width="120">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="small font-monospace">
                      <FaClock className="me-1 text-muted" />
                      <div>{format(new Date(log.ts), 'MMM d, yyyy')}</div>
                      <div className="text-muted">
                        {format(new Date(log.ts), 'HH:mm:ss')}
                      </div>
                    </td>
                    
                    <td className="small">
                      {log.actor_email ? (
                        <div>
                          <div className="d-flex align-items-center">
                            <FaUser className="me-1 text-muted" />
                            {log.actor_email}
                          </div>
                          <div className="text-muted">
                            {log.actor_role} (ID: {log.actor_user_id})
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">System</span>
                      )}
                    </td>
                    
                    <td>
                      {getActionBadge(log.action)}
                    </td>
                    
                    <td className="small">
                      {log.entity_type && (
                        <div>
                          <div>{log.entity_type}</div>
                          {log.entity_id && (
                            <div className="text-muted">#{log.entity_id}</div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td>
                      {getResultBadge(log.result)}
                    </td>
                    
                    <td className="small font-monospace">
                      {log.ip || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5">
              <FaClock size={48} className="text-muted mb-3" />
              <h5>No Logs Found</h5>
              <p className="text-muted">
                No audit logs available.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminLogs;
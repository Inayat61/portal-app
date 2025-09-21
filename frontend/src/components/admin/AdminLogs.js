// import React, { useState } from 'react';
// import { Container, Row, Col, Card, Table, Form, InputGroup, Button, Badge, Alert, Pagination } from 'react-bootstrap';
// import { useQuery } from 'react-query';
// import { FaSearch, FaFilter, FaDownload, FaClock, FaUser, FaCheck, FaTimes } from 'react-icons/fa';
// import { adminAPI, handleAPIError } from '../../services/api';
// import { format } from 'date-fns';

// const AdminLogs = () => {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [filters, setFilters] = useState({
//     action: '',
//     user_id: '',
//     entity_type: '',
//     result: '',
//     date_from: '',
//     date_to: ''
//   });
//   const [showFilters, setShowFilters] = useState(false);
  
//   const limit = 50;

//   // Fetch logs
//   const { data, isLoading, error: fetchError } = useQuery(
//     ['admin-logs', { page: currentPage, limit, ...filters }],
//     () => adminAPI.getLogs({ page: currentPage, limit, ...filters }).then(res => res.data),
//     {
//       keepPreviousData: true,
//       onError: (error) => {
//         console.error('Failed to fetch logs:', error);
//       }
//     }
//   );

//   const handleFilterChange = (e) => {
//     const { name, value } = e.target;
//     setFilters(prev => ({
//       ...prev,
//       [name]: value
//     }));
//     setCurrentPage(1); // Reset to first page when filters change
//   };

//   const handleClearFilters = () => {
//     setFilters({
//       action: '',
//       user_id: '',
//       entity_type: '',
//       result: '',
//       date_from: '',
//       date_to: ''
//     });
//     setCurrentPage(1);
//   };

//   const handlePageChange = (page) => {
//     setCurrentPage(page);
//   };

//   const getActionBadge = (action) => {
//     const variants = {
//       'login.success': 'success',
//       'login.fail': 'danger',
//       'project.view': 'info',
//       'project.create': 'primary',
//       'project.update': 'warning',
//       'project.delete': 'danger',
//       'task.view': 'info',
//       'task.create': 'primary',
//       'task.update': 'warning',
//       'task.delete': 'danger',
//       'admin.user.block': 'warning',
//       'admin.user.unblock': 'success',
//       'admin.users.view': 'info',
//       'admin.logs.view': 'info'
//     };

//     return (
//       <Badge bg={variants[action] || 'secondary'} className="font-monospace">
//         {action}
//       </Badge>
//     );
//   };

//   const getResultBadge = (result) => {
//     return (
//       <Badge bg={result === 'success' ? 'success' : 'danger'}>
//         {result === 'success' ? (
//           <>
//             <FaCheck className="me-1" />
//             Success
//           </>
//         ) : (
//           <>
//             <FaTimes className="me-1" />
//             Failed
//           </>
//         )}
//       </Badge>
//     );
//   };

//   const exportLogs = () => {
//     // In a real application, you would implement CSV/Excel export
//     alert('Export functionality would be implemented here');
//   };

//   if (isLoading) {
//     return (
//       <Container className="mt-4">
//         <div className="d-flex justify-content-center">
//           <div className="spinner-border" role="status">
//             <span className="visually-hidden">Loading...</span>
//           </div>
//         </div>
//       </Container>
//     );
//   }

//   if (fetchError) {
//     const errorInfo = handleAPIError(fetchError);
//     return (
//       <Container className="mt-4">
//         <Alert variant="danger">
//           Failed to load audit logs: {errorInfo.message}
//         </Alert>
//       </Container>
//     );
//   }

//   const { logs, pagination } = data || { logs: [], pagination: {} };

//   // Generate pagination items
//   const generatePaginationItems = () => {
//     const items = [];
//     const { page, totalPages } = pagination;
    
//     // Previous button
//     items.push(
//       <Pagination.Prev
//         key="prev"
//         disabled={page <= 1}
//         onClick={() => handlePageChange(page - 1)}
//       />
//     );

//     // Page numbers
//     const startPage = Math.max(1, page - 2);
//     const endPage = Math.min(totalPages, page + 2);

//     if (startPage > 1) {
//       items.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>1</Pagination.Item>);
//       if (startPage > 2) {
//         items.push(<Pagination.Ellipsis key="start-ellipsis" />);
//       }
//     }

//     for (let i = startPage; i <= endPage; i++) {
//       items.push(
//         <Pagination.Item
//           key={i}
//           active={i === page}
//           onClick={() => handlePageChange(i)}
//         >
//           {i}
//         </Pagination.Item>
//       );
//     }

//     if (endPage < totalPages) {
//       if (endPage < totalPages - 1) {
//         items.push(<Pagination.Ellipsis key="end-ellipsis" />);
//       }
//       items.push(
//         <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>
//           {totalPages}
//         </Pagination.Item>
//       );
//     }

//     // Next button
//     items.push(
//       <Pagination.Next
//         key="next"
//         disabled={page >= totalPages}
//         onClick={() => handlePageChange(page + 1)}
//       />
//     );

//     return items;
//   };

//   return (
//     <Container className="mt-4">
//       {/* Header */}
//       <Row className="mb-4">
//         <Col>
//           <div className="d-flex justify-content-between align-items-center">
//             <div>
//               <h2>Audit Logs</h2>
//               <p className="text-muted mb-0">
//                 System activity and security audit trail
//               </p>
//             </div>
//             <div className="d-flex gap-2">
//               <Button
//                 variant="outline-primary"
//                 onClick={() => setShowFilters(!showFilters)}
//               >
//                 <FaFilter className="me-2" />
//                 {showFilters ? 'Hide Filters' : 'Show Filters'}
//               </Button>
//               <Button variant="outline-success" onClick={exportLogs}>
//                 <FaDownload className="me-2" />
//                 Export
//               </Button>
//             </div>
//           </div>
//         </Col>
//       </Row>

//       {/* Filters */}
//       {showFilters && (
//         <Card className="mb-4">
//           <Card.Header>
//             <h6 className="mb-0">Filters</h6>
//           </Card.Header>
//           <Card.Body>
//             <Row>
//               <Col md={6} lg={3} className="mb-3">
//                 <Form.Label>Action</Form.Label>
//                 <Form.Select
//                   name="action"
//                   value={filters.action}
//                   onChange={handleFilterChange}
//                 >
//                   <option value="">All Actions</option>
//                   <option value="login">Login Events</option>
//                   <option value="project">Project Events</option>
//                   <option value="task">Task Events</option>
//                   <option value="admin">Admin Events</option>
//                 </Form.Select>
//               </Col>
              
//               <Col md={6} lg={3} className="mb-3">
//                 <Form.Label>Result</Form.Label>
//                 <Form.Select
//                   name="result"
//                   value={filters.result}
//                   onChange={handleFilterChange}
//                 >
//                   <option value="">All Results</option>
//                   <option value="success">Success</option>
//                   <option value="fail">Failed</option>
//                 </Form.Select>
//               </Col>
              
//               <Col md={6} lg={3} className="mb-3">
//                 <Form.Label>Entity Type</Form.Label>
//                 <Form.Select
//                   name="entity_type"
//                   value={filters.entity_type}
//                   onChange={handleFilterChange}
//                 >
//                   <option value="">All Types</option>
//                   <option value="user">User</option>
//                   <option value="project">Project</option>
//                   <option value="task">Task</option>
//                   <option value="admin_view">Admin View</option>
//                 </Form.Select>
//               </Col>
              
//               <Col md={6} lg={3} className="mb-3">
//                 <Form.Label>User ID</Form.Label>
//                 <Form.Control
//                   type="number"
//                   name="user_id"
//                   value={filters.user_id}
//                   onChange={handleFilterChange}
//                   placeholder="Enter user ID"
//                 />
//               </Col>
              
//               <Col md={6} className="mb-3">
//                 <Form.Label>Date From</Form.Label>
//                 <Form.Control
//                   type="datetime-local"
//                   name="date_from"
//                   value={filters.date_from}
//                   onChange={handleFilterChange}
//                 />
//               </Col>
              
//               <Col md={6} className="mb-3">
//                 <Form.Label>Date To</Form.Label>
//                 <Form.Control
//                   type="datetime-local"
//                   name="date_to"
//                   value={filters.date_to}
//                   onChange={handleFilterChange}
//                 />
//               </Col>
//             </Row>
            
//             <div className="d-flex gap-2">
//               <Button variant="outline-secondary" onClick={handleClearFilters}>
//                 Clear Filters
//               </Button>
//               <div className="small text-muted d-flex align-items-center">
//                 Showing {logs.length} of {pagination.total || 0} logs
//               </div>
//             </div>
//           </Card.Body>
//         </Card>
//       )}

//       {/* Logs Table */}
//       <Card>
//         <Card.Body className="p-0">
//           {logs.length > 0 ? (
//             <>
//               <Table responsive className="mb-0">
//                 <thead className="table-light">
//                   <tr>
//                     <th width="140">Timestamp</th>
//                     <th width="180">User</th>
//                     <th>Action</th>
//                     <th width="100">Entity</th>
//                     <th width="80">Result</th>
//                     <th width="120">IP Address</th>
//                     <th width="120">Details</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {logs.map((log) => (
//                     <tr key={log.id}>
//                       <td className="small font-monospace">
//                         <FaClock className="me-1 text-muted" />
//                         <div>{format(new Date(log.ts), 'MMM d, yyyy')}</div>
//                         <div className="text-muted">
//                           {format(new Date(log.ts), 'HH:mm:ss')}
//                         </div>
//                       </td>
                      
//                       <td className="small">
//                         {log.actor_email ? (
//                           <div>
//                             <div className="d-flex align-items-center">
//                               <FaUser className="me-1 text-muted" />
//                               {log.actor_email}
//                             </div>
//                             <div className="text-muted">
//                               {log.actor_role} (ID: {log.actor_user_id})
//                             </div>
//                           </div>
//                         ) : (
//                           <span className="text-muted">System</span>
//                         )}
//                       </td>
                      
//                       <td>
//                         {getActionBadge(log.action)}
//                       </td>
                      
//                       <td className="small">
//                         {log.entity_type && (
//                           <div>
//                             <div>{log.entity_type}</div>
//                             {log.entity_id && (
//                               <div className="text-muted">#{log.entity_id}</div>
//                             )}
//                           </div>
//                         )}
//                       </td>
                      
//                       <td>
//                         {getResultBadge(log.result)}
//                       </td>
                      
//                       <td className="small font-monospace">
//                         {log.ip || 'N/A'}
//                       </td>
                      
//                       <td className="small">
//                         {log.details ? (
//                           <details>
//                             <summary className="text-primary" style={{ cursor: 'pointer' }}>
//                               View
//                             </summary>
//                             <pre className="mt-2 p-2 bg-light rounded small">
//                               {JSON.stringify(log.details, null, 2)}
//                             </pre>
//                           </details>
//                         ) : (
//                           <span className="text-muted">-</span>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </Table>

//               {/* Pagination */}
//               {pagination.totalPages > 1 && (
//                 <div className="d-flex justify-content-between align-items-center p-3 border-top">
//                   <div className="small text-muted">
//                     Page {pagination.page} of {pagination.totalPages} 
//                     ({pagination.total} total logs)
//                   </div>
//                   <Pagination className="mb-0">
//                     {generatePaginationItems()}
//                   </Pagination>
//                 </div>
//               )}
//             </>
//           ) : (
//             <div className="text-center py-5">
//               <FaClock size={48} className="text-muted mb-3" />
//               <h5>No Logs Found</h5>
//               <p className="text-muted">
//                 {Object.values(filters).some(f => f) 
//                   ? 'No logs match your current filters.' 
//                   : 'No audit logs available.'}
//               </p>
//               {Object.values(filters).some(f => f) && (
//                 <Button variant="outline-primary" onClick={handleClearFilters}>
//                   Clear Filters
//                 </Button>
//               )}
//             </div>
//           )}
//         </Card.Body>
//       </Card>

//       {/* Quick Stats */}
//       {logs.length > 0 && (
//         <Row className="mt-4">
//           <Col md={3}>
//             <Card className="border-0 bg-light">
//               <Card.Body className="text-center">
//                 <h4 className="mb-1 text-success">
//                   {logs.filter(l => l.result === 'success').length}
//                 </h4>
//                 <small className="text-muted">Successful</small>
//               </Card.Body>
//             </Card>
//           </Col>
//           <Col md={3}>
//             <Card className="border-0 bg-light">
//               <Card.Body className="text-center">
//                 <h4 className="mb-1 text-danger">
//                   {logs.filter(l => l.result === 'fail').length}
//                 </h4>
//                 <small className="text-muted">Failed</small>
//               </Card.Body>
//             </Card>
//           </Col>
//           <Col md={3}>
//             <Card className="border-0 bg-light">
//               <Card.Body className="text-center">
//                 <h4 className="mb-1 text-info">
//                   {logs.filter(l => l.action.includes('login')).length}
//                 </h4>
//                 <small className="text-muted">Login Events</small>
//               </Card.Body>
//             </Card>
//           </Col>
//           <Col md={3}>
//             <Card className="border-0 bg-light">
//               <Card.Body className="text-center">
//                 <h4 className="mb-1 text-warning">
//                   {logs.filter(l => l.action.includes('admin')).length}
//                 </h4>
//                 <small className="text-muted">Admin Actions</small>
//               </Card.Body>
//             </Card>
//           </Col>
//         </Row>
//       )}
//     </Container>
//   );
// };

// export default AdminLogs;


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
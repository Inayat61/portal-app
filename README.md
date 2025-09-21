# Web Portal with Authentication and RBAC

A complete web portal implementation with authentication, role-based access control, and audit logging built with Node.js, React, and MySQL.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [API Documentation](#api-documentation)
- [Frontend Structure](#frontend-structure)
- [Backend Structure](#backend-structure)
- [Database Schema](#database-schema)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [Improvements](#improvements)

## Overview

This portal implements a multi-user project management system with:
- **Authentication**: Secure login/logout with JWT tokens
- **Role-Based Access Control**: Admin and User roles with different permissions
- **Audit Logging**: Complete audit trail of all user actions
- **Docker Deployment**: Containerized frontend, backend, and database

## Features

### Authentication & Security
- Email/password authentication with bcrypt hashing (12 rounds)
- JWT token-based session management (24-hour expiration)
- Account blocking/unblocking functionality
- Rate limiting (100 requests/15min, 5 login attempts/15min)
- Security headers and CORS protection

### Role-Based Access Control
- **User Role**: 
  - Create, view, edit, delete their own projects and tasks
  - View their own audit logs
  - Cannot access other users' data
- **Admin Role**: 
  - All user capabilities
  - View all users and their data
  - Block/unblock user accounts
  - View all audit logs with filtering
  - Access system statistics

### Core Functionality
- **Projects Management**: CRUD operations with task tracking
- **Task Management**: Full lifecycle management (new → in_progress → done)
- **Admin Dashboard**: User management, system statistics, activity monitoring
- **Audit Logging**: Comprehensive logging with IP tracking and timestamps

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React)       │◄──►│  (Node.js)      │◄──►│    (MySQL)      │
│   Port: 3001    │    │   Port: 3000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React 18, React Router, React Query, Bootstrap 5, Axios
- **Backend**: Node.js, Express.js, JWT, bcrypt, MySQL2
- **Database**: MySQL 8.0
- **Deployment**: Docker, Docker Compose, Nginx

## Prerequisites

- Docker Desktop 4.0+
- Docker Compose 2.0+
- 4GB+ RAM available for Docker
- Ports 3000, 3001, 3306, 8080 available
- All Technology installed

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Inayat61/portal-app.git
cd portal-app

# 2. Make startup script executable
chmod +x quick-start.sh

# 3. Run the startup script
./quick-start.sh
```

The script will:
- Create environment configuration
- Build all Docker containers
- Initialize the database with tables
- Seed demo data
- Start all services

### Option 2: Docker Compose

```bash
# 1. Make the env file
.env

# 2. Start all services
docker-compose up -d

# 3. Initialize database
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

### Access URLs

After successful startup:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000  
- **Database Admin**: http://localhost:8080

### Demo Accounts

| Role  | Email               | Password | Capabilities           |
|-------|---------------------|----------|------------------------|
| Admin | admin@portal.com    | admin123 | Full system access     |
| User  | user@portal.com     | user123  | Own projects/tasks     |
| User  | user2@portal.com    | user456  | Own projects/tasks     |

## Manual Setup

### Backend Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
nano .env  # Edit database credentials

# 3. Start MySQL database
# Using Docker: docker-compose up -d db
# Or use local MySQL instance

# 4. Run migrations
npm run migrate

# 5. Seed demo data
npm run seed

# 6. Start development server
npm run dev
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@portal.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@portal.com",
    "role": "admin",
    "status": "active"
  }
}
```

**Audit Log**: `login.success` or `login.fail`

#### POST /api/auth/logout
Logout current user.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/auth/verify
Verify token validity.

**Headers:** `Authorization: Bearer <token>`

### Project Endpoints

#### GET /api/projects
List user's projects (or all for admin).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "E-commerce Platform",
      "description": "Building a modern e-commerce solution",
      "owner_id": 2,
      "created_at": "2023-09-21T10:00:00.000Z",
      "task_count": 4,
      "completed_tasks": 1
    }
  ]
}
```

#### POST /api/projects
Create new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description"
}
```

**Audit Log**: `project.create`

#### GET /api/projects/:id
Get specific project details.

**Audit Log**: `project.view`

#### GET /api/projects/:id/tasks
Get tasks for a project.

#### POST /api/projects/:id/tasks
Create new task.

**Request:**
```json
{
  "title": "Implement authentication",
  "description": "Add JWT-based authentication",
  "status": "new"
}
```

**Audit Log**: `task.create`

#### GET /api/projects/:projectId/tasks/:taskId
Get specific task details.

**Audit Log**: `task.view`

### Admin Endpoints (Admin Role Required)

#### GET /api/admin/users
List all users with pagination and search.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for email/role

**Audit Log**: `admin.users.view`

#### PUT /api/admin/users/:userId/block
Block a user account.

**Audit Log**: `admin.user.block`

#### PUT /api/admin/users/:userId/unblock
Unblock a user account.

**Audit Log**: `admin.user.unblock`

#### GET /api/admin/logs
Get audit logs.

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "ts": "2023-09-21T10:00:00.000Z",
      "actor_user_id": 1,
      "action": "login.success",
      "entity_type": "user",
      "entity_id": 1,
      "result": "success",
      "ip": "127.0.0.1",
      "actor_email": "admin@portal.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Audit Log**: `admin.logs.view`

#### GET /api/admin/stats
Get system statistics.

## Frontend Structure

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── index.js               # React entry point
│   ├── App.js                 # Main app component
│   ├── App.css               # Global styles
│   ├── components/
│   │   ├── Navigation.js      # Top navigation bar
│   │   ├── Login.js          # Login form component
│   │   ├── Projects.js       # Projects listing
│   │   ├── ProjectDetail.js  # Project details with tasks
│   │   └── admin/
│   │       ├── AdminDashboard.js  # Admin overview
│   │       ├── AdminUsers.js      # User management
│   │       └── AdminLogs.js       # Audit logs viewer
│   ├── contexts/
│   │   └── AuthContext.js     # Authentication state
│   └── services/
│       └── api.js            # API communication
├── package.json              # Dependencies
├── Dockerfile               # Frontend container
└── nginx.conf              # Nginx configuration
```

### Key Frontend Components

#### AuthContext
Manages global authentication state:
- User login/logout
- Token storage in cookies
- Authentication status
- Role-based permissions

#### Navigation
Top navigation bar that:
- Shows different menus based on user role
- Provides admin menu for admin users
- Handles logout functionality

#### Admin Components
- **AdminDashboard**: System overview with statistics
- **AdminUsers**: User management with block/unblock
- **AdminLogs**: Audit log viewer with filtering

## Backend Structure

```
portal-app/
├── server.js                 # Express server entry point
├── package.json             # Dependencies and scripts
├── Dockerfile              # Backend container
├── config/
│   └── database.js         # MySQL connection configuration
├── middleware/
│   ├── auth.js            # JWT authentication & RBAC
│   └── audit.js           # Audit logging middleware
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── projects.js       # Projects & tasks CRUD
│   └── admin.js          # Admin-only endpoints
└── scripts/
    ├── db-setup.js       # Database migrations
    └── seed.js           # Initial data seeding
```

### Key Backend Components

#### Authentication Middleware (`middleware/auth.js`)
- **authenticateToken**: Verifies JWT tokens
- **requireAdmin**: Ensures admin role
- **requireOwnerOrAdmin**: Resource-based access control

#### Audit Middleware (`middleware/audit.js`)
- Captures all required audit events
- Records IP addresses and timestamps
- Stores structured audit data

#### Route Handlers
- **auth.js**: Login, logout, token verification
- **projects.js**: CRUD operations with audit logging
- **admin.js**: User management and audit log viewing

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('new', 'in_progress', 'done') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  result ENUM('success', 'fail') DEFAULT 'success',
  ip VARCHAR(45),
  user_agent TEXT,
  details JSON
);
```

### Audit Events Captured

| Event | When | Entity Type | Description |
|-------|------|-------------|-------------|
| `login.success` | User logs in successfully | user | Successful authentication |
| `login.fail` | Login attempt fails | user | Failed authentication |
| `project.view` | User views project details | project | Project access |
| `task.view` | User views task details | task | Task access |
| `admin.user.block` | Admin blocks user | user | User account blocked |
| `admin.user.unblock` | Admin unblocks user | user | User account unblocked |
| `admin.users.view` | Admin views user list | admin_view | Admin accessed user management |
| `admin.logs.view` | Admin views audit logs | admin_view | Admin accessed audit logs |

## Security Features

### Password Security
- bcrypt hashing with 12 rounds
- Password complexity validation
- Secure password storage

### JWT Security
- 24-hour token expiration
- Secure token generation
- Token verification on each request
- Automatic logout on token expiry

### API Security
- Rate limiting per IP address
- CORS configuration
- Security headers (Helmet.js)
- Input validation and sanitization
- SQL injection prevention

### Audit Security
- Immutable audit logs
- IP address tracking
- User agent logging
- Detailed action tracking

## Troubleshooting

### Common Issues

#### Backend Container Unhealthy
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

#### Database Connection Issues
```bash
# Check database status
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
```

#### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Port Conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "3002:3000"  # Change 3000 to 3002
  - "3003:80"    # Change 3001 to 3003
```

### Permission Issues (Linux/WSL)
```bash
# Fix file permissions
chmod +x simple-start.sh
sudo chown -R $USER:$USER .
```

## Management Commands

```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v

# Restart specific service
docker-compose restart [service-name]

# Rebuild specific service
docker-compose up -d --build [service-name]

# Execute command in container
docker-compose exec backend npm run seed
```

## Improvements

Here are 7 key improvements to extend and harden the system:

### 1. Enhanced Security
- **Two-Factor Authentication (2FA)**: Implement TOTP-based 2FA for admin accounts
- **Password Policies**: Enforce password complexity, expiration, and history
- **Session Management**: Add session timeout, concurrent session limits
- **API Security**: Implement OAuth 2.0, API key management, advanced rate limiting
- **Security Scanning**: Automated vulnerability scanning in CI/CD pipeline

### 2. Advanced Monitoring & Alerting
- **Real-time Alerting**: Alert on suspicious activities (brute force, privilege escalation)
- **Log Aggregation**: Centralized logging with ELK stack (Elasticsearch, Logstash, Kibana)
- **Performance Monitoring**: Application performance monitoring with metrics collection
- **Health Dashboards**: Real-time system health and performance dashboards
- **Automated Incident Response**: Automated responses to security threats

### 3. Scalability & Performance
- **Database Optimization**: Query optimization, indexing strategy, connection pooling
- **Caching Strategy**: Redis for session storage, query caching, and rate limiting
- **Load Balancing**: Horizontal scaling with load balancers and auto-scaling
- **CDN Integration**: Static asset delivery via CDN for global performance
- **Microservices Architecture**: Split into authentication, project management, and admin services

### 4. Enhanced User Experience
- **Real-time Features**: WebSocket integration for live updates and notifications
- **Advanced Search**: Full-text search with filtering and sorting capabilities
- **File Management**: File upload/download for project documentation and attachments
- **Mobile Responsiveness**: Enhanced mobile experience with progressive web app features
- **Internationalization**: Multi-language support for global users

### 5. Advanced Features
- **Team Collaboration**: Multi-user project collaboration with granular permissions
- **Workflow Management**: Approval workflows, automated task assignments
- **Time Tracking**: Built-in time tracking and reporting for projects and tasks
- **Integration Ecosystem**: REST APIs, webhooks, and third-party integrations
- **Advanced Reporting**: Custom reports, analytics, and business intelligence

### 6. Data Management & Compliance
- **Data Backup**: Automated database backups with point-in-time recovery
- **Data Encryption**: Encryption at rest and in transit for sensitive data
- **GDPR Compliance**: Data privacy features, user data export/deletion
- **Audit Compliance**: Enhanced audit trails for regulatory compliance
- **Data Retention**: Automated data archival and cleanup policies

### 7. DevOps & Quality Assurance
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Infrastructure as Code**: Terraform/CloudFormation for reproducible infrastructure
- **Container Orchestration**: Kubernetes deployment for production scalability
- **Automated Testing**: Comprehensive unit, integration, and end-to-end test suites
- **Quality Gates**: Code quality checks, security scanning, and performance testing

---

**Built for secure, scalable project management with comprehensive audit logging and role-based access control.**
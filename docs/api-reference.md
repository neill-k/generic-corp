# API Reference

Complete API documentation for Generic Corp.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token:

```http
Authorization: Bearer <your-jwt-token>
```

### Get Authentication Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "organizationId": "org-id"
  }
}
```

## REST API Endpoints

### Organizations

#### Get Organization
```http
GET /api/organizations/:id
```

#### Update Organization
```http
PATCH /api/organizations/:id
Content-Type: application/json

{
  "name": "Updated Org Name"
}
```

### Employees (Agents)

#### List Employees
```http
GET /api/employees
```

Query parameters:
- `organizationId` - Filter by organization
- `departmentId` - Filter by department
- `role` - Filter by role

#### Create Employee
```http
POST /api/employees
Content-Type: application/json

{
  "name": "Agent Smith",
  "email": "agent@example.com",
  "role": "developer",
  "departmentId": "dept-id"
}
```

#### Get Employee
```http
GET /api/employees/:id
```

#### Update Employee
```http
PATCH /api/employees/:id
```

#### Delete Employee
```http
DELETE /api/employees/:id
```

### Tasks

#### List Tasks
```http
GET /api/tasks
```

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Implement new feature",
  "description": "Details...",
  "assigneeId": "employee-id",
  "priority": "high",
  "status": "todo"
}
```

#### Get Task
```http
GET /api/tasks/:id
```

#### Update Task
```http
PATCH /api/tasks/:id
```

#### Delete Task
```http
DELETE /api/tasks/:id
```

### Departments

#### List Departments
```http
GET /api/departments
```

#### Create Department
```http
POST /api/departments
```

### Messages

#### List Messages
```http
GET /api/messages?channelId=:channelId
```

#### Send Message
```http
POST /api/messages
Content-Type: application/json

{
  "channelId": "channel-id",
  "content": "Message text",
  "senderId": "employee-id"
}
```

## WebSocket API

Connect to the WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Subscribe to Organization Updates
```javascript
socket.emit('subscribe:organization', { organizationId });

socket.on('organization:update', (data) => {
  console.log('Organization updated:', data);
});
```

#### Subscribe to Task Updates
```javascript
socket.emit('subscribe:tasks', { organizationId });

socket.on('task:created', (task) => {
  console.log('New task:', task);
});

socket.on('task:updated', (task) => {
  console.log('Task updated:', task);
});

socket.on('task:completed', (task) => {
  console.log('Task completed:', task);
});
```

#### Send Chat Message
```javascript
socket.emit('message:send', {
  channelId: 'channel-id',
  content: 'Message text'
});

socket.on('message:received', (message) => {
  console.log('New message:', message);
});
```

#### Agent Status Updates
```javascript
socket.on('agent:status', (data) => {
  console.log('Agent status:', data);
  // { agentId, status: 'active' | 'idle' | 'busy' }
});
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid request data
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

API endpoints are rate limited:

- **Standard endpoints**: 100 requests per minute
- **Search endpoints**: 30 requests per minute
- **Authentication endpoints**: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Pagination

List endpoints support pagination:

```http
GET /api/tasks?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Next Steps

- [Plugin Development](plugin-development.md) - Extend the API with plugins
- [Architecture](architecture.md) - Understand the system design

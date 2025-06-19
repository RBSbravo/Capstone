# Ticketing and Task Management System - Backend

A robust backend system for managing tickets, tasks, and user authentication with real-time notifications.

## Features

### Authentication System ✅

- User registration and login
- JWT-based authentication
- Password reset functionality
  - Forgot password flow with secure token generation
  - Email-based reset token with 1-hour expiry
  - Password strength validation
  - Token verification endpoint
  - Secure password update with token validation
- Role-based access control (Admin, Department-Head, Employee)
- User approval system for new accounts

### Ticket Management ✅

- Create, read, update, and delete tickets
- Ticket status tracking (open, in_progress, resolved, closed)
- Priority levels (low, medium, high, urgent)
- Category management (bug, feature, support, other)
- File attachments
- Comments and updates
- Department-specific ticket views
- Advanced filtering and search
- Pagination support

### Task Management ✅

- Task creation and assignment
- Status tracking (pending, in_progress, completed)
- Due date management
- Priority levels
- Task dependencies
- Progress tracking
- Task comments
- File attachments

### Department Management ✅

- Department creation and management
- User assignment to departments
- Department-specific views
- Department head oversight
- Department analytics

### Real-time Features ✅

- WebSocket integration for real-time updates
- Live notifications
- Real-time ticket status updates
- Instant messaging between users
- Notification types:
  - Task assigned
  - Task updated
  - Comment added
  - Task completed
  - Ticket status changed
  - New ticket

### Analytics and Reporting ✅

- Ticket statistics
- Performance metrics
- Department analytics
- User activity tracking
- Custom date range filtering
- Priority and status distribution

### File Management ✅

- File upload and download
- File attachment to tickets and tasks
- File type validation
- Size limits (10MB)
- Secure file storage
- File metadata tracking

## Technical Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **Testing**: Jest
- **Validation**: Express Validator
- **File Handling**: Multer

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── tests/          # Test files
│   └── utils/          # Utility functions
├── .env               # Environment variables
├── package.json       # Project dependencies
└── README.md         # Project documentation
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  - Requires username, email, password
  - Department ID required for department_head and employee roles
  - Admin users are automatically approved
  - Other roles start with 'pending' status
- `POST /api/auth/login` - User login
  - Requires email and password
  - Returns JWT token and user data
  - Blocks login for unapproved accounts
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/forgot-password` - Request password reset
  - Requires email
  - Generates secure reset token
  - Returns token (in test/development) or sends email (in production)
- `POST /api/auth/reset-password` - Reset password
  - Requires reset token and new password
  - Validates token expiry
  - Updates password and clears reset token
- `GET /api/auth/verify-reset-token/:token` - Verify reset token
  - Validates if reset token is still valid
  - Returns success or error message

### Tickets

- `GET /api/tickets` - List tickets
  - Supports filtering by status, priority, department, assignee
  - Includes pagination
  - Role-based access control
- `POST /api/tickets` - Create ticket
  - Validates required fields
  - Handles file attachments
  - Creates notifications
- `GET /api/tickets/:id` - Get ticket details
  - Includes comments and attachments
  - Includes creator and assignee details
- `PUT /api/tickets/:id` - Update ticket
  - Validates update permissions
  - Handles status changes
  - Creates notifications
- `DELETE /api/tickets/:id` - Delete ticket
  - Admin only
  - Cascades to related records

### Tasks

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Departments

- `GET /api/departments` - List departments
- `POST /api/departments` - Create department
- `GET /api/departments/:id` - Get department details
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Notifications

- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/related` - Get notifications related to user
- `GET /api/notifications/unread/count` - Get unread notification count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

### Files

- `POST /api/files/ticket/:ticketId` - Upload file to ticket
- `GET /api/files/ticket/:ticketId` - List files for ticket
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Delete file

## Testing

The project includes comprehensive test coverage for:

- Authentication flows
- Ticket management
- Task management
- Department management
- Real-time features
- Analytics
- File management
- Notification system

Run tests with:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/tests/auth.test.js

# Run tests with coverage
npm run test:coverage
```

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required environment variables:
   ```
   NODE_ENV=development
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=ticketing_system
   JWT_SECRET=your_jwt_secret
   ```
4. Create the database:
   ```sql
   CREATE DATABASE ticketing_system;
   ```
5. Run migrations:
   ```bash
   npm run migrate
   ```
6. Start the server:
   ```bash
   npm start
   ```

## Development

- Use `npm run dev` for development with hot reload
- Follow the established code style and conventions
- Write tests for new features
- Update documentation as needed

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Secure password reset flow
  - Time-limited reset tokens
  - One-time use tokens
  - Secure token generation
  - Token expiry validation
  - Password strength requirements

## Current Progress

### Completed Features ✅

- User authentication system
- Password reset functionality
- Basic ticket management
- Basic task management
- Department management
- Real-time notifications
- Test coverage for core features
- File management system
- Analytics and reporting
- Role-based access control
- WebSocket integration
- Comment system
- Advanced search and filtering

### In Progress 🔄

- Enhanced analytics
- Advanced search functionality
- File attachment system
- Email notifications

### Planned Features 📋

- Advanced reporting
- User activity logs
- API documentation
- Performance optimizations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

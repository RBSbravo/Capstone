# Ticketing and Task Management System

A comprehensive ticketing and task management system with role-based access across web, mobile, and desktop platforms.

## Project Structure

```
├── backend/                 # Node.js + Express.js backend
├── web-app/                # React + Vite web application
├── mobile-app/            # React Native mobile application
├── desktop-app/           # Electron desktop application
└── docs/                  # Project documentation
```

## Features

### Web Application (Department Heads)

- Department dashboard
- Ticket/task management
- Employee oversight
- Department-specific analytics

### Mobile Application (Department Employees)

- Personal dashboard
- Task management
- Progress tracking
- Real-time updates

### Desktop Application (Admins)

- System-wide overview
- User role management
- Performance reporting
- Advanced analytics

## Technology Stack

### Backend

- Node.js
- Express.js
- MySQL
- JWT Authentication
- WebSocket for real-time updates

### Frontend

- Web: React + Vite
- Mobile: React Native
- Desktop: Electron
- State Management: Redux Toolkit
- UI Framework: Material-UI / React Native Paper

## User Roles and Permissions

### Admin

- Full system access
- User management
- Department management
- Ticket deletion privileges
- System-wide analytics

### Department Head

- Department dashboard access
- Ticket management within their department
- Employee oversight
- Department-specific analytics
- Cannot delete tickets

### Employee

- Personal dashboard
- Create and update tickets
- Track task progress
- View department tickets
- Cannot delete tickets

## Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install web app dependencies
   cd ../web-app
   npm install

   # Install mobile app dependencies
   cd ../mobile-app
   npm install

   # Install desktop app dependencies
   cd ../desktop-app
   npm install
   ```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in each directory
   - Configure database and API credentials

4. Start development servers:

   ```bash
   # Start backend
   cd backend
   npm run dev

   # Start web app
   cd ../web-app
   npm run dev

   # Start desktop app
   cd ../desktop-app
   npm run dev

   # Start mobile app
   cd ../mobile-app
   npm run android # or npm run ios
   ```

## Development Workflow

1. Create feature branches from `develop`
2. Follow conventional commits
3. Submit PRs for review
4. Merge to `develop` after approval
5. Regular releases to `main`

## Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

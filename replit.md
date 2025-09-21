# Smart Tourist Safety Monitoring & Incident Response System

## Overview

The Smart Tourist Safety Monitoring & Incident Response System is a comprehensive platform designed to enhance tourist safety through real-time monitoring, incident response, and digital identity management. The system serves two primary user types: tourists who need safety monitoring and emergency response capabilities, and administrators who monitor tourist activities and manage incidents through a centralized dashboard.

The platform provides blockchain-based digital identity verification, geo-fencing alerts, real-time location tracking, emergency response features, and comprehensive incident management. It aims to create a safer travel experience while maintaining data privacy and enabling quick emergency response.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client application is built using **React** with **TypeScript** and follows a modern component-based architecture. The UI framework leverages **shadcn/ui** components built on top of **Radix UI** primitives, providing a consistent and accessible design system. The styling is implemented using **Tailwind CSS** with a dark theme configuration optimized for safety monitoring interfaces.

**Routing**: The application uses **wouter** for client-side routing, providing a lightweight alternative to React Router. The main routes include login, tourist registration, tourist dashboard, and admin dashboard.

**State Management**: The application employs **TanStack Query** (React Query) for server state management, providing caching, synchronization, and background updates. Local state is managed through React hooks and context where needed.

**Real-time Communication**: WebSocket integration enables real-time updates for location tracking, emergency alerts, and incident notifications between tourists and administrators.

### Backend Architecture
The server is built using **Express.js** with **TypeScript** in an ESM (ES Modules) configuration. The architecture follows a RESTful API design pattern with WebSocket support for real-time features.

**API Structure**: Routes are organized in `/api` endpoints handling authentication, tourist management, alerts, emergency incidents, and statistics. The server includes middleware for request logging, error handling, and JSON parsing.

**Real-time Features**: WebSocket server implementation using the `ws` library provides live updates for location tracking, emergency alerts, and dashboard notifications.

**Development Setup**: The application uses **Vite** for frontend development with hot module replacement, and **tsx** for TypeScript execution in development mode.

### Data Storage Solutions
The system uses **Drizzle ORM** with **PostgreSQL** as the primary database solution. The database schema is defined in TypeScript with strong typing throughout the application.

**Database Tables**:
- `users`: Core user authentication and role management
- `tourists`: Extended tourist profiles with KYC information and safety scores
- `alerts`: Geo-fencing and safety alerts with severity levels
- `emergency_incidents`: Emergency situations and incident tracking

**Storage Interface**: A flexible storage interface (`IStorage`) allows for different storage implementations. Currently includes an in-memory storage class for development and testing.

### Authentication and Authorization
**Authentication Strategy**: The system implements Google OAuth integration for user authentication, with fallback admin credentials for administrative access. User sessions are managed server-side with role-based access control.

**User Roles**: Two primary roles are supported - 'tourist' for general users and 'admin' for administrative dashboard access. Role-based routing ensures users only access appropriate interfaces.

**Security**: KYC (Know Your Customer) verification is required for tourist registration, with document upload capabilities for identity verification.

### External Dependencies

**Database**: PostgreSQL database with Neon Database serverless integration for scalable cloud hosting.

**Authentication**: Google OAuth 2.0 for secure user authentication and identity verification.

**UI Components**: Extensive use of Radix UI primitives for accessible, unstyled components that are customized with Tailwind CSS.

**Development Tools**: 
- Vite for frontend build tooling and development server
- Drizzle Kit for database migrations and schema management
- ESBuild for production server bundling

**Real-time Communication**: Native WebSocket implementation for live updates without external dependencies like Socket.io.

**Form Handling**: React Hook Form with Zod schema validation for type-safe form management and validation.

**Date Handling**: date-fns library for date manipulation and formatting throughout the application.

**File Upload**: Custom file upload component with drag-and-drop support for document verification.
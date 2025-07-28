# DropDaily - AI-Powered Content Discovery Platform

## Overview

DropDaily is an AI-powered content discovery platform that delivers personalized daily content feeds to busy professionals. The application uses AI embeddings and vector similarity matching to curate relevant content based on user preferences, delivering a "Daily Drop" of 1-3 carefully selected items per day.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for fast development and building
- **Styling**: Tailwind CSS with a comprehensive shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Custom context-based authentication system with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Vector Search**: pgvector extension for content similarity matching using AI embeddings
- **Authentication**: bcrypt for password hashing with session-based auth
- **API Design**: RESTful API endpoints with comprehensive error handling

### AI Integration
- **Embeddings**: OpenAI text-embedding-3-small model for content vectorization
- **Content Classification**: GPT-4 (gpt-4o) for intelligent topic classification
- **Matching Algorithm**: Vector similarity using cosine distance for personalized content recommendations

## Key Components

### User Management
- User registration and authentication with role-based access (user/admin)
- Onboarding flow with topic preference selection
- Profile management with preference weights

### Content System
- **Content Ingestion**: Automated ingestion from YouTube (initially) with plans for expansion
- **User Submissions**: Community-driven content submission with moderation workflow
- **Topic Classification**: AI-powered classification into predefined professional development topics
- **Vector Storage**: Content embeddings stored for similarity matching

### Daily Drop Algorithm
- Personalized content matching based on user topic preferences and vector similarity
- Fallback system ensuring users always receive quality content
- View tracking and bookmark functionality for user engagement

### Admin Dashboard
- Content moderation interface for user submissions
- System statistics and analytics
- Automated content ingestion management

## Data Flow

1. **Content Ingestion**:
   - External content sources (YouTube) → Content metadata extraction → AI topic classification → Vector embedding generation → Database storage

2. **User Onboarding**:
   - Registration → Topic preference selection → Profile vector generation → Onboarded status

3. **Daily Drop Generation**:
   - User preferences retrieval → Vector similarity matching → Content ranking → Daily drop creation → Delivery to user feed

4. **User Interaction**:
   - Content viewing → Engagement tracking → Bookmark management → Feedback loop for improved recommendations

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL with pgvector support
- **OpenAI API**: Text embeddings and GPT-4 for content classification
- **YouTube API**: Content ingestion (initial source)

### Development Tools
- **Vite**: Build tool and development server
- **Drizzle Kit**: Database schema management and migrations
- **TanStack Query**: Server state management
- **Replit**: Development environment integration

### UI Components
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first styling

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon serverless PostgreSQL for consistent dev/prod environment
- **Environment Variables**: Secure API key management for OpenAI and database connections

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations ensure schema consistency
- **Static Serving**: Express serves built frontend in production mode

### Architecture Decisions

1. **Monolithic Structure**: Single repository with shared types between client and server for rapid development and type safety
2. **Serverless Database**: Neon chosen for auto-scaling, built-in pgvector support, and minimal ops overhead
3. **Vector Embeddings**: OpenAI embeddings provide high-quality semantic understanding for content matching
4. **Component Library**: shadcn/ui selected for customizable, accessible components with consistent design system
5. **Type Safety**: Full TypeScript implementation with Drizzle-Zod integration for runtime validation
6. **Session Management**: Simple localStorage-based auth suitable for MVP, with plans for more robust session handling

The architecture prioritizes rapid development while maintaining scalability for future growth, with clear separation between AI-powered content processing and user-facing features.
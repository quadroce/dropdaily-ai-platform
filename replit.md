# DropDaily - AI-Powered Content Discovery Platform

## Overview
DropDaily is an AI-powered content discovery platform designed to deliver personalized daily content feeds to busy professionals. It leverages AI embeddings and vector similarity matching to curate relevant content based on user preferences, providing a "Daily Drop" of 1-3 carefully selected items per day. The project aims to become a leading platform for personalized content consumption, ensuring users receive highly relevant and engaging information without information overload.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for development and building.
- **Styling**: Tailwind CSS with shadcn/ui for consistent design.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Authentication**: Custom context-based authentication system with localStorage persistence.
- **UI/UX Decisions**: ContentCard redesign with square images on the right, improved layout, and source attribution displaying actual names. Unified ingestion buttons and protection for saved articles.

### Backend Architecture
- **Runtime**: Node.js with Express.js server.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations, hosted on Neon serverless PostgreSQL.
- **Vector Search**: pgvector extension for content similarity matching using AI embeddings.
- **Authentication**: bcrypt for password hashing with session-based authentication. Secure token-based password recovery.
- **API Design**: RESTful API endpoints with comprehensive error handling.
- **Monolithic Structure**: Single repository with shared types between client and server for rapid development and type safety.

### AI Integration
- **Embeddings**: OpenAI text-embedding-3-small model for content vectorization with a fallback system.
- **Content Classification**: GPT-4 (gpt-4o) for intelligent topic classification with rule-based fallback.
- **Matching Algorithm**: Vector similarity using cosine distance for personalized content recommendations, ensuring 3 daily drops per user with high match scores.
- **Fallback System**: Rule-based content classification when AI services are unavailable or quota is exceeded.

### Content Ingestion & Management
- **Multi-Source Ingestion**: Automated ingestion from RSS feeds (25+) and social media platforms (X, YouTube, Reddit).
- **Content Processing**: Real-time parsing, deduplication, and AI classification of articles.
- **Database Optimization**: Automated cleanup system with a 90-day retention policy and intelligent storage management. Saved articles are permanently protected.
- **Admin Interfaces**: Comprehensive management available at `/rss-admin`, `/social-admin`, and `/database-admin`.

### Key Components
- **User Management**: Registration, authentication, role-based access, onboarding with topic preference selection, and profile management.
- **Content System**: Automated ingestion, AI-powered topic classification, vector storage, and an operational daily drop algorithm for personalized content delivery.
- **Admin Dashboard System**: Content moderation, RSS/social media management, database optimization, and system analytics.

## External Dependencies
### Core Services
- **Neon Database**: Serverless PostgreSQL with pgvector support.
- **OpenAI API**: Used for text embeddings and GPT-4 based content classification.
- **YouTube API**: Initial content ingestion source.

### Development Tools
- **Vite**: Build tool and development server.
- **Drizzle Kit**: Database schema management and migrations.
- **TanStack Query**: Server state management.

### UI Components
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built component library.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first styling.
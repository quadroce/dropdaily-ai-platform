# DropDaily - AI-Powered Content Discovery Platform

## Overview

DropDaily is an AI-powered content discovery platform that delivers personalized daily content feeds to busy professionals. The application uses AI embeddings and vector similarity matching to curate relevant content based on user preferences, delivering a "Daily Drop" of 1-3 carefully selected items per day. The project's vision is to become the go-to platform for personalized content discovery, enhancing productivity and knowledge acquisition for professionals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **Styling**: Tailwind CSS with shadcn/ui component library.
- **State Management**: TanStack Query for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Authentication**: Custom context-based authentication system with localStorage persistence.

### Backend Architecture
- **Runtime**: Node.js with Express.js server.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations, utilizing Neon serverless PostgreSQL.
- **Vector Search**: pgvector extension for content similarity matching using AI embeddings.
- **Authentication**: bcrypt for password hashing with session-based auth.
- **API Design**: RESTful API endpoints with comprehensive error handling.
- **Deployment Reliability**: Implemented comprehensive database initialization sequence, migration integration, and graceful error handling to prevent deployment failures. Health checks respond instantly (<0.003s) and server starts immediately, responding to health checks while initialization runs in background.

### AI Integration
- **Embeddings**: OpenAI text-embedding-3-small model for content vectorization with a fallback system.
- **Content Classification**: GPT-4 (gpt-4o) for intelligent topic classification with rule-based fallback.
- **Matching Algorithm**: Vector similarity using cosine distance for personalized content recommendations.

### Content Ingestion & Management
- **Multi-Source Ingestion**: Automated ingestion from 25+ RSS feeds plus social media platforms (X, YouTube, Reddit).
- **Content Processing**: Real-time parsing, deduplication, and AI classification of articles.
- **Database Optimization**: Automated cleanup system with 90-day retention policy and intelligent storage management.
- **Admin Interfaces**: Comprehensive management at `/rss-admin`, `/social-admin`, and `/database-admin`.

### UI/UX Decisions
- **Content Card Redesign**: Square images positioned on the right side, improved layout.
- **Source Attribution**: Displays actual source names instead of "RSS" by extracting feed names and mapping domains.
- **Unified Ingestion Button**: Single "Complete Ingestion" button for RSS+Social Media at `/rss-admin`.
- **Topic Categorization**: Enhanced with 9 semantic categories and detailed options, automatically grouped for better user experience.
- **SEO Optimization**: Landing page enhanced with comprehensive meta tags, Open Graph data, Twitter Cards, and JSON-LD structured data.

### System Design Choices
- **Monolithic Structure**: Single repository with shared types between client and server for rapid development and type safety.
- **Serverless Database**: Neon chosen for auto-scaling, built-in pgvector support, and minimal operational overhead.
- **Type Safety**: Full TypeScript implementation with Drizzle-Zod integration for runtime validation.
- **Session Management**: Simple localStorage-based authentication for MVP.

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL with pgvector support.
- **OpenAI API**: Text embeddings and GPT-4 for content classification.
- **YouTube API**: Content ingestion.

### Development Tools
- **Vite**: Build tool and development server.
- **Drizzle Kit**: Database schema management and migrations.
- **TanStack Query**: Server state management.

### UI Components
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built component library.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first styling.
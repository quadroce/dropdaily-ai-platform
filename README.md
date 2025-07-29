# DropDaily - AI-Powered Content Discovery Platform

> 🤖 Get your daily dose of personalized tech content with AI-powered curation

DropDaily is an AI-powered content discovery platform that delivers personalized daily content feeds to busy professionals. The platform uses advanced AI embeddings and vector similarity matching to curate relevant content from multiple sources including RSS feeds, X (Twitter), YouTube, and Reddit.

## 🚀 Features

### Core Platform
- **AI-Powered Curation**: OpenAI embeddings for intelligent content matching
- **Daily Drops**: 1-3 carefully selected articles delivered daily
- **Multi-Source Ingestion**: RSS feeds + social media platforms
- **Personalized Recommendations**: Vector similarity matching based on user preferences

### Content Sources
- **RSS Feeds**: 25+ premium tech sources (TechCrunch, The Verge, Fast Company, Wired, etc.)
- **Social Media**: X (Twitter) tech influencers, YouTube channels, Reddit communities
- **User Submissions**: Community-driven content with moderation workflow

### Admin Features
- **RSS Admin Dashboard** (`/rss-admin`): Manage RSS feed ingestion and statistics
- **Social Media Dashboard** (`/social-admin`): Control multi-platform content ingestion
- **Content Moderation**: Review and approve user-submitted content
- **Analytics**: System statistics and ingestion metrics

## 🛠 Tech Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Drizzle ORM
- **Neon** serverless database
- **pgvector** for AI embeddings storage

### AI Integration
- **OpenAI API**: GPT-4 for content classification, text-embedding-3-small for vectors
- **Vector Search**: Cosine similarity for content recommendations
- **Fallback Systems**: Rule-based classification when AI quota exceeded

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   RSS Feeds     │    │  Social Media    │    │ User Submissions│
│   25+ Sources   │    │ X/YouTube/Reddit │    │   Community     │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      AI Processing       │
                    │  Classification + Vector │
                    │      Embeddings          │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    PostgreSQL + pgvector  │
                    │   Content + Embeddings   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Daily Drop Algorithm   │
                    │  Personalized Matching   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      User Dashboard      │
                    │   1-3 Daily Articles     │
                    └───────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dropdaily-ai-platform.git
   cd dropdaily-ai-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   DATABASE_URL=your_postgresql_url
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

## 📊 Usage

### For Users
1. **Register/Login** at the landing page
2. **Complete Onboarding** by selecting 3-5 topic preferences
3. **View Daily Drops** - get 1-3 personalized articles daily
4. **Submit Content** to contribute to the community

### For Admins
- **RSS Admin** (`/rss-admin`): Manage RSS feed ingestion
- **Social Media** (`/social-admin`): Control social platform ingestion  
- **Admin Dashboard** (`/admin`): System statistics and content moderation

## 🔧 API Endpoints

### Content Ingestion
- `POST /api/admin/rss/ingest` - Trigger RSS ingestion
- `POST /api/admin/ingest/social-media` - Ingest from all social platforms
- `POST /api/admin/ingest/twitter` - Twitter-specific ingestion
- `POST /api/admin/ingest/youtube` - YouTube-specific ingestion
- `POST /api/admin/ingest/reddit` - Reddit-specific ingestion

### Daily Drops
- `GET /api/users/:userId/daily-drops` - Get user's daily content
- `POST /api/admin/rss/daily-drops` - Generate daily drops for all users

### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/:id/preferences` - Get user topic preferences

## 🌟 Key Features Implemented

### SEO Optimization
- Complete meta tags, Open Graph, and Twitter Cards
- JSON-LD structured data for search engines
- Optimized landing page content

### Multi-Platform Ingestion
- **RSS**: 25+ tech news sources with image extraction
- **Twitter/X**: Tech influencers and thought leaders
- **YouTube**: Tech channels and educational content  
- **Reddit**: Programming and tech communities

### AI-Powered Classification
- GPT-4 content classification into professional topics
- Vector embeddings for semantic content matching
- Fallback rule-based classification system

### Real-Time Dashboard
- Live ingestion statistics
- Content moderation workflow
- System health monitoring

## 📈 Stats (Current)
- **333+ Articles** classified and stored
- **25 RSS Sources** actively monitored
- **3 Social Platforms** integrated
- **Real AI Matching** delivering personalized content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and embedding models
- Neon for serverless PostgreSQL
- shadcn/ui for the component library
- All the RSS feeds and content sources that make this possible

---

**Built with ❤️ for busy tech professionals who want quality content without information overload.**
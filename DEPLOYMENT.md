# Deployment Guide - DropDaily

## Environment Setup

### Required Environment Variables

```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=dropdaily

# OpenAI API (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Application
NODE_ENV=production
PORT=5000
```

### Database Setup

1. **Create PostgreSQL database** with pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run migrations**:
   ```bash
   npm run db:push
   ```

3. **Initialize topics** (automatic on first run)

### Social Media API Keys (Optional)

For production social media ingestion, add these API keys:

```bash
# Twitter/X API
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# YouTube Data API
YOUTUBE_API_KEY=your-youtube-api-key

# Reddit API
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
```

## Deployment Options

### 1. Replit Deployment (Recommended)
- Click "Deploy" in Replit
- Configure environment variables in Secrets
- Use Neon database for automatic scaling

### 2. Railway/Render
```bash
# Build command
npm run build

# Start command
npm start
```

### 3. Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### 4. Traditional VPS
```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start npm --name "dropdaily" -- start
```

## Post-Deployment Checklist

1. **Verify database connection**: Check `/api/admin/stats`
2. **Test RSS ingestion**: Use `/rss-admin` dashboard
3. **Configure social media**: Set up APIs in `/social-admin`
4. **Create admin user**: Register first user gets admin role
5. **Set up monitoring**: Health checks on main endpoints

## Production Considerations

### Performance
- Database connection pooling configured
- Static asset caching via Express
- Vector search optimization with pgvector

### Security
- Environment variables for sensitive data
- Input validation with Zod schemas
- CORS configured for production domains

### Monitoring
- RSS ingestion logs
- OpenAI API usage tracking
- Database performance metrics
- User engagement analytics

## Troubleshooting

### Common Issues

1. **OpenAI quota exceeded**: Fallback classification system activated
2. **Database connection**: Check DATABASE_URL format
3. **RSS feeds failing**: Monitor `/rss-admin` for feed status
4. **Social media ingestion**: Verify API keys in environment

### Health Endpoints

- `/api/admin/stats` - System statistics
- `/api/admin/rss/stats` - RSS ingestion status
- Database connection automatically tested on startup

## Scaling

### Database
- Neon auto-scales PostgreSQL
- pgvector handles large embedding datasets
- Consider read replicas for high traffic

### Application
- Stateless design allows horizontal scaling
- Background jobs for content ingestion
- Separate worker processes for AI classification

### Content Processing
- Queue system for large ingestion batches
- Rate limiting for external APIs
- Caching for frequently accessed content
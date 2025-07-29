# Database Growth Management Strategy - DropDaily

## Problem
The content table grows continuously with RSS and social media ingestion, potentially leading to:
- Degraded query performance
- Increased storage costs
- Slower daily drop generation
- Database maintenance issues

## Current Status (July 29, 2025)
- **486 articles** currently in database (1.4MB)
- All articles from last 7 days (system is young)
- No content older than 90 days yet
- Growth rate: ~70 articles/day from current sources

## Implemented Solutions

### 1. Automated Content Cleanup Service
**File**: `server/services/content-cleanup.ts`

**Features**:
- **90-day retention policy**: Removes articles older than 90 days
- **Batch processing**: Deletes in chunks of 1000 to prevent timeouts
- **Cascade deletion**: Removes related topic classifications
- **Bookmark preservation**: Keeps user-bookmarked content (future feature)
- **Error handling**: Continues processing even if individual batches fail

**Configuration**:
```typescript
{
  retentionDays: 90,     // Keep content for 90 days
  batchSize: 1000,       // Delete in batches of 1000
  keepBookmarkedContent: true  // Preserve bookmarked articles
}
```

### 2. Storage Monitoring System
**Endpoint**: `GET /api/admin/content/storage-stats`

**Monitors**:
- Total article count and table size
- Article distribution by age (7/30/90 days, older)
- Automated recommendations based on thresholds:
  - Normal: < 10,000 articles
  - Cleanup recommended: 10,000-20,000 articles
  - Cleanup urgent: > 50,000 articles

### 3. Admin Interface
**Page**: `/database-admin`

**Capabilities**:
- Real-time storage statistics visualization
- Manual cleanup trigger with progress tracking
- Intelligent scheduled cleanup
- Storage usage graphs and recommendations
- Error reporting and batch processing status

### 4. Automated Scheduling
**File**: `server/scripts/setup-cleanup-cron.ts`

**Schedule**:
- **Daily cleanup**: 2:00 AM (production only)
- **Storage monitoring**: Every 6 hours
- **Alert system**: Warns when urgent cleanup needed

### 5. API Endpoints

```typescript
// Get storage statistics
GET /api/admin/content/storage-stats

// Manual cleanup trigger
POST /api/admin/content/cleanup

// Intelligent scheduled cleanup
POST /api/admin/content/schedule-cleanup
```

## Growth Projections & Thresholds

### Current Sources (486 articles in database)
- **25 RSS feeds**: ~50 articles/day
- **Social media**: ~20 articles/day (mock data ready)
- **User submissions**: ~5 articles/day (estimated)

**Total**: ~75 articles/day

### Projected Growth
- **1 month**: ~2,250 articles
- **3 months**: ~6,750 articles  
- **6 months**: ~13,500 articles
- **1 year**: ~27,000 articles

### Database Thresholds
- **Green (< 10K)**: No action needed
- **Yellow (10K-20K)**: Cleanup recommended
- **Orange (20K-50K)**: Regular cleanup needed
- **Red (> 50K)**: Urgent cleanup required

## Cleanup Strategy Logic

### Smart Cleanup Decision Tree
1. **Check total articles**:
   - < 10K: Skip cleanup
   - 10K-20K: Clean if >2K articles older than 90 days
   - > 20K: Always clean

2. **Preserve important content**:
   - User bookmarked articles
   - High engagement content (future)
   - Articles linked in active daily drops

3. **Batch processing**:
   - Process 1000 articles at a time
   - 100ms delay between batches
   - Continue on individual failures

## Performance Considerations

### Database Optimization
- **Indexes**: Created on `created_at` for efficient age-based queries
- **Cascade deletes**: Configured in schema for referential integrity
- **Connection pooling**: Neon handles automatically

### Query Optimization
- **Date filtering**: Uses indexed timestamp columns
- **Batch operations**: Prevents single large transactions
- **Progress tracking**: Provides user feedback during long operations

## Monitoring & Alerts

### Health Metrics
- Table size in MB/GB
- Article count by age buckets
- Cleanup success/failure rates
- Query performance metrics

### Alert Conditions
- Database size > 100MB
- Articles > 50,000
- Cleanup failures > 3 consecutive runs
- Query time > 2 seconds for daily drops

## Future Enhancements

### Planned Features
1. **Content archiving**: Move old articles to cold storage
2. **Intelligent retention**: Keep high-engagement content longer
3. **User preferences**: Allow users to set personal retention
4. **Analytics integration**: Track content lifecycle metrics

### Advanced Strategies
1. **Partitioning**: Split content table by date ranges
2. **Read replicas**: Separate read/write operations
3. **Caching layer**: Redis for frequently accessed content
4. **Content summarization**: Compress old articles to summaries

## Deployment Considerations

### Environment Variables
```env
# Optional: Override default cleanup settings
CLEANUP_RETENTION_DAYS=90
CLEANUP_BATCH_SIZE=1000
CLEANUP_SCHEDULE_ENABLED=true
```

### Production Setup
- Cron jobs automatically enabled in production
- Manual cleanup available in all environments
- Storage stats refresh every 30 seconds in admin UI

### Monitoring Setup
- Database size alerts in hosting platform
- Query performance monitoring
- Cleanup job success/failure logging

## Rollback Strategy

### If Issues Arise
1. **Disable cleanup**: Set retention to very high value
2. **Restore from backup**: Use database point-in-time recovery
3. **Manual intervention**: Query and delete specific content ranges
4. **Gradual rollout**: Test cleanup on smaller batches first

### Emergency Procedures
- Manual cleanup with smaller batch sizes
- Temporary retention increase during high-traffic periods
- Database connection monitoring during cleanup operations

This comprehensive strategy ensures DropDaily maintains optimal database performance while preserving user experience and system reliability as content volume scales.
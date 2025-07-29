/**
 * Temporary fallback for OpenAI when API is unavailable
 * This allows the system to continue ingesting content without AI classification
 */

export interface ContentClassification {
  topics: Array<{
    name: string;
    confidence: number;
  }>;
  summary: string;
}

const AVAILABLE_TOPICS = [
  'AI/ML', 'Product', 'Design', 'Engineering', 'Business', 
  'Marketing', 'Mobile Dev', 'DevOps', 'Security', 'Data Science', 
  'Startups', 'Leadership'
];

/**
 * Fallback embedding generation when OpenAI is unavailable
 */
export function generateFallbackEmbedding(text: string): number[] {
  // Create a simple hash-based embedding of fixed size (1536 dimensions like OpenAI)
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length && i < 100; i++) {
    const word = words[i];
    let hash = 0;
    
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
    }
    
    // Map hash to embedding dimensions
    const dimension = Math.abs(hash) % 1536;
    embedding[dimension] += 1 / Math.sqrt(words.length);
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Fallback content classification when OpenAI is unavailable
 */
export function classifyContentFallback(title: string, description: string): ContentClassification {
  const text = (title + ' ' + (description || '')).toLowerCase();
  const topics: Array<{name: string, confidence: number}> = [];
  
  // Rule-based topic detection
  if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('chatgpt') || text.includes('llm')) {
    topics.push({ name: 'AI/ML', confidence: 0.9 });
  }
  if (text.includes('product') || text.includes('pm') || text.includes('product manager')) {
    topics.push({ name: 'Product', confidence: 0.8 });
  }
  if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('user interface')) {
    topics.push({ name: 'Design', confidence: 0.8 });
  }
  if (text.includes('engineering') || text.includes('developer') || text.includes('programming') || text.includes('code')) {
    topics.push({ name: 'Engineering', confidence: 0.8 });
  }
  if (text.includes('business') || text.includes('startup') || text.includes('entrepreneur')) {
    topics.push({ name: 'Business', confidence: 0.7 });
  }
  if (text.includes('marketing') || text.includes('growth') || text.includes('advertising')) {
    topics.push({ name: 'Marketing', confidence: 0.7 });
  }
  if (text.includes('mobile') || text.includes('ios') || text.includes('android') || text.includes('app')) {
    topics.push({ name: 'Mobile Dev', confidence: 0.8 });
  }
  if (text.includes('devops') || text.includes('deployment') || text.includes('infrastructure')) {
    topics.push({ name: 'DevOps', confidence: 0.8 });
  }
  if (text.includes('security') || text.includes('cybersecurity') || text.includes('privacy')) {
    topics.push({ name: 'Security', confidence: 0.8 });
  }
  if (text.includes('data') || text.includes('analytics') || text.includes('statistics')) {
    topics.push({ name: 'Data Science', confidence: 0.7 });
  }
  if (text.includes('leadership') || text.includes('management') || text.includes('team')) {
    topics.push({ name: 'Leadership', confidence: 0.7 });
  }
  
  // Default to general categories if no specific match
  if (topics.length === 0) {
    if (text.includes('tech') || text.includes('technology')) {
      topics.push({ name: 'Engineering', confidence: 0.6 });
    } else {
      topics.push({ name: 'Business', confidence: 0.6 });
    }
  }
  
  return {
    topics: topics.slice(0, 3), // Max 3 topics
    summary: description || title.substring(0, 200) + '...'
  };
}
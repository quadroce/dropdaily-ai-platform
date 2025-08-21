import OpenAI from "openai";

// Prende la chiave dall'ambiente (.env o variabili di sistema) e fallisce subito se manca.
// Evita fallback silenziosi che degradano la classificazione.
const apiKey =
  process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY_ENV_VAR;

if (!apiKey || apiKey === "default_key") {
  throw new Error(
    "[Config] OPENAI_API_KEY is missing or invalid. Set it in your environment or .env file."
  );
}

// Istanza unica del client OpenAI per tutta l'app
export const openai = new OpenAI({ apiKey });

// Compatibile con import default esistenti: `import openai from "../services/openai"`
export default openai;

export interface ContentClassification {
  topics: Array<{
    name: string;
    confidence: number;
  }>;
  summary: string;
}

export interface TopicEmbedding {
  topic: string;
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error);
    
    // Handle quota exceeded - return a fallback embedding
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.warn("⚠️ OpenAI quota exceeded, using fallback embedding");
      // Return a default embedding vector (1536 dimensions for text-embedding-3-small)
      return new Array(1536).fill(0).map(() => Math.random() * 0.01);
    }
    
    throw new Error("Failed to generate embedding: " + error.message);
  }
}

export async function classifyContent(
  title: string,
  description: string,
  transcript?: string
): Promise<ContentClassification> {
  try {
    const content = `Title: ${title}\nDescription: ${description || 'No description'}${transcript ? `\nTranscript: ${transcript.substring(0, 2000)}...` : ''}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a content classification expert. Analyze the given content and classify it into relevant professional development topics. 
          
          Available topics: AI/ML, Product, Design, Engineering, Business, Marketing, Mobile Dev, DevOps, Security, Data Science, Startups, Leadership.
          
          Respond with JSON in this format: 
          {
            "topics": [
              {"name": "topic_name", "confidence": 0.9}
            ],
            "summary": "Brief 1-2 sentence summary of the content's value"
          }
          
          Only include topics with confidence > 0.6. Limit to maximum 3 topics.`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      topics: result.topics || [],
      summary: result.summary || "Content summary not available"
    };
  } catch (error: any) {
    console.error("Error classifying content:", error);
    
    // Handle quota exceeded with intelligent fallback
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.warn("⚠️ OpenAI quota exceeded, using rule-based classification");
      return ruleBasedClassification(title, description);
    }
    
    return {
      topics: [{ name: "General", confidence: 0.5 }],
      summary: "Content classification temporarily unavailable"
    };
  }
}

export async function generateTopicEmbedding(topicName: string, description: string): Promise<number[]> {
  const text = `Topic: ${topicName}. Description: ${description}`;
  return await generateEmbedding(text);
}

export async function calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
  // Calculate cosine similarity
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

// Rule-based fallback classification when OpenAI is unavailable
function ruleBasedClassification(title: string, description: string): ContentClassification {
  const content = (title + " " + description).toLowerCase();
  const topics: Array<{ name: string; confidence: number }> = [];
  
  const rules = [
    { keywords: ["ai", "ml", "machine learning", "artificial intelligence", "neural", "deep learning"], topic: "AI/ML", confidence: 0.9 },
    { keywords: ["product", "pm", "product manager", "roadmap", "feature"], topic: "Product", confidence: 0.8 },
    { keywords: ["design", "ui", "ux", "user experience", "figma", "prototype"], topic: "Design", confidence: 0.8 },
    { keywords: ["engineering", "code", "programming", "development", "software"], topic: "Engineering", confidence: 0.8 },
    { keywords: ["business", "strategy", "revenue", "growth", "startup"], topic: "Business", confidence: 0.8 },
    { keywords: ["marketing", "seo", "content", "brand", "campaign"], topic: "Marketing", confidence: 0.8 },
    { keywords: ["mobile", "ios", "android", "app", "react native"], topic: "Mobile Dev", confidence: 0.8 },
    { keywords: ["devops", "deployment", "docker", "kubernetes", "infrastructure"], topic: "DevOps", confidence: 0.8 },
    { keywords: ["security", "encryption", "vulnerability", "auth", "privacy"], topic: "Security", confidence: 0.8 },
    { keywords: ["data", "analytics", "sql", "database", "visualization"], topic: "Data Science", confidence: 0.8 },
    { keywords: ["leadership", "management", "team", "culture", "hiring"], topic: "Leadership", confidence: 0.8 }
  ];
  
  for (const rule of rules) {
    const matches = rule.keywords.filter(keyword => content.includes(keyword));
    if (matches.length > 0) {
      topics.push({ name: rule.topic, confidence: rule.confidence * (matches.length / rule.keywords.length) });
    }
  }
  
  // Sort by confidence and take top 3
  topics.sort((a, b) => b.confidence - a.confidence);
  const topTopics = topics.slice(0, 3).filter(t => t.confidence > 0.6);
  
  return {
    topics: topTopics.length > 0 ? topTopics : [{ name: "General", confidence: 0.5 }],
    summary: "Professional development content"
  };
}

export async function generateUserProfileEmbedding(userPreferences: Array<{ topicEmbedding: number[]; weight: number }>): Promise<number[]> {
  if (userPreferences.length === 0) {
    throw new Error("No user preferences provided");
  }

  const embeddingDimension = userPreferences[0].topicEmbedding.length;
  const profileEmbedding = new Array(embeddingDimension).fill(0);
  let totalWeight = 0;

  // Weighted average of topic embeddings
  for (const pref of userPreferences) {
    totalWeight += pref.weight;
    for (let i = 0; i < embeddingDimension; i++) {
      profileEmbedding[i] += pref.topicEmbedding[i] * pref.weight;
    }
  }

  // Normalize by total weight
  for (let i = 0; i < embeddingDimension; i++) {
    profileEmbedding[i] /= totalWeight;
  }

  return profileEmbedding;
}

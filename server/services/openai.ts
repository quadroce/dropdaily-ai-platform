import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding: " + (error as Error).message);
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
  } catch (error) {
    console.error("Error classifying content:", error);
    return {
      topics: [],
      summary: "Failed to classify content"
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

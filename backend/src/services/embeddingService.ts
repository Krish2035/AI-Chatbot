import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const rawTokens = process.env.HF_TOKENS || process.env.HF_TOKEN || '';
const tokensList = rawTokens
  .split(/[\n,;]+/)
  .map((t) => t.trim())
  .filter((t) => t && !t.includes('your_huggingface_token'));

const embeddingModel = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

const hfClients: HfInference[] = tokensList.map((token) => new HfInference(token));
let hfPointer = 0;

/**
 * Generate 384-dimensional embedding vector for a given text using Hugging Face Inference API
 * Features multi-token Round-Robin load balancing and rate-limit failover.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n/g, ' ').trim();
  if (!cleanText) {
    return new Array(384).fill(0);
  }

  // If HF clients are configured, rotate through the key pool
  if (hfClients.length > 0) {
    const totalClients = hfClients.length;
    let attempts = 0;

    while (attempts < totalClients) {
      const clientIndex = hfPointer % totalClients;
      const client = hfClients[clientIndex];
      hfPointer = (hfPointer + 1) % totalClients;
      attempts++;

      try {
        const output = await client.featureExtraction({
          model: embeddingModel,
          inputs: cleanText,
        });

        // Handle output shapes: number[] or number[][]
        if (Array.isArray(output)) {
          if (typeof output[0] === 'number') {
            return output as number[];
          } else if (Array.isArray(output[0]) && typeof output[0][0] === 'number') {
            return output[0] as number[];
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ HF Token #${clientIndex + 1} rate-limited or error, failing over to next token...`);
      }
    }
  }

  // Fallback feature extraction (Deterministic 384-dimensional hash vector for offline/unauthenticated dev)
  return createFallbackEmbedding(cleanText, 384);
}

/**
 * Creates a normalized deterministic 384-dim vector representation for local offline testing
 */
function createFallbackEmbedding(text: string, dim: number = 384): number[] {
  const vector = new Array(dim).fill(0);
  const normalizedText = text.toLowerCase();
  
  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const index1 = (charCode * (i + 1)) % dim;
    const index2 = (charCode * 31 + i * 17) % dim;
    vector[index1] += 1.0;
    vector[index2] += 0.5;
  }

  // Calculate L2 norm to normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;

  return vector.map((val) => val / norm);
}

/**
 * Compute cosine similarity between two vectors in JS (for memory-fallback mode)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

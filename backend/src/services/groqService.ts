import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Support GROQ_API_KEYS (comma-separated list) or single GROQ_API_KEY
const rawGroqKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
const groqKeysList = rawGroqKeys
  .split(/[\n,;]+/)
  .map((k) => k.trim())
  .filter((k) => k && !k.includes('your_groq_api_key'));

const groqModel = process.env.GROQ_MODEL || 'groq/compound';

const groqClients: Groq[] = groqKeysList.map((key) => new Groq({ apiKey: key }));
let groqPointer = 0;

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MemoryContextItem {
  content: string;
  similarity: number;
  createdAt: string;
}

/**
 * Get next active Groq client from key pool in round-robin sequence
 */
export function getGroqClientPool(): Groq[] {
  return groqClients;
}

/**
 * Generate AI response using Groq LLM API with Round-Robin Multi-Key Pool & Failover
 */
export async function generateGroqResponse(
  userQuery: string,
  shortTermHistory: ChatMessageParam[],
  recalledMemories: MemoryContextItem[] = []
): Promise<{ text: string; modelUsed: string; memoriesUsed: MemoryContextItem[] }> {

  // 1. Build System Instruction with Memory Recall Awareness
  let systemContent = `You are a helpful, intelligent AI Assistant with persistent long-term memory capabilities.
Your goal is to provide accurate, engaging, and context-aware responses.

CRITICAL INSTRUCTIONS:
- You have access to the user's past recalled messages/memories from previous sessions.
- If relevant past memories are provided below, USE THEM naturally to answer the user's question, acknowledging that you remember what they mentioned previously.
- Be clear, friendly, and helpful. Format your responses with Markdown when appropriate.`;

  if (recalledMemories.length > 0) {
    systemContent += `\n\n[RECALLED PAST MEMORIES & PREVIOUS CONVERSATIONS FOR THIS USER]:\n`;
    recalledMemories.forEach((mem, idx) => {
      systemContent += `${idx + 1}. User previously said: "${mem.content}" (Relevance score: ${(mem.similarity * 100).toFixed(1)}%)\n`;
    });
    systemContent += `\nUse the above recalled memory items if the current query asks about or relates to their past statements, preferences, background, or previous questions.`;
  }

  const messages: ChatMessageParam[] = [
    { role: 'system', content: systemContent },
    ...shortTermHistory,
    { role: 'user', content: userQuery }
  ];

  // 2. Execute Groq SDK API call with Multi-Key Pool failover
  if (groqClients.length > 0) {
    const totalClients = groqClients.length;
    let attempts = 0;

    const candidateModels = [
      groqModel,
      'groq/compound-mini',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b'
    ];

    while (attempts < totalClients) {
      const clientIndex = groqPointer % totalClients;
      const client = groqClients[clientIndex];
      groqPointer = (groqPointer + 1) % totalClients;
      attempts++;

      for (const model of candidateModels) {
        try {
          const completion = await client.chat.completions.create({
            messages,
            model,
            temperature: 0.7,
            max_tokens: 1024,
          });

          const responseText = completion.choices[0]?.message?.content;
          if (responseText) {
            return {
              text: responseText,
              modelUsed: `${model} (Key #${clientIndex + 1})`,
              memoriesUsed: recalledMemories
            };
          }
        } catch (error: any) {
          console.warn(`⚠️ Groq Key #${clientIndex + 1} (${model}) notice:`, error.message || error);
        }
      }
    }
  }

  // 3. Fallback mode if no GROQ_API_KEY is configured or active
  const memoryText = recalledMemories.length > 0 
    ? `I analyzed your past chat history and recalled that you previously mentioned: ${recalledMemories.map(m => `"${m.content}"`).join('; ')}.`
    : `I have saved this message to your persistent PostgreSQL memory!`;

  return {
    text: `Hello! I am your AI Chatbot powered by **Groq Multi-Key Pool** & **Hugging Face Memory**.\n\n${memoryText}\n\n*(Note: Add your free \`GROQ_API_KEYS\` in \`backend/.env\` to enable LLM generation)*`,
    modelUsed: 'Simulation Mode (Add GROQ_API_KEYS in backend/.env)',
    memoriesUsed: recalledMemories
  };
}

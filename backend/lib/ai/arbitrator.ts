// backend/lib/ai/arbitrator.ts
import Groq from 'groq-sdk';
import { supabase } from '../db/supabase';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Strip markdown code fences from a Groq response.
 * Handles:
 *   ```json\n{...}\n```
 *   ```\n{...}\n```
 * Falls through if no fences are present.
 */
function stripMarkdownFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
}

export interface DisputeCase {
  dealId: string;
  buyerMessage: string;
  sellerMessage: string;
  itemDescription: string;
  amount: string;
  buyerImageUrls?: string[];
  sellerImageUrls?: string[];
}

export type Ruling = 'BUYER_WINS' | 'SELLER_WINS' | 'SPLIT';

// Get chat history for a deal from database
async function getChatHistory(dealId: string): Promise<string> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (!data || data.length === 0) {
    return "No chat history available.";
  }

  return data.map(m => `${m.role}: ${m.text}`).join('\n');
}

// Store message for future disputes
export async function storeMessage(dealId: string, role: string, text: string): Promise<void> {
  await supabase.from('messages').insert({
    deal_id: dealId,
    role: role,
    text: text,
    created_at: new Date().toISOString(),
  });
}

// Main arbitration function
export async function arbitrateDispute(case_: DisputeCase): Promise<{
  ruling: Ruling;
  confidence: number;
  reasoning: string;
}> {
  console.log(`[AI] Arbitrating dispute for deal ${case_.dealId}`);

  const chatHistory = await getChatHistory(case_.dealId);

  const prompt = `You are an AI arbitrator for LYNK, a Telegram escrow platform.

DISPUTE DETAILS:
- Item: ${case_.itemDescription}
- Amount: ${case_.amount} QIE
- Buyer says: "${case_.buyerMessage}"
- Seller says: "${case_.sellerMessage}"

${case_.buyerImageUrls?.length ? `- Buyer provided ${case_.buyerImageUrls.length} image(s)` : ''}
${case_.sellerImageUrls?.length ? `- Seller provided ${case_.sellerImageUrls.length} image(s)` : ''}

CHAT HISTORY:
${chatHistory}

RULES:
1. BUYER_WINS - if item is not as described, damaged, fake, or not delivered
2. SELLER_WINS - if buyer is lying, changed their mind, or item was exactly as described
3. SPLIT - if both parties share responsibility or evidence is unclear

Return ONLY a JSON object with these fields:
{
  "ruling": "BUYER_WINS" or "SELLER_WINS" or "SPLIT",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of your decision"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 300,
    });

    const rawContent = response.choices[0]?.message?.content || '';
    console.log(`[AI] Raw response:\n${rawContent}`);

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const cleaned = stripMarkdownFences(rawContent);
    console.log(`[AI] Cleaned response:\n${cleaned}`);

    // Parse JSON response
    let result;
    let parseSuccess = false;
    try {
      result = JSON.parse(cleaned);
      parseSuccess = true;
      console.log('[AI] JSON parse succeeded');
    } catch {
      console.warn('[AI] JSON parse failed — falling back to keyword extraction');
      // If stripped content also isn't pure JSON, try extracting from raw content
      const text = rawContent.toLowerCase();
      if (text.includes('buyer_wins')) result = { ruling: 'BUYER_WINS', confidence: 0.7, reasoning: rawContent };
      else if (text.includes('seller_wins')) result = { ruling: 'SELLER_WINS', confidence: 0.7, reasoning: rawContent };
      else result = { ruling: 'SPLIT', confidence: 0.5, reasoning: rawContent };
    }

    console.log(`[AI] Ruling: ${result.ruling}, Confidence: ${result.confidence} (parseSuccess: ${parseSuccess})`);
    return {
      ruling: result.ruling as Ruling,
      // Use nullish coalescing: preserve 0, only fallback on null/undefined
      confidence: result.confidence ?? 0.7,
      reasoning: result.reasoning ?? 'AI analysis complete',
    };
  } catch (error) {
    console.error('[AI] Groq error:', error);
    // Fallback to simple logic
    const buyerMsg = case_.buyerMessage.toLowerCase();
    if (buyerMsg.includes('damage') || buyerMsg.includes('broken') || buyerMsg.includes('fake')) {
      return { ruling: 'BUYER_WINS', confidence: 0.8, reasoning: 'Buyer reported damage/fake item' };
    }
    return { ruling: 'SPLIT', confidence: 0.5, reasoning: 'Insufficient evidence, splitting 50/50' };
  }
}
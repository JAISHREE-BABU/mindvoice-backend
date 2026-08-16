import { getGenAI, AI_MODEL } from './aiClient';

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) return text;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return text.slice(start);
}

function cleanAndExtractJson(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
  return extractFirstJsonObject(cleaned);
}

function isRetryableError(err: any): boolean {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  const message = String(err?.message ?? '');
  return status === 503 || message.includes('503') || message.toLowerCase().includes('overloaded') || message.toLowerCase().includes('high demand');
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(genAI: any, params: any, maxRetries = 3) {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      console.warn(`Gemini request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

export async function generateAiReply(opts: {
  targetLanguage: string;
  proficiencyLevel: string;
  history: HistoryItem[];
  userMessage: string;
}) {
  const systemPrompt = `You are MindVoice, a friendly AI language tutor helping a learner practice "${opts.targetLanguage}" at CEFR level ${opts.proficiencyLevel}.
Reply naturally in ${opts.targetLanguage}, calibrated to their level, in 2-4 sentences, and end with a follow-up question.
Then check the learner's LAST message for grammar/vocabulary/spelling mistakes.

Respond with ONLY valid JSON, no markdown, in this exact shape:
{
  "reply": "string in the target language",
  "corrections": [
    { "original": "string", "suggestion": "string", "explanation": "short string" }
  ]
}
If there are no mistakes, "corrections" should be an empty array.`;

  const contents = [
    ...opts.history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: opts.userMessage }] },
  ];

  const genAI = await getGenAI();

  const response = await generateContentWithRetry(genAI, {
    model: AI_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    },
  });

  const raw = response.text ?? '{}';
  const jsonSlice = cleanAndExtractJson(raw);

  try {
    return JSON.parse(jsonSlice) as {
      reply: string;
      corrections: { original: string; suggestion: string; explanation: string }[];
    };
  } catch (err) {
    console.error('Failed to parse AI response as JSON. Raw response was:\n', raw);
    throw new Error('The AI returned a response that could not be parsed as JSON. Check the backend terminal for the raw output.');
  }
}

export async function generateAiReplyFromAudio(opts: {
  targetLanguage: string;
  proficiencyLevel: string;
  history: HistoryItem[];
  audioBuffer: Buffer;
  mimeType: string;
}) {
  const systemPrompt = `You are MindVoice, a friendly AI language tutor helping a learner practice "${opts.targetLanguage}" at CEFR level ${opts.proficiencyLevel}.
The learner just sent a voice message. First, transcribe exactly what they said, in whatever language they said it in.
Then reply naturally in ${opts.targetLanguage}, calibrated to their level, in 2-4 sentences, and end with a follow-up question.
Then check the learner's transcribed message for grammar/vocabulary/spelling mistakes.

Respond with ONLY valid JSON, no markdown, in this exact shape:
{
  "transcript": "string - exactly what the learner said",
  "reply": "string in the target language",
  "corrections": [
    { "original": "string", "suggestion": "string", "explanation": "short string" }
  ]
}
If there are no mistakes, "corrections" should be an empty array.`;

  const contents = [
    ...opts.history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: opts.mimeType,
            data: opts.audioBuffer.toString('base64'),
          },
        },
      ],
    },
  ];

  const genAI = await getGenAI();

  const response = await generateContentWithRetry(genAI, {
    model: AI_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    },
  });

  const raw = response.text ?? '{}';
  const jsonSlice = cleanAndExtractJson(raw);

  try {
    return JSON.parse(jsonSlice) as {
      transcript: string;
      reply: string;
      corrections: { original: string; suggestion: string; explanation: string }[];
    };
  } catch (err) {
    console.error('Failed to parse AI response as JSON (audio). Raw response was:\n', raw);
    throw new Error('The AI returned a response that could not be parsed as JSON.');
  }
}
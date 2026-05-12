import type { Express, Request, Response } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  searchRackets, getRacketById, createRecommendationRun, getRecommendationRun,
  createFeedback, createConversation, getConversationMessages, addMessage,
} from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Zod schema for AI output ──────────────────────────────────────────────────

const StringSetupSchema = z.object({
  stringFamily: z.string(),
  exampleStrings: z.array(z.string()),
  gauge: z.string(),
  tension: z.string(),
});

const RecommendationOutputSchema = z.object({
  setup: z.object({
    mains: StringSetupSchema,
    crosses: StringSetupSchema.optional(),
  }),
  alternatives: z.array(z.object({
    stringFamily: z.string(),
    exampleStrings: z.array(z.string()),
    description: z.string(),
  })),
  explanation: z.string(),
  warnings: z.array(z.string()),
  confidenceReason: z.string(),
});

type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcConfidence(input: any): 'HIGH' | 'MEDIUM' | 'ESTIMATED' {
  let score = 0;
  if (input.racketId) score += 3;
  if (input.racketName) score += 1;
  if (input.goals?.length) score += 2;
  if (input.swingSpeed) score += 2;
  if (input.playFrequency) score += 1;
  if (input.injuryRisk?.length) score += 1;
  if (input.stringHistory) score += 1;
  if (score >= 8) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'ESTIMATED';
}

const FALLBACK: RecommendationOutput = {
  setup: {
    mains: {
      stringFamily: 'Polyester',
      exampleStrings: ['Luxilon ALU Power 125', 'Babolat RPM Blast 125'],
      gauge: '1.25mm (17g)',
      tension: '52–56 lbs',
    },
  },
  alternatives: [
    {
      stringFamily: 'Multifilament',
      exampleStrings: ['Wilson NXT 16', 'Tecnifibre X-One Biphase 17'],
      description: 'Arm-friendly option with more comfort and feel.',
    },
  ],
  explanation: 'Based on your input, a mid-range polyester in mains provides a solid balance of spin, control, and durability. Adjust tension to preference.',
  warnings: [],
  confidenceReason: 'Limited input data — general recommendation applied.',
};

async function getAIRecommendation(systemPrompt: string, userPrompt: string): Promise<RecommendationOutput> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      });
      const raw = JSON.parse(res.choices[0].message.content ?? '{}');
      return RecommendationOutputSchema.parse(raw);
    } catch {
      if (attempt === 1) return FALLBACK;
    }
  }
  return FALLBACK;
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerRoutes(app: Express): void {

  // GET /api/rackets/search
  app.get('/api/rackets/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q ?? '');
      const results = await searchRackets(q);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // GET /api/rackets/:id
  app.get('/api/rackets/:id', async (req: Request, res: Response) => {
    try {
      const racket = await getRacketById(Number(req.params.id));
      if (!racket) return res.status(404).json({ error: 'Not found' });
      res.json(racket);
    } catch {
      res.status(500).json({ error: 'Failed to fetch racket' });
    }
  });

  // POST /api/recommend
  app.post('/api/recommend', async (req: Request, res: Response) => {
    try {
      const input = req.body;
      const confidence = calcConfidence(input);

      let racketInfo = '';
      if (input.racketId) {
        const r = await getRacketById(Number(input.racketId));
        if (r) {
          racketInfo = `Racket: ${r.brand} ${r.model}, ${r.headSize}sq in, ${r.stringPattern}, ${r.weightUnstrung}g, RA${r.stiffnessRa}, beam ${r.beamWidth}, rec tension ${r.recTensionMin}–${r.recTensionMax} lbs.`;
        }
      } else if (input.racketName) {
        racketInfo = `Racket (approximate): ${input.racketName}`;
      }

      const systemPrompt = `You are an expert tennis stringer with 20+ years of experience. You know all major string brands and models: Luxilon ALU Power, Babolat RPM Blast, Solinco Hyper-G, Wilson NXT, Tecnifibre X-One Biphase, Yonex Poly Tour Pro, Kirschbaum Max Power, Head Hawk, Natural Gut, Hybrid setups, etc. You are injury-aware and always warn about arm issues when relevant. Respond ONLY with valid JSON matching this schema exactly:
{
  "setup": {
    "mains": { "stringFamily": string, "exampleStrings": string[], "gauge": string, "tension": string },
    "crosses": { "stringFamily": string, "exampleStrings": string[], "gauge": string, "tension": string } // optional for hybrids
  },
  "alternatives": [{ "stringFamily": string, "exampleStrings": string[], "description": string }],
  "explanation": string,
  "warnings": string[],
  "confidenceReason": string
}`;

      const userPrompt = `${racketInfo}
Goals: ${(input.goals ?? []).join(', ') || 'not specified'}
Swing speed: ${input.swingSpeed ?? 'unknown'}
Play frequency: ${input.playFrequency ?? 'unknown'}
Injury concerns: ${(input.injuryRisk ?? []).join(', ') || 'none'}
String history: ${input.stringHistory || 'none'}
Budget: ${input.budget || 'no preference'}

Provide the best string recommendation for this player.`;

      const output = await getAIRecommendation(systemPrompt, userPrompt);
      const run = await createRecommendationRun({ racketId: input.racketId, inputJson: input, outputJson: output, confidence });

      res.json({ runId: run.id, confidence, ...output });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Recommendation failed' });
    }
  });

  // GET /api/recommendation-runs/:id
  app.get('/api/recommendation-runs/:id', async (req: Request, res: Response) => {
    try {
      const run = await getRecommendationRun(Number(req.params.id));
      if (!run) return res.status(404).json({ error: 'Not found' });
      res.json(run);
    } catch {
      res.status(500).json({ error: 'Failed to fetch run' });
    }
  });

  // POST /api/feedback
  app.post('/api/feedback', async (req: Request, res: Response) => {
    try {
      const fb = await createFeedback(req.body);
      res.json(fb);
    } catch {
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  });

  // GET /api/stringers/search
  app.get('/api/stringers/search', async (req: Request, res: Response) => {
    try {
      const { query, lat, lng } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Maps API not configured' });

      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.set('query', `tennis stringer ${query ?? ''}`);
      if (lat && lng) {
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', '25000');
      }
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      const data = await response.json() as any;
      res.json(data.results ?? []);
    } catch (err) {
      res.status(500).json({ error: 'Stringer search failed' });
    }
  });

  // POST /api/conversations
  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const conv = await createConversation(req.body.title);
      res.json(conv);
    } catch {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // POST /api/conversations/:id/messages  (SSE streaming)
  app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const conversationId = Number(req.params.id);
      const { role, content } = req.body as { role: string; content: string };

      await addMessage({ conversationId, role, content });

      const history = await getConversationMessages(conversationId);
      const chatMessages = history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      res.socket?.setNoDelay(true);

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You are the 10IS Technician, an expert AI racket stringer powered by Hevini Sporting. You know string types (poly, multi, natural gut, synthetic gut, kevlar), gauges, tensions, hybrid setups, all major brands (Luxilon, Babolat, Wilson, Solinco, Technifibre, Head, Yonex, Kirschbaum), and injury safety. Be direct, concise, and credible. No filler. Reference specific string models. IMPORTANT — Hevini brand rackets: the Hevini Solution 1 is a 97 sq in, 16x19 string pattern, 300g unstrung, 7 pts headlight, RA 68, 21mm beam, recommended tension 48-55 lbs. It is made by Hevini Sporting, NOT by any other brand. Always attribute Hevini rackets to Hevini Sporting only.',
          },
          ...chatMessages,
        ],
      });

      let assistantContent = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? '';
        if (token) {
          assistantContent += token;
          res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
        }
      }

      await addMessage({ conversationId, role: 'assistant', content: assistantContent });
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      try { res.write('data: ' + JSON.stringify({ content: 'Error: ' + msg }) + '\n\n'); } catch (_) {}
      try { res.write('data: [DONE]\n\n'); res.end(); } catch (_) {}
    }
  });
}

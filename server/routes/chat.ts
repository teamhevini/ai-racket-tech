import { Router } from "express";
import { z } from "zod";
import { asyncHandler, currentUser, rateLimit, requireEntitlement } from "../auth";
import { storage } from "../storage";
import { AI_MODEL, aiConfigured, getOpenAI } from "../recommend-engine";
import { parseBody, parseId } from "./util";

export const chatRouter = Router();

const TENNIS_SYSTEM_PROMPT = `You are the 10IS AI Racket Technician — a professional tennis stringing and equipment advisor.

Your expertise covers:
- String types: polyester, multifilament, natural gut, hybrid setups
- String gauges, tensions, and how they interact with racket specs
- Player profiles: swing speed, playstyle, injury risk (especially tennis elbow, wrist, shoulder)
- Racket specs: head size, string pattern, stiffness (RA), beam width
- Major string brands: Luxilon, Babolat, Tecnifibre, Wilson, Solinco, Kirschbaum, Yonex, Head
- Restringing frequency, string longevity, and maintenance
- How to interpret string feel: comfort, power, spin, control, durability trade-offs

Guidelines:
- Be conversational but precise — like a knowledgeable stringer at a pro shop
- Always ask about injury history if arm pain comes up — arm safety is a priority
- Reference specific string models (e.g., "Luxilon ALU Power 125") not just categories
- If a player mentions their racket, factor in its known specs
- Keep responses practical, actionable, and short enough to read on a phone`;

// v1 kept chats in server memory, shared by every visitor, with no login check.
// Now conversations belong to a user, live in the database, and need Club.
chatRouter.use("/api/conversations", requireEntitlement("chat", "Live AI chat is part of 10IS Club."));

chatRouter.get(
  "/api/conversations",
  asyncHandler(async (req, res) => {
    res.json(await storage.getConversations(currentUser(req).id));
  }),
);

chatRouter.post(
  "/api/conversations",
  asyncHandler(async (req, res) => {
    const data = parseBody(z.object({ title: z.string().trim().max(120).optional() }), req.body, res);
    if (!data) return;
    res.status(201).json(await storage.createConversation(currentUser(req).id, data.title || "New chat"));
  }),
);

chatRouter.get(
  "/api/conversations/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const conv = id ? await storage.getConversation(id, currentUser(req).id) : undefined;
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    res.json({ ...conv, messages: await storage.getMessages(conv.id) });
  }),
);

chatRouter.delete(
  "/api/conversations/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id) await storage.deleteConversation(id, currentUser(req).id);
    res.status(204).end();
  }),
);

chatRouter.post(
  "/api/conversations/:id/messages",
  rateLimit({ windowMs: 60 * 60_000, max: 60, key: (req) => `chat${req.user?.id}` }),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const user = currentUser(req);
    const conv = id ? await storage.getConversation(id, user.id) : undefined;
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    const data = parseBody(z.object({ content: z.string().trim().min(1).max(4000) }), req.body, res);
    if (!data) return;
    if (!aiConfigured()) return res.status(503).json({ message: "The AI technician isn't configured yet." });

    await storage.createMessage(conv.id, "user", data.content);
    const history = (await storage.getMessages(conv.id)).slice(-30);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let full = "";
    try {
      const stream = await getOpenAI().chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: TENNIS_SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        stream: true,
        max_completion_tokens: 1200,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
      await storage.createMessage(conv.id, "assistant", full);
      await storage.touchConversation(conv.id);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      console.error("[chat] stream failed:", err);
      res.write(`data: ${JSON.stringify({ error: "The technician lost connection. Please try again." })}\n\n`);
    }
    res.end();
  }),
);

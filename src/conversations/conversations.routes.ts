import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authGuard, AuthedRequest } from '../auth/authGuard';
import { generateAiReply, generateAiReplyFromAudio } from '../ai/conversation.service';

export const conversationsRouter = Router();
conversationsRouter.use(authGuard);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const startSchema = z.object({
  topic: z.string().optional(),
  targetLanguageCode: z.string().length(2),
});

conversationsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.userId!,
      topic: parsed.data.topic,
      targetLanguageCode: parsed.data.targetLanguageCode,
    },
  });
  res.status(201).json(conversation);
});

conversationsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id as string, userId: req.userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  res.json(conversation);
});

const messageSchema = z.object({ content: z.string().min(1) });

conversationsRouter.post('/:id/messages', async (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id as string, userId: req.userId },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content: parsed.data.content },
  });

  const history = conversation.messages
    .slice()
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const aiResult = await generateAiReply({
    targetLanguage: conversation.targetLanguageCode,
    proficiencyLevel: user.proficiencyLevel,
    history,
    userMessage: parsed.data.content,
  });

  const assistantMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: 'assistant', content: aiResult.reply },
  });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  const updatedUser = await prisma.user.update({
    where: { id: req.userId },
    data: { xp: { increment: 5 } },
  });

  res.status(201).json({
    assistantMessage,
    corrections: aiResult.corrections,
    xpAwarded: 5,
    totalXp: updatedUser.xp,
  });
});

conversationsRouter.post('/:id/voice-messages', upload.single('audio'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id as string, userId: req.userId },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });

  const history = conversation.messages
    .slice()
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const aiResult = await generateAiReplyFromAudio({
    targetLanguage: conversation.targetLanguageCode,
    proficiencyLevel: user.proficiencyLevel,
    history,
    audioBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content: aiResult.transcript },
  });

  const assistantMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: 'assistant', content: aiResult.reply },
  });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  const updatedUser = await prisma.user.update({
    where: { id: req.userId },
    data: { xp: { increment: 5 } },
  });

  res.status(201).json({
    transcript: aiResult.transcript,
    assistantMessage,
    corrections: aiResult.corrections,
    xpAwarded: 5,
    totalXp: updatedUser.xp,
  });
});
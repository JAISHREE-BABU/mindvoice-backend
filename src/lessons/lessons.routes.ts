import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authGuard, AuthedRequest } from '../auth/authGuard';

export const lessonsRouter = Router();

// GET /api/lessons?targetLanguageCode=es
lessonsRouter.get('/', authGuard, async (req: AuthedRequest, res) => {
  const targetLanguageCode = (req.query.targetLanguageCode as string) || undefined;
  const userId = req.userId as string;

  const lessons = await prisma.lesson.findMany({
    where: targetLanguageCode ? { targetLanguageCode } : undefined,
    orderBy: { orderIndex: 'asc' },
  });

  const completions = await prisma.lessonCompletion.findMany({
    where: { userId },
    select: { lessonId: true },
  });
  const completedIds = new Set(completions.map((c) => c.lessonId));

  res.json(
    lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      targetLanguageCode: lesson.targetLanguageCode,
      difficulty: lesson.difficulty,
      xpReward: lesson.xpReward,
      completed: completedIds.has(lesson.id),
    }))
  );
});

// GET /api/lessons/:id
lessonsRouter.get('/:id', authGuard, async (req: AuthedRequest, res) => {
  const lessonId = req.params.id as string;
  const userId = req.userId as string;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { vocabItems: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const completion = await prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });

  res.json({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    targetLanguageCode: lesson.targetLanguageCode,
    difficulty: lesson.difficulty,
    xpReward: lesson.xpReward,
    completed: !!completion,
    vocabItems: lesson.vocabItems.map((v: { id: string; phrase: string; translation: string; notes: string | null }) => ({
      id: v.id,
      phrase: v.phrase,
      translation: v.translation,
      notes: v.notes,
    })),
  });
});

// POST /api/lessons/:id/complete
lessonsRouter.post('/:id/complete', authGuard, async (req: AuthedRequest, res) => {
  const lessonId = req.params.id as string;
  const userId = req.userId as string;

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const existing = await prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return res.json({ alreadyCompleted: true, xpAwarded: 0, totalXp: user!.xp });
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.lessonCompletion.create({
      data: { userId, lessonId: lesson.id, xpAwarded: lesson.xpReward },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: lesson.xpReward } },
    }),
  ]);

  res.json({ alreadyCompleted: false, xpAwarded: lesson.xpReward, totalXp: updatedUser.xp });
});
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authGuard, AuthedRequest } from '../auth/authGuard';

export const usersRouter = Router();

usersRouter.get('/leaderboard', authGuard, async (req: AuthedRequest, res) => {
  const topUsers = await prisma.user.findMany({
    orderBy: { xp: 'desc' },
    take: 20,
    select: { id: true, name: true, xp: true, proficiencyLevel: true },
  });

  res.json(
    topUsers.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      name: u.name,
      xp: u.xp,
      proficiencyLevel: u.proficiencyLevel,
      isCurrentUser: u.id === req.userId,
    }))
  );
});

usersRouter.get('/me', authGuard, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { nativeLanguage: true, targetLanguage: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    xp: user.xp,
    proficiencyLevel: user.proficiencyLevel,
    nativeLanguage: user.nativeLanguage.name,
    targetLanguage: user.targetLanguage.name,
  });
});
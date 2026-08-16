import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword } from './password';
import { signToken } from './token';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  nativeLanguageCode: z.string().length(2),
  targetLanguageCode: z.string().length(2),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, name, nativeLanguageCode, targetLanguageCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const nativeLanguage = await prisma.language.findUnique({ where: { code: nativeLanguageCode } });
  const targetLanguage = await prisma.language.findUnique({ where: { code: targetLanguageCode } });
  if (!nativeLanguage || !targetLanguage) {
    return res.status(400).json({ error: 'Unsupported language code' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      nativeLanguageId: nativeLanguage.id,
      targetLanguageId: targetLanguage.id,
    },
  });

  const token = signToken({ sub: user.id, email: user.email });
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
});

authRouter.post('/login', async (req, res) => {
  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
});
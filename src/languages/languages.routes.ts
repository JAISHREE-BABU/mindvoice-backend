import { Router } from 'express';
import { prisma } from '../db/prisma';

export const languagesRouter = Router();

languagesRouter.get('/', async (req, res) => {
  const languages = await prisma.language.findMany();
  res.json(languages);
});
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './auth/auth.routes';
import { usersRouter } from './users/users.routes';
import { conversationsRouter } from './conversations/conversations.routes';
import { languagesRouter } from './languages/languages.routes';
import { lessonsRouter } from './lessons/lessons.routes';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/lessons', lessonsRouter);
app.get('/', (req, res) => {
  res.json({ message: 'MindVoice backend is running!' });
});

app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '7d';

export function signToken(payload: { sub: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
}
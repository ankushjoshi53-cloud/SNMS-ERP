import type { Request, Response } from 'express';
import { createApp } from '../src/server/app';

// Keep one initialized Express application per warm Vercel function instance.
const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}

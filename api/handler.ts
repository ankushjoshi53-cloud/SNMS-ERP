import type { Request, Response } from 'express';
import { createApp } from './app';

// Keep one initialized Express application per warm Vercel function instance.
const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Vercel API initialization/request failure:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'API initialization failed. Check Vercel Function Logs.' });
    }
  }
}

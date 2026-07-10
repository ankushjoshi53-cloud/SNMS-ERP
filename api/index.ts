// Compatibility entry point for Vercel's default /api route.
// Keep this as a local re-export so old/default routing never resolves ../server.
export { default } from './handler';

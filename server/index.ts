import 'dotenv/config';
import express from 'express';
import path from 'path';
import { registerRoutes } from './routes';
import { seedDatabase } from './storage';

async function main() {
  const app = express();
  app.use(express.json());

  registerRoutes(app);

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const staticPath = path.join(process.cwd(), 'dist/public');
    app.use(express.static(staticPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT ?? '5000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[10IS] Server running on port ${PORT}`);
    seedDatabase();
  });
}

main().catch(console.error);

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import defaultApp from './server/app';

const PORT = 3000;

async function startServer() {
  const app = defaultApp;

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FWSC (Free Website SEO Checker by digiVirus) Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

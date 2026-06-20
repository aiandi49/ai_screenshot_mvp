import express from 'express';
import { startPolling } from './poller.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and you, for sanity-checking) hits this to confirm the service is alive.
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ai-and-i-worker' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
  startPolling();
});

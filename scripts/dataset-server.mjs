import express from 'express';
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../server/data');
const PORT = 8787;

await mkdir(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/api/trajectories', async (req, res) => {
  try {
    const files = await readdir(DATA_DIR);
    const trajs = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => JSON.parse(await readFile(join(DATA_DIR, f), 'utf8')))
    );
    res.json(trajs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/trajectories', async (req, res) => {
  try {
    const traj = req.body;
    if (!traj?.id) return res.status(400).json({ error: 'missing id' });
    await writeFile(join(DATA_DIR, `${traj.id}.json`), JSON.stringify(traj, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/trajectories/:id', async (req, res) => {
  try {
    const data = await readFile(join(DATA_DIR, `${req.params.id}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

app.delete('/api/trajectories/:id', async (req, res) => {
  try {
    await unlink(join(DATA_DIR, `${req.params.id}.json`));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

app.get('/api/stats', async (req, res) => {
  const files = await readdir(DATA_DIR).catch(() => []);
  res.json({ count: files.filter(f => f.endsWith('.json')).length });
});

app.listen(PORT, () => console.log(`Dataset server on http://localhost:${PORT}`));

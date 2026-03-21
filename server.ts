import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    adminToken: 'abcd',
    members: [
      { id: '1', name: '张明辉', email: 'minghui.zhang@lead-team.com', path: 'a1b2c3' },
      { id: '2', name: '李青', email: 'qing.li@lead-team.com', path: 'd4e5f6' },
      { id: '3', name: '王志平', email: 'zhiping.wang@lead-team.com', path: 'g7h8i9' }
    ],
    schedules: []
  }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generatePath() {
  return Math.random().toString(36).substring(2, 8);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/admin/members', (req, res) => {
    const data = readData();
    if (req.query.token !== data.adminToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(data.members);
  });

  app.get('/api/admin/schedules', (req, res) => {
    const data = readData();
    if (req.query.token !== data.adminToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(data.schedules);
  });

  app.post('/api/admin/members', (req, res) => {
    const data = readData();
    if (req.query.token !== data.adminToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const newMember = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      path: generatePath()
    };
    data.members.push(newMember);
    writeData(data);
    res.json(newMember);
  });

  app.get('/api/member/:path', (req, res) => {
    const data = readData();
    const member = data.members.find((m: any) => m.path === req.params.path);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  });

  app.get('/api/member/:path/schedules', (req, res) => {
    const data = readData();
    const member = data.members.find((m: any) => m.path === req.params.path);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    const schedules = data.schedules.filter((s: any) => s.memberId === member.id);
    res.json(schedules);
  });

  app.post('/api/member/:path/schedules', (req, res) => {
    const data = readData();
    const member = data.members.find((m: any) => m.path === req.params.path);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const newSchedule = {
      id: Date.now().toString(),
      memberId: member.id,
      date: req.body.date,
      timeOfDay: req.body.timeOfDay,
      content: req.body.content,
      type: req.body.type || 'core',
      image: req.body.image || null
    };
    data.schedules.push(newSchedule);
    writeData(data);
    res.json(newSchedule);
  });

  app.delete('/api/member/:path/schedules/:id', (req, res) => {
    const data = readData();
    const member = data.members.find((m: any) => m.path === req.params.path);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    data.schedules = data.schedules.filter((s: any) => s.id !== req.params.id || s.memberId !== member.id);
    writeData(data);
    res.json({ success: true });
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

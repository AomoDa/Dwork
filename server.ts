import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const PORT = 3000;
const DB_FILE = 'file:local.db';

const db = createClient({
  url: DB_FILE,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE
    )
  `);

  try {
    await db.execute('ALTER TABLE members ADD COLUMN isDeleted INTEGER DEFAULT 0');
  } catch (e) {
    // Column might already exist, ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      date TEXT NOT NULL,
      timeOfDay TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      image TEXT,
      FOREIGN KEY(memberId) REFERENCES members(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Initialize admin token
  const tokenRes = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['adminToken']
  });

  if (tokenRes.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO config (key, value) VALUES (?, ?)',
      args: ['adminToken', 'abcd']
    });
  }

  // Initialize members if not already initialized
  const initRes = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['isInitialized']
  });

  if (initRes.rows.length === 0) {
    const membersRes = await db.execute('SELECT count(*) as count FROM members');
    if (membersRes.rows[0].count === 0) {
      const initialMembers = [
        '姜银凤', '楼丽', '蒋青海', '姚晓晓', '赵威威', '王莉', '陈建康',
        '毛春楼', '谢忠帐', '方明', '姚义蒙', '董益斌', '封令伟', '宋斌'
      ];

      for (const name of initialMembers) {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
        const memberPath = Math.random().toString(36).substring(2, 8);
        await db.execute({
          sql: 'INSERT INTO members (id, name, path) VALUES (?, ?, ?)',
          args: [id, name, memberPath]
        });
      }
    }

    // Mark database as initialized
    await db.execute({
      sql: 'INSERT INTO config (key, value) VALUES (?, ?)',
      args: ['isInitialized', 'true']
    });
  }
}

async function getAdminToken() {
  const res = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['adminToken']
  });
  return res.rows[0]?.value as string;
}

function generatePath() {
  return Math.random().toString(36).substring(2, 8);
}

async function startServer() {
  await initDb();

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/admin/members', async (req, res) => {
    const token = await getAdminToken();
    if (req.query.token !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const includeDeleted = req.query.all === 'true';
    const query = includeDeleted 
      ? 'SELECT * FROM members' 
      : 'SELECT * FROM members WHERE isDeleted = 0 OR isDeleted IS NULL';
    const result = await db.execute(query);
    res.json(result.rows);
  });

  app.patch('/api/admin/members/:id', async (req, res) => {
    const token = await getAdminToken();
    if (req.query.token !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { isDeleted } = req.body;
    await db.execute({
      sql: 'UPDATE members SET isDeleted = ? WHERE id = ?',
      args: [isDeleted ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  });

  app.get('/api/admin/schedules', async (req, res) => {
    const token = await getAdminToken();
    if (req.query.token !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await db.execute('SELECT * FROM schedules');
    res.json(result.rows);
  });

  app.post('/api/admin/members', async (req, res) => {
    const token = await getAdminToken();
    if (req.query.token !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const newMember = {
      id: Date.now().toString(),
      name: req.body.name,
      path: generatePath()
    };
    await db.execute({
      sql: 'INSERT INTO members (id, name, path) VALUES (?, ?, ?)',
      args: [newMember.id, newMember.name, newMember.path]
    });
    res.json(newMember);
  });

  app.get('/api/member/:path', async (req, res) => {
    const result = await db.execute({
      sql: 'SELECT * FROM members WHERE path = ? AND (isDeleted = 0 OR isDeleted IS NULL)',
      args: [req.params.path]
    });
    const member = result.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found or deleted' });
    res.json(member);
  });

  app.get('/api/member/:path/schedules', async (req, res) => {
    const memberRes = await db.execute({
      sql: 'SELECT id FROM members WHERE path = ? AND (isDeleted = 0 OR isDeleted IS NULL)',
      args: [req.params.path]
    });
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found or deleted' });
    
    const schedulesRes = await db.execute({
      sql: 'SELECT * FROM schedules WHERE memberId = ?',
      args: [member.id]
    });
    res.json(schedulesRes.rows);
  });

  app.post('/api/member/:path/schedules', async (req, res) => {
    const memberRes = await db.execute({
      sql: 'SELECT id FROM members WHERE path = ? AND (isDeleted = 0 OR isDeleted IS NULL)',
      args: [req.params.path]
    });
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found or deleted' });

    const newSchedule = {
      id: Date.now().toString(),
      memberId: member.id,
      date: req.body.date,
      timeOfDay: req.body.timeOfDay,
      content: req.body.content,
      type: req.body.type || 'core',
      image: req.body.image || null
    };

    await db.execute({
      sql: 'INSERT INTO schedules (id, memberId, date, timeOfDay, content, type, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [newSchedule.id, newSchedule.memberId, newSchedule.date, newSchedule.timeOfDay, newSchedule.content, newSchedule.type, newSchedule.image]
    });

    res.json(newSchedule);
  });

  app.delete('/api/member/:path/schedules/:id', async (req, res) => {
    const memberRes = await db.execute({
      sql: 'SELECT id FROM members WHERE path = ? AND (isDeleted = 0 OR isDeleted IS NULL)',
      args: [req.params.path]
    });
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found or deleted' });

    await db.execute({
      sql: 'DELETE FROM schedules WHERE id = ? AND memberId = ?',
      args: [req.params.id, member.id]
    });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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

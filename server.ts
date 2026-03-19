import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database Connection
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // Students
  app.get('/api/students', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM students');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/students', async (req, res) => {
    const s = req.body;
    try {
      await pool.query(
        'INSERT INTO students (id, roll, name, father_name, mother_name, village, mobile, student_class, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE roll=?, name=?, father_name=?, mother_name=?, village=?, mobile=?, student_class=?, year=?',
        [s.id, s.roll, s.name, s.father_name, s.mother_name, s.village, s.mobile, s.student_class, s.year, s.roll, s.name, s.father_name, s.mother_name, s.village, s.mobile, s.student_class, s.year]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Results
  app.get('/api/results', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM results');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/results', async (req, res) => {
    const r = req.body;
    try {
      await pool.query(
        'INSERT INTO results (id, student_id, exam_name, class, year, marks, total_marks, grade, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE marks=?, total_marks=?, grade=?, is_published=?',
        [r.id, r.student_id, r.exam_name, r.class, r.year, JSON.stringify(r.marks), r.total_marks, r.grade, r.is_published, JSON.stringify(r.marks), r.total_marks, r.grade, r.is_published]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/results/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM results WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Notices
  app.get('/api/notices', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM notices');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/notices', async (req, res) => {
    const notices = req.body;
    try {
      await pool.query('DELETE FROM notices');
      for (const n of notices) {
        await pool.query('INSERT INTO notices (id, text, date) VALUES (?, ?, ?)', [n.id, n.text, n.date]);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // App Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM app_settings');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    try {
      await pool.query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [key, value, value]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Subjects
  app.get('/api/subjects', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM subjects');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/subjects', async (req, res) => {
    const { className, classSubjects } = req.body;
    try {
      await pool.query('INSERT INTO subjects (class, subjects) VALUES (?, ?) ON DUPLICATE KEY UPDATE subjects = ?', [className, JSON.stringify(classSubjects), JSON.stringify(classSubjects)]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
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

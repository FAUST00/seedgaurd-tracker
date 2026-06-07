const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_DATA_FILE = path.join(DATA_DIR, 'user-data.json');
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'seedguard-dev-secret-change-me';

const allowedOrigins = ['https://faust00.github.io', 'http://localhost:3000'];

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || origin?.endsWith('.onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const api = express.Router();

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(USERS_FILE); } catch { await fs.writeFile(USERS_FILE, '[]'); }
  try { await fs.access(USER_DATA_FILE); } catch { await fs.writeFile(USER_DATA_FILE, '{}'); }
}

async function loadUsers() { await ensureData(); const data = await fs.readFile(USERS_FILE, 'utf8'); return JSON.parse(data || '[]'); }
async function saveUsers(users) { await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2)); }

async function loadUserData() { await ensureData(); const data = await fs.readFile(USER_DATA_FILE, 'utf8'); return JSON.parse(data || '{}'); }
async function saveUserData(data) { await fs.writeFile(USER_DATA_FILE, JSON.stringify(data, null, 2)); }

api.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = await loadUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(400).json({ error: 'Username taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = { id: 'u_' + Date.now(), username, email: email || null, password: hashed, createdAt: new Date().toISOString() };

    users.push(user);
    await saveUsers(users);

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

api.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = await loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.use('/api', api);
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Backend running on ${PORT}`));

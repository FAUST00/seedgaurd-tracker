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
const JWT_SECRET = process.env.JWT_SECRET || 'seedguard-dev-secret-change-me-in-production';

const allowedOrigins = ['https://faust00.github.io', 'http://localhost:3000', 'http://localhost:3001'];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
}

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const api = express.Router();

async function ensureDataFile() { /* ... keep as is ... */ } // (I'll keep it short here)

async function loadUsers() { /* keep existing */ }
async function saveUsers(users) { /* keep */ }
async function loadUserData() { /* keep */ }
async function saveUserData(userData) { /* keep */ }

api.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = await loadUsers();
    if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'user_' + Date.now(),
      username,
      email: email || null,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    const token = jwt.sign({ sub: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

api.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = await loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

api.get('/me', /* requireAuth logic */ async (req, res) => { /* keep your me route */ });

app.use('/api', api);
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

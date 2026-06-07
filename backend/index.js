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
const allowedOrigins = [
  'https://faust00.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
}

app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Origin not allowed by CORS.' });
  }
  next();
});

const api = express.Router();

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await saveUsers([]);
  }

  try {
    await fs.access(USER_DATA_FILE);
  } catch (error) {
    await saveUserData({});
  }
}

async function loadUsers() {
  await ensureDataFile();
  const fileData = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(fileData || '[]');
}

async function saveUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function loadUserData() {
  await ensureDataFile();
  const fileData = await fs.readFile(USER_DATA_FILE, 'utf8');
  return JSON.parse(fileData || '{}');
}

async function saveUserData(userData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USER_DATA_FILE, JSON.stringify(userData, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    goalDays: user.goalDays,
    createdAt: user.createdAt,
  };
}

function getStarterProfile(user) {
  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    goalDays: user.goalDays,
    createdAt: user.createdAt,
    relapses: [],
    journals: [],
    updatedAt: new Date().toISOString(),
  };
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

function requireProfileOwner(req, res, next) {
  if (req.auth?.sub !== req.params.userId) {
    return res.status(403).json({ error: 'You can only access your own profile.' });
  }
  return next();
}

app.get('/', (req, res) => {
  res.json({
    name: 'SeedGuard API',
    status: 'ok',
    routes: ['/api/health', '/api/signup', '/api/login', '/api/profile/:userId'],
  });
});

api.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

api.get('/signup', (req, res) => {
  res.json({
    endpoint: '/api/signup',
    method: 'POST',
    requiredBody: ['name', 'username', 'email', 'password'],
  });
});

api.post('/signup', async (req, res) => {
  const { name, username, email, password, goalDays } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Name, username, email, and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  const users = await loadUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  if (users.some((user) => user.username === normalizedUsername)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name: String(name).trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    goalDays: Number(goalDays) || 90,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  const userData = await loadUserData();
  userData[newUser.id] = getStarterProfile(newUser);
  await saveUserData(userData);

  res.status(201).json({
    message: 'Account created successfully.',
    user: publicUser(newUser),
    token: issueToken(newUser),
    profile: userData[newUser.id],
  });
});

api.get('/login', (req, res) => {
  res.json({
    endpoint: '/api/login',
    method: 'POST',
    requiredBody: ['username', 'password'],
  });
});

api.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const normalizedUsername = normalizeUsername(username);
  const users = await loadUsers();
  const account = users.find((user) => user.username === normalizedUsername);
  if (!account) {
    return res.status(404).json({ error: 'No account found for that username.' });
  }

  const passwordMatches = bcrypt.compareSync(password, account.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  res.json({
    message: 'Login successful.',
    user: publicUser(account),
    token: issueToken(account),
  });
});

api.get('/me', requireAuth, async (req, res) => {
  const users = await loadUsers();
  const account = users.find((user) => user.id === req.auth.sub);
  if (!account) {
    return res.status(404).json({ error: 'No account found for that session.' });
  }

  const userData = await loadUserData();
  res.json({
    user: publicUser(account),
    profile: userData[account.id] || getStarterProfile(account),
  });
});

api.post('/me', requireAuth, async (req, res) => {
  const users = await loadUsers();
  const account = users.find((user) => user.id === req.auth.sub);
  if (!account) {
    return res.status(404).json({ error: 'No account found for that session.' });
  }

  const userData = await loadUserData();
  const currentProfile = userData[account.id] || getStarterProfile(account);
  const nextProfile = {
    ...currentProfile,
    ...req.body,
    userId: account.id,
    email: account.email,
    username: account.username,
    name: req.body.name || currentProfile.name || account.name,
    goalDays: Number(req.body.goalDays || req.body.goal_days || currentProfile.goalDays || account.goalDays),
    updatedAt: new Date().toISOString(),
  };

  userData[account.id] = nextProfile;
  await saveUserData(userData);
  res.json({ message: 'Profile saved successfully.', profile: nextProfile });
});

api.get('/profile/:userId', requireAuth, requireProfileOwner, async (req, res) => {
const userData = await loadUserData();
  const profile = userData[req.params.userId];
  if (!profile) {

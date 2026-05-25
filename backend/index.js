const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.sendStatus(204);
  }
  next();
});

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await saveUsers([]);
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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password, goalDays } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    goalDays: Number(goalDays) || 90,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  res.status(201).json({
    message: 'Account created successfully.',
    user: { id: newUser.id, name: newUser.name, email: newUser.email, goalDays: newUser.goalDays },
  });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();
  const account = users.find((user) => user.email === normalizedEmail);
  if (!account) {
    return res.status(404).json({ error: 'No account found for that email.' });
  }

  const passwordMatches = bcrypt.compareSync(password, account.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  res.json({
    message: 'Login successful.',
    user: { id: account.id, name: account.name, email: account.email, goalDays: account.goalDays },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`SeedGuard backend listening on http://localhost:${PORT}`);
});

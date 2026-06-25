const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'flexdev-secret-key-2026';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Simple "DB" using JSON files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadData(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(file, data) {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

let users = loadData('users.json');
let threads = loadData('threads.json');
let posts = loadData('posts.json');
let resources = loadData('resources.json');
let readingHistory = loadData('history.json');

// VAPID keys for push (demo)
webpush.setVapidDetails(
  'mailto:admin@flexdev.ru',
  'BN...demo-public-key', // Replace with real in prod
  'demo-private-key'
);

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    user: getCurrentUser(req),
    timer: getHolidayTimer(),
    threads: threads.slice(0, 10)
  });
});

app.get('/forum', (req, res) => {
  res.render('forum', { user: getCurrentUser(req), threads });
});

app.get('/resources', (req, res) => {
  res.render('resources', { user: getCurrentUser(req), resources });
});

app.get('/thread/:id', (req, res) => {
  const thread = threads.find(t => t.id === parseInt(req.params.id));
  if (!thread) return res.status(404).send('Not found');
  const threadPosts = posts.filter(p => p.threadId === thread.id);
  res.render('thread', { user: getCurrentUser(req), thread, posts: threadPosts });
});

app.get('/profile/:username', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).send('Not found');
  res.render('profile', { user: getCurrentUser(req), profileUser: user });
});

// Auth routes
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '7d' });
    res.cookie('token', token);
    res.redirect('/');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/register', (req, res) => res.render('register'));
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (users.find(u => u.username === username)) return res.send('User exists');
  const hashed = bcrypt.hashSync(password, 10);
  const newUser = { id: users.length + 1, username, password: hashed, email, avatar: '/images/default.png', joined: new Date().toISOString() };
  users.push(newUser);
  saveData('users.json', users);
  res.redirect('/login');
});

// Parser cron - every 7 hours
cron.schedule('0 */7 * * *', async () => {
  console.log('Running parser...');
  await parseITNews();
  await parseResources();
});

async function parseITNews() {
  try {
    // Example sources
    const sources = [
      'https://habr.com/ru/news/',
      'https://www.cyber.sports.ru/' // etc
    ];
    for (let source of sources) {
      const response = await axios.get(source);
      const $ = cheerio.load(response.data);
      // Extract articles (simplified)
      $('.tm-article-snippet').each((i, el) => {
        const title = $(el).find('.tm-title__link').text().trim();
        const link = $(el).find('a').attr('href');
        if (title && !threads.some(t => t.title === title)) {
          const newThread = {
            id: threads.length + 1,
            title,
            author: 'Parser',
            date: new Date().toISOString(),
            category: 'Новости',
            content: `Parsed from ${source}. Full: ${link}`,
            views: Math.floor(Math.random() * 1000)
          };
          threads.push(newThread);
          saveData('threads.json', threads);
          
          // Add sample post
          posts.push({
            id: posts.length + 1,
            threadId: newThread.id,
            author: 'Parser',
            content: newThread.content,
            date: new Date().toISOString()
          });
          saveData('posts.json', posts);
        }
      });
    }
  } catch (e) {
    console.error('Parser error', e.message);
  }
}

async function parseResources() {
  try {
    // Simulate parsing prohub or similar
    const newRes = {
      id: resources.length + 1,
      title: 'New Resource ' + (resources.length + 1),
      description: 'Parsed resource from external',
      link: 'https://example.com',
      date: new Date().toISOString()
    };
    resources.push(newRes);
    saveData('resources.json', resources);
  } catch (e) {}
}

function getCurrentUser(req) {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return users.find(u => u.username === decoded.username);
  } catch {
    return null;
  }
}

function getHolidayTimer() {
  // Simple holiday timer logic - to next summer/winter
  const now = new Date();
  const year = now.getFullYear();
  let target;
  if (now.getMonth() < 5) { // Before June
    target = new Date(year, 5, 1); // June 1
  } else {
    target = new Date(year + 1, 11, 21); // Dec 21 next year for winter
  }
  const diff = target - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${days}d ${hours}ч ${mins}м ${secs}с`;
}

// API for JS
app.get('/api/threads', (req, res) => res.json(threads));
app.post('/api/post', (req, res) => {
  // Simplified
  const { threadId, content } = req.body;
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({error: 'Unauthorized'});
  posts.push({
    id: posts.length + 1,
    threadId,
    author: user.username,
    content,
    date: new Date().toISOString()
  });
  saveData('posts.json', posts);
  res.json({success: true});
});

// Start
app.listen(PORT, () => {
  console.log(`FLEXDEV Forum running on http://localhost:${PORT}`);
  // Initial parse
  parseITNews();
  parseResources();
});

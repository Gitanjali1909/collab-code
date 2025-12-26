require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const { authMiddleware } = require('./auth');
const Project = require('./models/project');

const app = express();
const server = http.createServer(app);

/* -------------------- SOCKET.IO -------------------- */
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json({ limit: '5mb' }));
app.use(cors());
app.use(helmet());

/* -------------------- MONGO -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ Mongo connection failed:', err);
    process.exit(1);
  });

/* -------------------- REST API -------------------- */

// Create project
app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const project = await Project.create({
      owner: req.user.id,
      title: req.body.title || 'Untitled Project',
      content: ''
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Load project
app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    res.status(400).json({ error: 'Invalid project ID' });
  }
});

// Manual save
app.post('/api/projects/:id/save', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        content: req.body.content,
        updatedAt: Date.now()
      },
      { new: true }
    );

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Save failed' });
  }
});

/* -------------------- REALTIME (Socket.IO) -------------------- */

const saveBuffer = {}; // projectId -> latest content

io.on('connection', socket => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join', ({ projectId }) => {
    if (!projectId) return;
    socket.join(projectId);
    socket.projectId = projectId;
  });

  // Broadcast CRDT updates
  socket.on('update', ({ projectId, delta, content }) => {
    if (!projectId) return;

    socket.to(projectId).emit('update', { delta });

    if (typeof content === 'string') {
      saveBuffer[projectId] = content;
    }
  });

  // Cursor presence
  socket.on('cursor', ({ projectId, cursor }) => {
    if (!projectId) return;

    socket.to(projectId).emit('cursor', {
      socketId: socket.id,
      cursor
    });
  });

  // Manual save
  socket.on('save', async ({ projectId, content }) => {
    if (!projectId || typeof content !== 'string') return;

    await Project.findByIdAndUpdate(projectId, {
      content,
      updatedAt: Date.now()
    });

    socket.to(projectId).emit('saved', { by: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

/* -------------------- AUTOSAVE -------------------- */

setInterval(async () => {
  const entries = Object.entries(saveBuffer);
  if (!entries.length) return;

  for (const [projectId, content] of entries) {
    await Project.findByIdAndUpdate(projectId, {
      content,
      updatedAt: Date.now()
    });
  }

  Object.keys(saveBuffer).forEach(k => delete saveBuffer[k]);
}, 5000);

/* -------------------- START SERVER -------------------- */

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const { authMiddleware } = require('./auth');
const Project = require('./models/project.js');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
  console.log('Mongo connected');
});
mongoose.connection.on('error', err => {
  console.error('Mongo error', err);
});

// REST: create/load/save project
app.post('/api/projects', authMiddleware, async (req, res) => {
  const p = await Project.create({
    owner: req.user.id,
    title: req.body.title
  });
  res.json(p);
});

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  const p = await Project.findById(req.params.id);
  res.json(p);
});

app.post('/api/projects/:id/save', authMiddleware, async (req, res) => {
  const p = await Project.findByIdAndUpdate(
    req.params.id,
    {
      content: req.body.content,
      updatedAt: Date.now()
    },
    { new: true }
  );
  res.json(p);
});

// WebSockets: realtime collab
io.on('connection', socket => {

  // Join room
  socket.on('join', ({ projectId }) => {
    socket.join(projectId);
    socket.projectId = projectId;
  });

  // CRDT / delta updates
  socket.on('update', ({ projectId, delta }) => {
    socket.to(projectId).emit('update', { delta });
  });

  // Cursor / presence
  socket.on('cursor', ({ projectId, cursor }) => {
    socket.to(projectId).emit('cursor', {
      socketId: socket.id,
      cursor
    });
  });

  // User requested save
  socket.on('save', async ({ projectId, content }) => {
    await Project.findByIdAndUpdate(projectId, {
      content,
      updatedAt: Date.now()
    });

    socket.to(projectId).emit('saved', { by: socket.id });
  });
});

// Optional autosave buffer (light)
let saveBuffer = {};

setInterval(async () => {
  for (const projectId in saveBuffer) {
    const content = saveBuffer[projectId];
    await Project.findByIdAndUpdate(projectId, {
      content,
      updatedAt: Date.now()
    });
  }
  saveBuffer = {};
}, 5000);

// Start server
server.listen(process.env.PORT, () =>
  console.log('listening', process.env.PORT)
);

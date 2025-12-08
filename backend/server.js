require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { authMiddleware } = require('./auth');
const Project = require('./models/project.js');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

app.use(express.json());

// connect
mongoose.connect(process.env.MONGO_URI);

// REST: create/load/save project
app.post('/api/projects', authMiddleware, async (req,res)=>{
  const p = await Project.create({ owner: req.user.id, title: req.body.title });
  res.json(p);
});
app.get('/api/projects/:id', authMiddleware, async (req,res)=>{
  const p = await Project.findById(req.params.id);
  res.json(p);
});
app.post('/api/projects/:id/save', authMiddleware, async (req,res)=>{
  const p = await Project.findByIdAndUpdate(req.params.id, { content: req.body.content, updatedAt: Date.now() }, {new:true});
  res.json(p);
});

// simple socket.io for cursors/awareness and patch relay
io.on('connection', socket=>{
  // join document room
  socket.on('join', ({projectId, token})=>{
    socket.join(projectId);
    socket.projectId = projectId;
  });

  // relay CRDT updates (client will send deltas)
  socket.on('update', ({projectId, delta})=>{
    // broadcast to others
    socket.to(projectId).emit('update', {delta});
    // optional: buffer + periodic save to DB
  });

  socket.on('cursor', ({projectId, cursor})=>{
    socket.to(projectId).emit('cursor', {socketId: socket.id, cursor});
  });

  socket.on('save', async ({projectId, content})=>{
    await Project.findByIdAndUpdate(projectId, { content, updatedAt: Date.now() });
    socket.to(projectId).emit('saved', {by: socket.id});
  });
});

server.listen(process.env.PORT, ()=> console.log('listening', process.env.PORT));

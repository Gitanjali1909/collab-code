const mongoose = require('mongoose');
const ProjectSchema = new mongoose.Schema({
  owner: {type: mongoose.Types.ObjectId, ref:'User'},
  title: String,
  collaborators: [{type: mongoose.Types.ObjectId, ref:'User'}],
  // store latest document state (optional): could be CRDT binary or plain text
  content: { type: String, default: '' },
  updatedAt: {type:Date, default:Date.now},
});
module.exports = mongoose.model('Project', ProjectSchema);

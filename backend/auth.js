const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/user.js');

async function register({name,email,password}) {
  const hash = await bcrypt.hash(password,10);
  const user = await User.create({name,email,passwordHash:hash});
  const token = jwt.sign({id:user._id}, process.env.JWT_SECRET, {expiresIn:'7d'});
  return {user,token};
}
async function login({email,password}) {
  const user = await User.findOne({email});
  if(!user) throw Error('no user');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) throw Error('bad creds');
  const token = jwt.sign({id:user._id}, process.env.JWT_SECRET, {expiresIn:'7d'});
  return {user,token};
}
function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).send('no auth');
  const token = h.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(e){ res.status(401).send('invalid'); }
}
module.exports = { register, login, authMiddleware };

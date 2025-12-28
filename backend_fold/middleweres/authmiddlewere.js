const jwt = require("jsonwebtoken")
const User = require('../models/user')


exports.authMiddlewere = async(req, res, next)=>{
  // Accept token via cookie OR Authorization header (Bearer)
  let token = req.cookies?.token
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if(!token){
    return res.status(401).json({message:"Not authorized - token missing"})
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET || process.env.JWT_SECRET)
    if(decoded && decoded.id){
      req.user = { id: decoded.id, role: decoded.role }
      // update lastActive timestamp (non-blocking)
      try {
        User.findByIdAndUpdate(decoded.id, { lastActive: Date.now() }).exec()
      } catch (e) {
        // ignore
      }
    } else {
      return res.status(401).json({message:"Not authorized - invalid token"})
    }
    next()
  } catch (error) {
    console.log('authMiddlewere error', error)
    res.status(401).json({message:error.message})
  }
}

// middleware/auth.js (or middlewares/authMiddleware.js)


// middlewares/authMiddleware.js (protect route)
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await User.findById(decoded.id).select('-password');
    if (!userDoc) return res.status(401).json({ message: 'User not found' });

    // update lastActive and attach user to req
    try {
      userDoc.lastActive = new Date()
      await userDoc.save()
    } catch (e) {
      // non-fatal
      console.warn('Could not update lastActive', e && e.message)
    }

    req.user = userDoc
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};
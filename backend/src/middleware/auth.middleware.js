const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

async function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = await UserModel.findById(payload.id);
    if (!user)                   return res.status(401).json({ success: false, message: 'User no longer exists.' });
    if (user.status === 'inactive') return res.status(403).json({ success: false, message: 'Account is inactive.' });
    const { password, ...safe } = user;
    req.user = safe;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    res.status(401).json({ success: false, message: msg });
  }
}

module.exports = { authenticate };

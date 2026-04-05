const HIERARCHY = { admin: 3, analyst: 2, viewer: 1 };

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required: ${roles.join(' | ')}. Yours: ${req.user?.role}.`,
      });
    }
    next();
  };
}

function atLeast(minRole) {
  return (req, res, next) => {
    if ((HIERARCHY[req.user?.role] || 0) < (HIERARCHY[minRole] || 0)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role: ${minRole}. Yours: ${req.user?.role}.`,
      });
    }
    next();
  };
}

module.exports = { authorize, atLeast };

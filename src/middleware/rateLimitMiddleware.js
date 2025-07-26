const rateLimit = require("express-rate-limit");

// Middleware custom: bypass untuk role tertentu
function isPrivilegedUser(req) {
  // Bypass untuk role owner, admin
  const allowedRoles = ["owner", "admin"];
  return allowedRoles.includes(req.user?.role);
}

const createPostRateLimiter = rateLimit({
  windowMs: 2 * 24 * 60 * 60 * 1000, // 2 hari
  max: 15, // 15 request per 2 hari per user/IP
  message: {
    success: false,
    error: "Terlalu banyak request, coba lagi nanti.",
  },
  keyGenerator: (req) => {
    // Jika user login, gunakan userId, jika tidak pakai IP
    return req.user?.userId || req.ip;
  },
  skip: (req) => {
    // Bypass untuk role owner, admin, mod
    const allowedRoles = ["owner", "admin"];
    return allowedRoles.includes(req.user?.role);
  },
});

module.exports = { createPostRateLimiter };

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

// Rate limiter untuk create payment - ban 2 hari jika terlalu sering
const createPaymentRateLimiter = rateLimit({
  windowMs: 2 * 24 * 60 * 60 * 1000, // 2 hari
  max: 15, // 15 request per 2 hari per user
  message: {
    success: false,
    error: "Terlalu banyak request pembayaran, akun dibanned 2 hari.",
  },
  keyGenerator: (req) => {
    // Gunakan userId untuk tracking yang lebih akurat
    return req.user?.userId || req.ip;
  },
  skip: (req) => {
    // Bypass untuk role owner, admin
    const allowedRoles = ["owner", "admin"];
    return allowedRoles.includes(req.user?.role);
  },
  // Handler untuk ketika limit tercapai
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Akun dibanned 2 hari karena terlalu banyak request pembayaran.",
      banned: true,
      bannedUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
  },
});

module.exports = { createPostRateLimiter, createPaymentRateLimiter };

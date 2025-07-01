// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./src/config/passportConfig");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "https://lost-media.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Role"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Express Auth Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth routes: http://localhost:${PORT}/auth`);
});

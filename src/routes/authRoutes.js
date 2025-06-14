// routes/authRoutes.js
const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};

// ===============================
// NEXTAUTH INTEGRATION ROUTES
// ===============================

// Handle NextAuth Google sign-in
router.post("/signin-google", async (req, res) => {
  try {
    const { googleId, email, image, name } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Check if user already exists with this Google ID
    let existingUser = await prisma.user.findUnique({
      where: { googleId: googleId },
    });

    if (existingUser) {
      return res.json({
        success: true,
        user: {
          userId: existingUser.userId,
          googleId: existingUser.googleId,
          username: existingUser.username,
          email: existingUser.email,
          profilePic: existingUser.profilePic,
          bio: existingUser.bio,
          createdAt: existingUser.createdAt,
          followersCount: existingUser.followersCount,
          followingCount: existingUser.followingCount,
        },
      });
    }

    // Check if user exists with this email
    existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      // Update existing user with Google ID
      const updatedUser = await prisma.user.update({
        where: { userId: existingUser.userId },
        data: {
          googleId: googleId,
          profilePic: image || existingUser.profilePic,
        },
      });

      return res.json({
        success: true,
        user: {
          userId: updatedUser.userId,
          googleId: updatedUser.googleId,
          username: updatedUser.username,
          email: updatedUser.email,
          profilePic: updatedUser.profilePic,
          bio: updatedUser.bio,
          createdAt: updatedUser.createdAt,
          followersCount: updatedUser.followersCount,
          followingCount: updatedUser.followingCount,
        },
      });
    }

    // Create new user with display name as username
    const cleanUsername = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 20); // Limit to 20 characters
    const newUser = await prisma.user.create({
      data: {
        googleId: googleId,
        username: cleanUsername,
        email: email,
        profilePic: image || null,
        bio: null,
        followersCount: 0,
        followingCount: 0,
      },
    });

    res.json({
      success: true,
      user: {
        userId: newUser.userId,
        googleId: newUser.googleId,
        username: newUser.username,
        email: newUser.email,
        profilePic: newUser.profilePic,
        bio: newUser.bio,
        createdAt: newUser.createdAt,
        followersCount: newUser.followersCount,
        followingCount: newUser.followingCount,
      },
    });
  } catch (error) {
    console.error("Error in signin-google:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// NEW: Create JWT session for NextAuth integration
router.post("/create-session", authController.createSession);

// ===============================
// TRADITIONAL PASSPORT ROUTES
// ===============================

// Google OAuth routes (untuk traditional flow)
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_URL + "/login?error=auth_failed",
  }),
  (req, res) => {
    // Successful authentication, redirect to client
    res.redirect(process.env.CLIENT_URL);
  }
);

// ===============================
// SHARED ROUTES
// ===============================

// Auth status and profile routes
router.get("/profile", isAuthenticated, authController.getProfile);
router.put("/profile", isAuthenticated, authController.updateProfile);

// Token routes for NextAuth integration
router.get("/token", isAuthenticated, authController.generateToken);
router.post("/verify-token", authController.verifyToken);

// Logout route
router.post("/logout", authController.logout);

// Check auth status
router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        userId: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        profilePic: req.user.profilePic,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;

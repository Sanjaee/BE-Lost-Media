// routes/authRoutes.js
const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");
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
      select: {
        userId: true,
        googleId: true,
        username: true,
        email: true,
        profilePic: true,
        bio: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        role: true,
        star: true,
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
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
          role: existingUser.role,
          star: existingUser.star,
          posts: existingUser.posts,
        },
      });
    }

    // Check if user exists with this email
    existingUser = await prisma.user.findUnique({
      where: { email: email },
      select: {
        userId: true,
        googleId: true,
        username: true,
        email: true,
        profilePic: true,
        bio: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        role: true,
        star: true,
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (existingUser) {
      // Update existing user with Google ID
      const updatedUser = await prisma.user.update({
        where: { userId: existingUser.userId },
        data: {
          googleId: googleId,
          profilePic: image || existingUser.profilePic,
        },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          profilePic: true,
          bio: true,
          createdAt: true,
          followersCount: true,
          followingCount: true,
          role: true,
          star: true,
          posts: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
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
          role: updatedUser.role,
          star: updatedUser.star,
          posts: updatedUser.posts,
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
        role: "member",
        star: 0,
      },
      select: {
        userId: true,
        googleId: true,
        username: true,
        email: true,
        profilePic: true,
        bio: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        role: true,
        star: true,
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
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
        role: newUser.role,
        star: newUser.star,
        posts: newUser.posts,
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
    scope: ["email"],
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
router.get("/profile/:userId", authController.getProfileById);
router.put("/profile", authMiddleware, authController.updateProfile);

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

// Debug endpoint to check user data
router.get("/debug/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        googleId: true,
        username: true,
        email: true,
        profilePic: true,
        bio: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        role: true,
        star: true,
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user,
      debug: {
        hasRole: !!user.role,
        hasStar: user.star !== null,
        hasPosts: Array.isArray(user.posts),
        postsCount: user.posts?.length || 0,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Debug endpoint to check all users and their roles
router.get("/debug/users", async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const users = await prisma.user.findMany({
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        star: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      users,
      summary: {
        totalUsers: users.length,
        roles: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
        usersWithNullRole: users.filter((u) => !u.role).length,
        usersWithNullStar: users.filter((u) => u.star === null).length,
      },
    });
  } catch (error) {
    console.error("Debug users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fix users with missing role or star
router.post("/debug/fix-users", async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Find users with missing role or star
    const usersToFix = await prisma.user.findMany({
      where: {
        OR: [{ role: null }, { role: "" }, { star: null }],
      },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        star: true,
      },
    });

    // Update users with missing role or star
    const updatePromises = usersToFix.map((user) =>
      prisma.user.update({
        where: { userId: user.userId },
        data: {
          role: user.role || "member",
          star: user.star !== null ? user.star : 0,
        },
      })
    );

    const updatedUsers = await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Fixed ${updatedUsers.length} users`,
      fixedUsers: updatedUsers.map((u) => ({
        userId: u.userId,
        username: u.username,
        role: u.role,
        star: u.star,
      })),
    });
  } catch (error) {
    console.error("Fix users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all staff users (owner, admin, mod) - protected
router.get("/staff/users", authMiddleware, authController.getAllStaffUsers);
// Update user role (protected)
router.put("/staff/users/role", authMiddleware, authController.updateRole);
// Update user star (protected)
router.put("/staff/users/star", authMiddleware, authController.updateStar);
// Get user star by id (protected)
router.get(
  "/staff/users/:userId/star",
  authMiddleware,
  authController.getStarById
);

module.exports = router;

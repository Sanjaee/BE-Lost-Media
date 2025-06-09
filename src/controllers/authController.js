// controllers/authController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const authController = {
  // Get current user profile
  getProfile: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await prisma.user.findUnique({
        where: { userId: req.user.userId },
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
          posts: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { bio, username } = req.body;

      if (username && username !== req.user.username) {
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser) {
          return res.status(400).json({ error: "Username already taken" });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { userId: req.user.userId },
        data: {
          ...(bio !== undefined && { bio }),
          ...(username && { username }),
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
          posts: true,
        },
      });

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Create JWT session - NEW ENDPOINT
  createSession: async (req, res) => {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: "UserId and email required" });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          email: true,
          username: true,
          profilePic: true,
        },
      });

      if (!user || user.email !== email) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          username: user.username,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      res.json({ 
        success: true, 
        token, 
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          profilePic: user.profilePic,
        }
      });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Generate JWT token for NextAuth integration
  generateToken: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const token = jwt.sign(
        {
          userId: req.user.userId,
          email: req.user.email,
          username: req.user.username,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      res.json({ token, user: req.user });
    } catch (error) {
      console.error("Error generating token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Verify JWT token - Updated to handle both JWT and user object
  verifyToken: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token required" });
      }

      // Try JWT verification first
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );

        const user = await prisma.user.findUnique({
          where: { userId: decoded.userId },
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
            posts: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!user) {
          return res.status(404).json({ error: "User not found", valid: false });
        }

        return res.json({ user, valid: true });
      } catch (jwtError) {
        // If JWT verification fails, try parsing as user object (fallback)
        try {
          const userData = JSON.parse(token);
          if (userData.userId) {
            const user = await prisma.user.findUnique({
              where: { userId: userData.userId },
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
                posts: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            });

            if (user) {
              return res.json({ user, valid: true });
            }
          }
        } catch (parseError) {
          // Both JWT and JSON parsing failed
        }
      }

      res.status(401).json({ error: "Invalid token", valid: false });
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(401).json({ error: "Invalid token", valid: false });
    }
  },

  // Logout
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  },
};

module.exports = authController;
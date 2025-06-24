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
          role: true,
          star: true,
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

  // Get user profile by user ID
  getProfileById: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await prisma.user.findUnique({
        where: { userId: userId },
        select: {
          userId: true,
          username: true,
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
            select: {
              postId: true,
              title: true,
              createdAt: true,
              commentsCount: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Error getting profile by ID:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { bio, username, profilePic } = req.body;

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
          ...(profilePic && { profilePic }),
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

      // Verify user exists with complete data
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          email: true,
          username: true,
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

      const responseData = {
        success: true,
        token,
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          profilePic: user.profilePic,
          bio: user.bio,
          createdAt: user.createdAt,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          role: user.role,
          star: user.star,
          posts: user.posts,
        },
      };

      res.json(responseData);
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
            role: true,
            star: true,
            posts: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });

        if (!user) {
          return res
            .status(404)
            .json({ error: "User not found", valid: false });
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
                role: true,
                star: true,
                posts: {
                  orderBy: { createdAt: "desc" },
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

  // Get all users with role owner, admin, or mod
  getAllStaffUsers: async (req, res) => {
    try {
      const staffUsers = await prisma.user.findMany({
        where: {
          role: {
            in: ["owner", "admin", "mod"],
          },
        },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          profilePic: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json({ success: true, users: staffUsers });
    } catch (error) {
      console.error("Error getting staff users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update user role
  updateRole: async (req, res) => {
    try {
      // Allow if requester is owner (from JWT or from body.currentRole)
      const roleFromJwt = req.user && req.user.role;
      const roleFromBody = req.body.currentRole;
      if (roleFromJwt !== "owner" && roleFromBody !== "owner") {
        return res
          .status(403)
          .json({ error: "Forbidden: Only owner can update roles" });
      }
      const { userId, role } = req.body;
      console.log(
        "Updating role for user:",
        userId,
        "to:",
        role,
        "by:",
        roleFromJwt || roleFromBody
      );
      const allowedRoles = ["owner", "admin", "mod", "god", "vip", "member"];
      if (!userId || !role) {
        return res.status(400).json({ error: "UserId and role are required" });
      }
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: { role },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          profilePic: true,
          createdAt: true,
        },
      });
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = authController;

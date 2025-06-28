// controllers/authController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const notificationController = require("./notificationController");

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
          isBanned: true,
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
          isBanned: true,
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
            isBanned: true,
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
                isBanned: true,
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
      const allowedRoles = ["owner", "admin", "mod"];
      // Ambil role dari header jika ada, fallback ke req.user.role
      const requesterRole = req.headers["x-user-role"] || req.user.role;
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }
      // Only fetch users with staff roles
      const users = await prisma.user.findMany({
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
      res.json({ success: true, users, currentUserRole: requesterRole });
    } catch (error) {
      console.error("Error getting all staff users:", error);
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
      const allowedRoles = ["owner", "admin", "mod", "god", "vip", "member"];
      if (!userId || !role) {
        return res.status(400).json({ error: "UserId and role are required" });
      }
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Get current user data to check if role is being promoted
      const currentUser = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          username: true,
          role: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Define role hierarchy for promotion detection
      const roleHierarchy = {
        member: 1,
        vip: 2,
        god: 3,
        mod: 4,
        admin: 5,
        owner: 6,
      };

      const isPromotion = roleHierarchy[role] > roleHierarchy[currentUser.role];

      // Update the user's role
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

      // Send notification if role is being promoted
      let notificationSent = false;
      if (isPromotion) {
        try {
          const promoterUserId = req.user?.userId;
          const promoterRole = req.user?.role || "owner";

          await prisma.notification.create({
            data: {
              userId: userId,
              actorId: promoterUserId,
              type: "role_promoted",
              content: `Selamat! Role Anda telah dinaikkan menjadi ${role} oleh ${promoterRole}.`,
              actionUrl: `/profile/${userId}`,
            },
          });
          notificationSent = true;
        } catch (notificationError) {
          console.error(
            "Error creating role promotion notification:",
            notificationError
          );
          // Don't fail the main operation if notification fails
        }
      }

      res.json({
        success: true,
        user: updatedUser,
        notificationSent,
        isPromotion,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update user star (hanya untuk owner, admin, mod)
  updateStar: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      // Ambil role dari header jika ada, fallback ke req.user.role
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can update star" });
      }
      const { userId, star } = req.body;
      if (!userId || typeof star !== "number") {
        return res
          .status(400)
          .json({ error: "UserId and star (number) are required" });
      }
      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: { star },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          star: true,
          profilePic: true,
          createdAt: true,
        },
      });
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user star:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get star by userId (hanya untuk owner, admin, mod)
  getStarById: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "UserId is required" });
      }
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { star: true },
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, star: user.star });
    } catch (error) {
      console.error("Error getting user star:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Search all users with pagination and filtering
  searchAllUsers: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole = req.headers["x-user-role"] || req.user?.role;

      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const {
        search = "",
        page = 1,
        limit = 20,
        role = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause for filtering
      const whereClause = {
        AND: [],
      };

      // Add search filter
      if (search && search.trim()) {
        whereClause.AND.push({
          OR: [
            {
              username: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
          ],
        });
      }

      // Add role filter
      if (role && role.trim() && role !== "all") {
        if (role === "banned") {
          whereClause.AND.push({
            isBanned: true,
          });
        } else {
          whereClause.AND.push({
            role: role.trim(),
          });
        }
      }

      // Remove empty AND array if no filters
      if (whereClause.AND.length === 0) {
        delete whereClause.AND;
      }

      // Validate sort fields
      const allowedSortFields = [
        "username",
        "email",
        "role",
        "createdAt",
        "star",
      ];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

      // Get total count for pagination
      const totalCount = await prisma.user.count({
        where: whereClause.AND?.length > 0 ? whereClause : {},
      });

      // Get users with pagination
      const users = await prisma.user.findMany({
        where: whereClause.AND?.length > 0 ? whereClause : {},
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          profilePic: true,
          createdAt: true,
          star: true,
          isBanned: true,
        },
        orderBy: {
          [validSortBy]: validSortOrder,
        },
        skip: offset,
        take: limitNum,
      });

      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        success: true,
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        currentUserRole: requesterRole,
      });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Ban user (only for owner, admin, mod)
  banUser: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole = req.headers["x-user-role"] || req.user?.role;

      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to ban users.",
        });
      }

      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      // Check if user exists and get current data
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          username: true,
          role: true,
          isBanned: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prevent banning users with higher or equal roles
      const roleHierarchy = {
        member: 1,
        vip: 2,
        god: 3,
        mod: 4,
        admin: 5,
        owner: 6,
      };

      const requesterRoleLevel = roleHierarchy[requesterRole] || 0;
      const targetRoleLevel = roleHierarchy[user.role] || 0;

      if (targetRoleLevel >= requesterRoleLevel) {
        return res.status(403).json({
          success: false,
          message: "You cannot ban users with equal or higher role than yours.",
        });
      }

      if (user.isBanned) {
        return res.status(400).json({
          success: false,
          message: "User is already banned",
        });
      }

      // Ban the user and send notification in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update user to banned
        const updatedUser = await tx.user.update({
          where: { userId },
          data: { isBanned: true },
          select: {
            userId: true,
            username: true,
            email: true,
            role: true,
            isBanned: true,
            profilePic: true,
            createdAt: true,
          },
        });

        // Create notification for the banned user
        const notification = await tx.notification.create({
          data: {
            userId: userId,
            actorId: req.user.userId,
            type: "account_banned",
            content: `Akun Anda telah dibanned oleh ${requesterRole}${
              reason ? ` karena: ${reason}` : ""
            }.`,
            actionUrl: `/profile/${userId}`,
          },
        });

        return { updatedUser, notification };
      });

      res.status(200).json({
        success: true,
        message: `User ${user.username} has been banned successfully`,
        data: result.updatedUser,
        notificationSent: true,
        reason: reason || null,
      });
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to ban user",
        error: error.message,
      });
    }
  },

  // Unban user (only for owner, admin, mod)
  unbanUser: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole = req.headers["x-user-role"] || req.user?.role;

      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to unban users.",
        });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      // Check if user exists and get current data
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          username: true,
          role: true,
          isBanned: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.isBanned) {
        return res.status(400).json({
          success: false,
          message: "User is not banned",
        });
      }

      // Unban the user
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: { isBanned: false },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          profilePic: true,
          createdAt: true,
        },
      });

      res.status(200).json({
        success: true,
        message: `User ${user.username} has been unbanned successfully`,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error unbanning user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to unban user",
        error: error.message,
      });
    }
  },
};

module.exports = authController;

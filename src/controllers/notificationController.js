const prisma = require("../utils/prisma");

module.exports = {
  // Buat notifikasi publik (untuk semua user, userId: null)
  createPublicNotification: async (req, res) => {
    try {
      // Ambil userId admin dari JWT (middleware harus set req.user)
      const actorId = req.user.userId;
      const { type, content, actionUrl } = req.body;
      const notif = await prisma.notification.create({
        data: {
          userId: null, // notifikasi publik
          actorId,
          type,
          content,
          actionUrl,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.json({
        success: true,
        message: "Public notification created",
        notification: notif,
      });
    } catch (error) {
      console.error("Error creating public notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Buat notifikasi untuk user tertentu
  createUserNotification: async (req, res) => {
    try {
      const actorId = req.user.userId;
      const { userId, type, content, actionUrl } = req.body;
      await prisma.notification.create({
        data: { userId, actorId, type, content, actionUrl },
      });
      res.json({ success: true, message: "Notification sent to user" });
    } catch (error) {
      console.error("Error creating user notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Ambil notifikasi publik (userId: null)
  getPublicNotifications: async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: null },
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.json({ notifications });
    } catch (error) {
      console.error("Error getting public notifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Ambil notifikasi milik user tertentu
  getUserNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.json({ notifications });
    } catch (error) {
      console.error("Error getting user notifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update status isRead untuk notifikasi tertentu
  markNotificationAsRead: async (req, res) => {
    try {
      const { notifId } = req.params;
      const updatedNotification = await prisma.notification.update({
        where: { notifId },
        data: { isRead: true },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.json({
        success: true,
        message: "Notification marked as read",
        notification: updatedNotification,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Mark semua notifikasi user sebagai read
  markAllUserNotificationsAsRead: async (req, res) => {
    try {
      const { userId } = req.params;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get count notifikasi yang belum dibaca untuk user tertentu
  getUnreadNotificationCount: async (req, res) => {
    try {
      const { userId } = req.params;
      const count = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get count notifikasi publik yang belum dibaca (untuk localStorage)
  getUnreadPublicNotificationCount: async (req, res) => {
    try {
      const count = await prisma.notification.count({
        where: { userId: null, isRead: false },
      });
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread public notification count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Create notification for post approval
  createPostApprovalNotification: async (
    postId,
    postTitle,
    authorUserId,
    approverUserId,
    approverRole
  ) => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: authorUserId,
          actorId: approverUserId,
          type: "post_approved",
          content: `Post "${postTitle}" telah disetujui dan dipublikasikan oleh ${approverRole}.`,
          actionUrl: `/share/${postId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating post approval notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Create notification for post deletion
  createPostDeletionNotification: async (
    postId,
    postTitle,
    authorUserId,
    deleterUserId,
    deleterRole
  ) => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: authorUserId,
          actorId: deleterUserId,
          type: "post_deleted",
          content: `Post "${postTitle}" telah dihapus oleh ${deleterRole}.`,
          actionUrl: `/profile/${authorUserId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating post deletion notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Create notification for post force deletion
  createPostForceDeletionNotification: async (
    postId,
    postTitle,
    authorUserId,
    deleterUserId,
    deleterRole
  ) => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: authorUserId,
          actorId: deleterUserId,
          type: "post_force_deleted",
          content: `Post "${postTitle}" telah dihapus paksa oleh ${deleterRole} karena tidak memenuhi standar.`,
          actionUrl: `/profile/${authorUserId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating post force deletion notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Create notification for role promotion
  createRolePromotionNotification: async (
    userId,
    username,
    newRole,
    promoterUserId,
    promoterRole
  ) => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: userId,
          actorId: promoterUserId,
          type: "role_promoted",
          content: `Selamat! Role Anda telah dinaikkan menjadi ${newRole} oleh ${promoterRole}.`,
          actionUrl: `/profile/${userId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating role promotion notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Create notification for account ban
  createAccountBanNotification: async (
    userId,
    username,
    bannerUserId,
    bannerRole,
    reason = ""
  ) => {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: userId,
          actorId: bannerUserId,
          type: "account_banned",
          content: `Akun Anda telah dibanned oleh ${bannerRole}${
            reason ? ` karena: ${reason}` : ""
          }.`,
          actionUrl: `/profile/${userId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating account ban notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Get notifications by type for a specific user
  getUserNotificationsByType: async (req, res) => {
    try {
      const { userId, type } = req.params;
      const notifications = await prisma.notification.findMany({
        where: { userId, type },
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.json({ notifications });
    } catch (error) {
      console.error("Error getting user notifications by type:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  createCommentNotification: async (
    postId,
    postTitle,
    postOwnerId,
    commenterId,
    commenterUsername
  ) => {
    try {
      if (postOwnerId === commenterId)
        return { success: false, message: "No self notification" };
      const notification = await prisma.notification.create({
        data: {
          userId: postOwnerId,
          actorId: commenterId,
          type: "comment",
          content: `@${commenterUsername} mengomentari postingan Anda: "${postTitle}"`,
          actionUrl: `/share/${postId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating comment notification:", error);
      return { success: false, error: error.message };
    }
  },

  createReplyNotification: async (
    postId,
    postTitle,
    parentCommentAuthorId,
    replierId,
    replierUsername
  ) => {
    try {
      if (parentCommentAuthorId === replierId)
        return { success: false, message: "No self notification" };
      const notification = await prisma.notification.create({
        data: {
          userId: parentCommentAuthorId,
          actorId: replierId,
          type: "reply",
          content: `@${replierUsername} membalas komentar Anda di postingan: "${postTitle}"`,
          actionUrl: `/share/${postId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating reply notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete all notifications for the logged-in user (self only)
  deleteAllUserNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      // Hanya izinkan jika user yang login sama dengan userId di params
      if (req.user.userId !== userId) {
        return res.status(403).json({
          error: "Forbidden: You can only delete your own notifications",
        });
      }
      await prisma.notification.deleteMany({ where: { userId } });
      res.json({
        success: true,
        message: "All notifications deleted for user",
      });
    } catch (error) {
      console.error("Error deleting all notifications for user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Create notification for successful role purchase
  createRolePurchaseNotification: async (
    userId,
    username,
    roleName,
    amount,
    orderId = null
  ) => {
    try {
      // Check if notification already exists for this payment
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: userId,
          type: "role_purchased",
          content: {
            contains: `Pembelian role ${roleName} berhasil`,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
      });

      if (existingNotification) {
        console.log(
          `Role purchase notification already exists for user ${userId}, role ${roleName}`
        );
        return { success: false, message: "Notification already exists" };
      }

      const notification = await prisma.notification.create({
        data: {
          userId: userId,
          actorId: userId, // Self notification
          type: "role_purchased",
          content: `Selamat! Pembelian role ${roleName} berhasil. Anda telah membayar Rp ${amount.toLocaleString(
            "id-ID"
          )}.${orderId ? ` (Order: ${orderId})` : ""}`,
          actionUrl: `/profile/${userId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      console.log(
        `Role purchase notification created for user ${userId}, role ${roleName}`
      );
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating role purchase notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Create notification for successful star upgrade
  createStarUpgradeNotification: async (
    userId,
    username,
    newStar,
    amount,
    orderId = null
  ) => {
    try {
      // Check if notification already exists for this payment
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: userId,
          type: "star_upgraded",
          content: {
            contains: `Upgrade star ke level ${newStar} berhasil`,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
      });

      if (existingNotification) {
        console.log(
          `Star upgrade notification already exists for user ${userId}, star ${newStar}`
        );
        return { success: false, message: "Notification already exists" };
      }

      const notification = await prisma.notification.create({
        data: {
          userId: userId,
          actorId: userId, // Self notification
          type: "star_upgraded",
          content: `Selamat! Upgrade star ke level ${newStar} berhasil. Anda telah membayar Rp ${amount.toLocaleString(
            "id-ID"
          )}.${orderId ? ` (Order: ${orderId})` : ""}`,
          actionUrl: `/profile/${userId}`,
        },
        include: {
          actor: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      console.log(
        `Star upgrade notification created for user ${userId}, star ${newStar}`
      );
      return { success: true, notification };
    } catch (error) {
      console.error("Error creating star upgrade notification:", error);
      return { success: false, error: error.message };
    }
  },

  // Helper function to check if payment notification exists
  checkPaymentNotificationExists: async (userId, type, orderId = null) => {
    try {
      const whereClause = {
        userId: userId,
        type: type,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
        },
      };

      // If orderId is provided, add it to the search
      if (orderId) {
        whereClause.content = {
          contains: orderId,
        };
      }

      const existingNotification = await prisma.notification.findFirst({
        where: whereClause,
      });

      return {
        exists: !!existingNotification,
        notification: existingNotification,
      };
    } catch (error) {
      console.error("Error checking payment notification:", error);
      return { exists: false, error: error.message };
    }
  },

  // Get payment notification status for debugging
  getPaymentNotificationStatus: async (req, res) => {
    try {
      const { userId, type, orderId } = req.query;

      if (!userId || !type) {
        return res.status(400).json({
          error: "userId and type are required",
        });
      }

      const status = await module.exports.checkPaymentNotificationExists(
        userId,
        type,
        orderId
      );

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("Error getting payment notification status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

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
};

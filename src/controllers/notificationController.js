const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
};

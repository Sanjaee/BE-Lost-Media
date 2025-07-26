const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Endpoint publik: ambil notifikasi publik (tanpa auth)
router.get("/public", notificationController.getPublicNotifications);

// Endpoint untuk count notifikasi publik yang belum dibaca (tanpa auth)
router.get(
  "/public/unread-count",
  notificationController.getUnreadPublicNotificationCount
);

// Endpoint di bawah ini pakai auth
router.use(authMiddleware);

// Buat notifikasi publik untuk semua user
router.post("/public", notificationController.createPublicNotification);
// Buat notifikasi untuk user tertentu
router.post("/user", notificationController.createUserNotification);
// Ambil notifikasi milik user tertentu
router.get("/user/:userId", notificationController.getUserNotifications);

// Mark notifikasi tertentu sebagai read
router.patch("/:notifId/read", notificationController.markNotificationAsRead);
// Mark semua notifikasi user sebagai read
router.patch(
  "/user/:userId/read-all",
  notificationController.markAllUserNotificationsAsRead
);
// Get count notifikasi yang belum dibaca untuk user tertentu
router.get(
  "/user/:userId/unread-count",
  notificationController.getUnreadNotificationCount
);

// Get notifications by type for a specific user
router.get(
  "/user/:userId/type/:type",
  notificationController.getUserNotificationsByType
);

// Delete all notifications for a specific user
router.delete(
  "/user/:userId/all",
  notificationController.deleteAllUserNotifications
);

// Payment success notifications (called by payment system)
router.post(
  "/payment/role-success",
  notificationController.createRolePurchaseNotification
);
router.post(
  "/payment/star-success",
  notificationController.createStarUpgradeNotification
);

// Test route for payment notifications (for testing purposes)
router.post("/test/payment-notifications", authMiddleware, async (req, res) => {
  try {
    const { type, userId, roleName, starLevel, amount } = req.body;

    if (type === "role") {
      const result =
        await notificationController.createRolePurchaseNotification(
          userId,
          "TestUser",
          roleName || "VIP",
          amount || 50000,
          req.body.orderId || `test-order-${Date.now()}`
        );
      res.json(result);
    } else if (type === "star") {
      const result = await notificationController.createStarUpgradeNotification(
        userId,
        "TestUser",
        starLevel || 3,
        amount || 10000,
        req.body.orderId || `test-order-${Date.now()}`
      );
      res.json(result);
    } else {
      res.status(400).json({ error: "Invalid type. Use 'role' or 'star'" });
    }
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check payment notification status (for debugging)
router.get(
  "/payment/status",
  authMiddleware,
  notificationController.getPaymentNotificationStatus
);

module.exports = router;

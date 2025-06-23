const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Endpoint publik: ambil notifikasi publik (tanpa auth)
router.get("/public", notificationController.getPublicNotifications);

// Endpoint di bawah ini pakai auth
router.use(authMiddleware);

// Buat notifikasi publik untuk semua user
router.post("/public", notificationController.createPublicNotification);
// Buat notifikasi untuk user tertentu
router.post("/user", notificationController.createUserNotification);
// Ambil notifikasi milik user tertentu
router.get("/user/:userId", notificationController.getUserNotifications);

module.exports = router;

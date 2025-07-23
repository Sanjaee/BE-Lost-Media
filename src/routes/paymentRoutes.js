const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// router.use(authMiddleware); // Only protect user-specific routes, not public ones

// Get all roles (public, for buy-role UI)
router.get("/roles", paymentController.getAllRoles);

// Payment creation and status (protected)
router.post("/create", authMiddleware, paymentController.createPayment);
router.get(
  "/status/:orderId",
  authMiddleware,
  paymentController.getPaymentStatus
);
router.get("/user/:userId", authMiddleware, paymentController.getUserPayments);

// Midtrans notification callback (public, called by Midtrans)
router.post("/notification", paymentController.handleNotification);

module.exports = router;

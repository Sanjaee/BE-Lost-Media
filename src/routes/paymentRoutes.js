const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// router.use(authMiddleware); // Only protect user-specific routes, not public ones

// Get all roles (public, for buy-role UI)
router.get("/roles", paymentController.getAllRoles);

// Create a new role (only owner)
router.post("/roles", authMiddleware, paymentController.createRole);
// Delete a role (only owner)
router.delete("/roles/:roleId", authMiddleware, paymentController.deleteRole);
// Payment creation and status (protected)
router.post("/create", authMiddleware, paymentController.createPayment);
router.get(
  "/status/:orderId",
  authMiddleware,
  paymentController.getPaymentStatus
);
// Payment Star (protected)
router.post(
  "/star/create",
  authMiddleware,
  paymentController.createStarPayment
);
router.get(
  "/star/status/:orderId",
  authMiddleware,
  paymentController.getStarPaymentStatus
);
// Get all payments for user
router.get("/user/:userId", paymentController.getUserPayments);
// Cek payment pending milik user (protected)
router.get(
  "/pending",
  authMiddleware,
  paymentController.getPendingPaymentByUser
);
// Cancel payment (protected)
router.patch(
  "/cancel/:orderId",
  authMiddleware,
  paymentController.cancelPayment
);

// Midtrans notification callback (public, called by Midtrans)
router.post("/notification", paymentController.handleNotification);

module.exports = router;

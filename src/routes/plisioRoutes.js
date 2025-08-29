const express = require("express");
const router = express.Router();
const PlisioController = require("../controllers/plisioController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/roles", PlisioController.getAllRoles);
router.get("/currencies", PlisioController.getCurrencies);

// Test endpoint to verify callback URL is working
router.get("/test", PlisioController.testCallback);

// Protected routes (authentication required)
router.use(authMiddleware);

// Role payment routes
router.post("/create-payment", PlisioController.createPayment);
router.get("/payment/status/:orderId", PlisioController.getPaymentStatus);
router.get("/user/:userId/payments", PlisioController.getUserPayments);
router.get("/pending-payment", PlisioController.getPendingPaymentByUser);
router.post("/cancel-payment/:orderId", PlisioController.cancelPayment);

// Star payment routes
router.post("/star/create", PlisioController.createStarPayment);
router.get("/star/status/:orderId", PlisioController.getStarPaymentStatus);

// Unified callback routes
router.post("/callback", PlisioController.handleCallback);
router.post("/check-status", PlisioController.checkPaymentStatus);
router.post("/crypto-callback", PlisioController.handleCryptoCallback);
router.post("/auto-success", PlisioController.handleAutoSuccess);

module.exports = router;

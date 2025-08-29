const express = require("express");
const router = express.Router();
const PlisioController = require("../controllers/plisioController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/roles", PlisioController.getAllRoles);
router.get("/currencies", PlisioController.getCurrencies);

// Protected routes (authentication required)
router.use(authMiddleware);

// Role payment routes
router.post("/create-payment", PlisioController.createPayment);
router.get("/payment/status/:orderId", PlisioController.getPaymentStatus);
router.get("/user/:userId/payments", PlisioController.getUserPayments);
router.get("/pending-payment", PlisioController.getPendingPaymentByUser);
router.post("/cancel-payment/:orderId", PlisioController.cancelPayment);

// Star payment routes
router.post("/create-star-payment", PlisioController.createStarPayment);
router.get("/star/status/:orderId", PlisioController.getStarPaymentStatus);

// Webhook routes (no authentication required for callbacks)
router.post("/callback", PlisioController.handleCallback);
router.post("/notify", PlisioController.handleNotification);
router.post("/success", PlisioController.handleSuccessCallback);
router.post("/fail", PlisioController.handleFailCallback);

// Unified callback route for all Plisio payment status updates
router.post("/webhook", PlisioController.handleUnifiedCallback);

module.exports = router;

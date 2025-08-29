require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const axios = require("axios");
const { sendAdminPaymentSuccessEmail } = require("../utils/email");

const prisma = new PrismaClient();

// Plisio Configuration
const PLISIO_API_KEY =
  "eB_tpJ0APoZFakdp7HIH-drEhVjGwBNCMi-VaDxMtUulbgDsDDtUS86Hu7BkjzBG";
const PLISIO_BASE_URL = "https://api.plisio.net/api/v1";

// Helper: Map Plisio status to Prisma enum
function mapPlisioStatusToPrisma(status) {
  switch (status) {
    case "pending":
      return "PENDING";
    case "completed":
      return "SUCCESS";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
}

// Helper: Get URLs based on NODE_ENV
function getUrls() {
  let backendUrl, frontendUrl;

  if (process.env.NODE_ENV === "production") {
    backendUrl = process.env.BACKEND_URL || "http://8.215.196.12:5000";
    frontendUrl = process.env.FRONTEND_URL || "https://lost-media.vercel.app";
  } else if (process.env.NODE_ENV === "staging") {
    backendUrl = process.env.BACKEND_URL || "https://staging-api.zascript.com";
    frontendUrl =
      process.env.FRONTEND_URL || "https://staging-lost-media.vercel.app";
  } else {
    // Development environment - use ngrok for testing
    backendUrl =
      process.env.BACKEND_URL || "https://59cd0f71c24d.ngrok-free.app";
    frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  }

  return { backendUrl, frontendUrl };
}

// Helper: Verify Plisio callback signature
function verifyPlisioCallback(data, secretKey) {
  try {
    if (!data.verify_hash || !secretKey) {
      return false;
    }

    const ordered = { ...data };
    delete ordered.verify_hash;

    // Sort keys alphabetically
    const sortedKeys = Object.keys(ordered).sort();
    const sortedData = {};
    sortedKeys.forEach((key) => {
      sortedData[key] = ordered[key];
    });

    const string = JSON.stringify(sortedData);
    const hmac = crypto.createHmac("sha1", secretKey);
    hmac.update(string);
    const hash = hmac.digest("hex");

    return hash === data.verify_hash;
  } catch (error) {
    console.error("Error verifying Plisio callback:", error);
    return false;
  }
}

class PlisioController {
  // Get all roles (for frontend UI)
  static async getAllRoles(req, res) {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          benefit: true,
          image: true,
        },
        orderBy: { price: "desc" },
      });
      res.json({ success: true, data: roles });
    } catch (error) {
      console.error("Get all roles error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get supported cryptocurrencies from Plisio
  static async getCurrencies(req, res) {
    try {
      const response = await axios.get(`${PLISIO_BASE_URL}/currencies`, {
        params: {
          api_key: PLISIO_API_KEY,
        },
      });

      const result = response.data;

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to get currencies");
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      console.error("Get currencies error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Create payment invoice for Plisio
  static async createPayment(req, res) {
    try {
      const { roleId, currency = "BTC" } = req.body; // Default to BTC instead of USD
      const userId = req.user.userId;

      // Get role data (price, name, etc)
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) return res.status(404).json({ error: "Role not found" });

      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const orderId = `plisio-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Convert IDR to USD (approximate rate, you might want to use a real-time API)
      const usdRate = 0.000065; // 1 IDR = 0.000065 USD (approximate)
      const amountUSD = Math.round(role.price * usdRate * 100) / 100; // Round to 2 decimal places

      // For cryptocurrency payments, we need to convert USD to the specific crypto
      // This is a simplified conversion - in production, you should use real-time rates
      let cryptoAmount;
      if (currency === "BTC") {
        cryptoAmount = amountUSD / 40000; // Approximate BTC rate
      } else if (currency === "SOL") {
        cryptoAmount = amountUSD / 100; // Approximate SOL rate
      } else {
        cryptoAmount = amountUSD; // Default fallback
      }

      // Create payment record (PENDING)
      const payment = await prisma.payment.create({
        data: {
          orderId,
          userId,
          role: role.name,
          amount: role.price, // Original IDR amount
          adminFee: 0,
          totalAmount: role.price,
          status: "PENDING",
          paymentMethod: "crypto",
          paymentType: "plisio",
        },
      });

      // Prepare invoice data for Plisio
      // Ensure URLs are properly defined
      const { backendUrl, frontendUrl } = getUrls();

      // Debug logging
      console.log("Backend URL:", backendUrl);
      console.log("Frontend URL:", frontendUrl);
      console.log("PLISIO_API_KEY exists:", !!PLISIO_API_KEY);
      console.log("Order ID:", orderId);

      const invoiceData = {
        api_key: PLISIO_API_KEY,
        order_name: `Role Purchase: ${role.name}`,
        order_number: orderId,
        source_currency: "USD",
        source_amount: amountUSD,
        currency: currency,
        callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        success_callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        fail_callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        success_invoice_url: `${frontendUrl}/payment-success?orderId=${orderId}`,
        fail_invoice_url: `${frontendUrl}/buy-role`,
        email: user.email,
        description: `Purchase ${role.name} role for ${user.username}`,
        expire_min: 60, // Invoice expires in 60 minutes
      };

      console.log("Invoice data:", JSON.stringify(invoiceData, null, 2));
      console.log("Success URL:", invoiceData.success_invoice_url);

      // Create invoice with Plisio using GET method
      const queryParams = new URLSearchParams(invoiceData).toString();
      const response = await axios.get(
        `${PLISIO_BASE_URL}/invoices/new?${queryParams}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;
      console.log("Plisio API Response:", JSON.stringify(result, null, 2));

      if (result.status !== "success") {
        console.error("Plisio API Error:", result);
        if (result.data?.message) {
          throw new Error(result.data.message);
        } else if (result.message) {
          throw new Error(result.message);
        } else {
          throw new Error("Failed to create Plisio invoice");
        }
      }

      // Update payment with Plisio response
      await prisma.payment.update({
        where: { orderId },
        data: {
          midtransTransactionId: result.data.txn_id,
          status: mapPlisioStatusToPrisma(result.data.status),
          midtransResponse: JSON.stringify(result.data),
          snapRedirectUrl: result.data.invoice_url || result.data.hosted_url, // Plisio invoice URL
        },
      });

      // Send to frontend
      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId,
          amount: role.price,
          amountUSD: amountUSD,
          cryptoAmount: cryptoAmount,
          currency: currency,
          paymentMethod: "crypto",
          hostedUrl: result.data.invoice_url || result.data.hosted_url,
          status: result.data.status,
          txnId: result.data.txn_id,
        },
      });
    } catch (error) {
      console.error("Create Plisio payment error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }

  // Get payment status from Plisio
  static async getPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { orderId: orderId },
        include: {
          user: true,
          roleModel: true,
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Get status from Plisio
      const response = await axios.get(`${PLISIO_BASE_URL}/operations`, {
        params: {
          api_key: PLISIO_API_KEY,
          txn_id: payment.midtransTransactionId,
        },
      });

      const result = response.data;

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to get payment status");
      }

      const plisioData = result.data[0]; // Get first transaction

      // Update payment status
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(plisioData.status),
        transactionStatus: plisioData.status,
        midtransResponse: JSON.stringify(plisioData),
        updatedAt: new Date(),
      };

      if (plisioData.paid_at) {
        paymentUpdate.paidAt = new Date(plisioData.paid_at * 1000); // Convert timestamp to Date
      }

      // If payment is successful, update user role and send notification
      if (
        mapPlisioStatusToPrisma(plisioData.status) === "SUCCESS" &&
        payment.userId
      ) {
        // Update user role if it's a role payment
        if (payment.role && (payment.type === "role" || !payment.type)) {
          await prisma.user.update({
            where: { userId: payment.userId },
            data: { role: payment.role },
          });

          // Send role purchase notification
          const notificationController = require("./notificationController");
          const notificationResult =
            await notificationController.createRolePurchaseNotification(
              payment.userId,
              payment.user?.username || "User",
              payment.role,
              payment.amount,
              payment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio payment success notification sent for order ${payment.orderId}, user ${payment.userId}, role ${payment.role}`
            );
          } else {
            console.log(
              `Plisio payment notification skipped for order ${payment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "role",
              username: payment.user?.username || "User",
              email: payment.user?.email || "No email",
              role: payment.role,
              amount: payment.amount,
              orderId: payment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
      }

      const updatedPayment = await prisma.payment.update({
        where: { orderId: orderId },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      res.json({
        success: true,
        data: {
          ...updatedPayment,
          status: plisioData.status,
          plisioData: plisioData,
        },
      });
    } catch (error) {
      console.error("Get Plisio payment status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle callback from Plisio
  static async handleCallback(req, res) {
    try {
      const callbackData = req.body;
      console.log("Plisio callback received:", callbackData);

      const { txn_id, status, amount, currency, order_number } = callbackData;

      // Verify the payment exists - try both txn_id and order_number
      let payment = await prisma.payment.findUnique({
        where: { midtransTransactionId: txn_id },
        include: { user: true, roleModel: true },
      });

      if (!payment && order_number) {
        payment = await prisma.payment.findUnique({
          where: { orderId: order_number },
          include: { user: true, roleModel: true },
        });
      }

      if (!payment) {
        console.error(
          "Payment not found for txn_id:",
          txn_id,
          "order_number:",
          order_number
        );
        return res.status(404).json({ error: "Payment not found" });
      }

      console.log(
        "Found payment:",
        payment.orderId,
        "Current status:",
        payment.status
      );

      // Update payment status
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(status),
        transactionStatus: status,
        midtransResponse: JSON.stringify(callbackData),
        updatedAt: new Date(),
      };

      if (status === "completed") {
        paymentUpdate.paidAt = new Date();
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      console.log(
        `Payment ${updatedPayment.orderId} status updated to: ${updatedPayment.status}`
      );

      // If payment is successful, update user role/star and send notification
      if (
        mapPlisioStatusToPrisma(status) === "SUCCESS" &&
        updatedPayment.userId
      ) {
        const notificationController = require("./notificationController");

        // Handle star payment
        if (updatedPayment.type === "star" && updatedPayment.star) {
          console.log(
            `Updating user ${updatedPayment.userId} star to ${updatedPayment.star}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { star: updatedPayment.star },
          });

          // Send star upgrade notification
          const notificationResult =
            await notificationController.createStarUpgradeNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.star,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio star upgrade notification sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, star ${updatedPayment.star}`
            );
          } else {
            console.log(
              `Plisio star notification skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "star",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              star: updatedPayment.star,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
        // Handle role payment
        else if (
          updatedPayment.role &&
          (updatedPayment.type === "role" || !updatedPayment.type)
        ) {
          console.log(
            `Updating user ${updatedPayment.userId} role to ${updatedPayment.role}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { role: updatedPayment.role },
          });

          // Send role purchase notification
          const notificationResult =
            await notificationController.createRolePurchaseNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.role,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio callback notification sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, role ${updatedPayment.role}`
            );
          } else {
            console.log(
              `Plisio callback notification skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "role",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              role: updatedPayment.role,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
      }

      res.json({ success: true, message: "Callback processed successfully" });
    } catch (error) {
      console.error("Plisio callback error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle success callback from Plisio
  static async handleSuccessCallback(req, res) {
    try {
      const callbackData = req.body;
      console.log("Plisio success callback received:", callbackData);

      const { txn_id, status, amount, currency, order_number } = callbackData;

      // Verify the payment exists - try both txn_id and order_number
      let payment = await prisma.payment.findUnique({
        where: { orderId: order_number },
        include: { user: true, roleModel: true },
      });

      if (!payment && txn_id) {
        payment = await prisma.payment.findUnique({
          where: { midtransTransactionId: txn_id },
          include: { user: true, roleModel: true },
        });
      }

      if (!payment) {
        console.error(
          "Payment not found for order:",
          order_number,
          "txn_id:",
          txn_id
        );
        return res.status(404).json({ error: "Payment not found" });
      }

      console.log(
        "Found payment:",
        payment.orderId,
        "Current status:",
        payment.status
      );

      // Update payment status
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(status),
        transactionStatus: status,
        midtransResponse: JSON.stringify(callbackData),
        updatedAt: new Date(),
      };

      if (status === "completed") {
        paymentUpdate.paidAt = new Date();
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      console.log(
        `Payment ${updatedPayment.orderId} status updated to: ${updatedPayment.status}`
      );

      // If payment is successful, update user role/star and send notification
      if (
        mapPlisioStatusToPrisma(status) === "SUCCESS" &&
        updatedPayment.userId
      ) {
        const notificationController = require("./notificationController");

        // Handle star payment
        if (updatedPayment.type === "star" && updatedPayment.star) {
          console.log(
            `Updating user ${updatedPayment.userId} star to ${updatedPayment.star}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { star: updatedPayment.star },
          });

          // Send star upgrade notification
          const notificationResult =
            await notificationController.createStarUpgradeNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.star,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio success callback star upgrade notification sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, star ${updatedPayment.star}`
            );
          } else {
            console.log(
              `Plisio success callback star notification skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "star",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              star: updatedPayment.star,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
        // Handle role payment
        else if (
          updatedPayment.role &&
          (updatedPayment.type === "role" || !updatedPayment.type)
        ) {
          console.log(
            `Updating user ${updatedPayment.userId} role to ${updatedPayment.role}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { role: updatedPayment.role },
          });

          // Send role purchase notification
          const notificationResult =
            await notificationController.createRolePurchaseNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.role,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio success callback notification sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, role ${updatedPayment.role}`
            );
          } else {
            console.log(
              `Plisio success callback notification skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "role",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              role: updatedPayment.role,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
      }

      console.log(
        `Success callback processed for order ${updatedPayment.orderId}, status: ${status}`
      );

      res.json({ success: true, message: "Success callback processed" });
    } catch (error) {
      console.error("Plisio success callback error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle fail callback from Plisio
  static async handleFailCallback(req, res) {
    try {
      const callbackData = req.body;
      console.log("Plisio fail callback received:", callbackData);

      const { txn_id, status, amount, currency, order_number } = callbackData;

      // Verify the payment exists
      const payment = await prisma.payment.findUnique({
        where: { orderId: order_number },
        include: { user: true, roleModel: true },
      });

      if (!payment) {
        console.error("Payment not found for order:", order_number);
        return res.status(404).json({ error: "Payment not found" });
      }

      // Update payment status
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(status),
        transactionStatus: status,
        midtransResponse: JSON.stringify(callbackData),
        updatedAt: new Date(),
      };

      const updatedPayment = await prisma.payment.update({
        where: { orderId: order_number },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      console.log(
        `Fail callback processed for order ${order_number}, status: ${status}`
      );

      res.json({ success: true, message: "Fail callback processed" });
    } catch (error) {
      console.error("Plisio fail callback error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle notification from Plisio
  static async handleNotification(req, res) {
    try {
      const notification = req.body;
      console.log("Plisio notification received:", notification);

      // Verify signature (if Plisio provides one)
      // Note: Plisio might not provide signature verification like Midtrans
      // You might want to implement additional security measures

      const { txn_id, status, amount, currency, order_number } = notification;

      // Update payment status - try both txn_id and order_number
      let payment = await prisma.payment.findUnique({
        where: { midtransTransactionId: txn_id },
        include: { user: true, roleModel: true },
      });

      if (!payment && order_number) {
        payment = await prisma.payment.findUnique({
          where: { orderId: order_number },
          include: { user: true, roleModel: true },
        });
      }

      if (!payment) {
        console.error(
          "Payment not found for txn_id:",
          txn_id,
          "order_number:",
          order_number
        );
        return res.status(404).json({ error: "Payment not found" });
      }

      console.log(
        "Found payment:",
        payment.orderId,
        "Current status:",
        payment.status
      );

      // Extract additional fields from Plisio notification
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(status),
        transactionStatus: status,
        midtransResponse: JSON.stringify(notification),
        updatedAt: new Date(),
      };

      if (status === "completed") {
        paymentUpdate.paidAt = new Date();
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      console.log(
        `Payment ${updatedPayment.orderId} status updated to: ${updatedPayment.status}`
      );

      // If payment is successful, update user role/star and send notification
      if (
        mapPlisioStatusToPrisma(status) === "SUCCESS" &&
        updatedPayment.userId
      ) {
        const notificationController = require("./notificationController");

        // Handle star payment
        if (updatedPayment.type === "star" && updatedPayment.star) {
          console.log(
            `Updating user ${updatedPayment.userId} star to ${updatedPayment.star}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { star: updatedPayment.star },
          });

          // Send star upgrade notification
          const notificationResult =
            await notificationController.createStarUpgradeNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.star,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio notification star upgrade sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, star ${updatedPayment.star}`
            );
          } else {
            console.log(
              `Plisio notification star skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "star",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              star: updatedPayment.star,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
        // Handle role payment
        else if (
          updatedPayment.role &&
          (updatedPayment.type === "role" || !updatedPayment.type)
        ) {
          console.log(
            `Updating user ${updatedPayment.userId} role to ${updatedPayment.role}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { role: updatedPayment.role },
          });

          // Send role purchase notification
          const notificationResult =
            await notificationController.createRolePurchaseNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.role,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `Plisio notification sent for order ${updatedPayment.orderId}, user ${updatedPayment.userId}, role ${updatedPayment.role}`
            );
          } else {
            console.log(
              `Plisio notification skipped for order ${updatedPayment.orderId}: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "role",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              role: updatedPayment.role,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
            });
          } catch (err) {
            console.error("Failed to send email to admin:", err);
          }
        }
      }

      res.json({
        success: true,
        message: "Notification processed successfully",
      });
    } catch (error) {
      console.error("Handle Plisio notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Unified callback handler for all Plisio payment status updates
  static async handleUnifiedCallback(req, res) {
    try {
      const callbackData = req.body;
      console.log(
        "🔔 Plisio unified callback received:",
        JSON.stringify(callbackData, null, 2)
      );

      // Verify callback signature
      const isValidSignature = verifyPlisioCallback(
        callbackData,
        PLISIO_API_KEY
      );
      if (!isValidSignature) {
        console.error("❌ Invalid callback signature");
        return res.status(422).json({ error: "Invalid signature" });
      }

      const {
        txn_id,
        status,
        amount,
        currency,
        order_number,
        order_name,
        ipn_type,
        merchant,
        merchant_id,
        confirmations,
        source_currency,
        source_amount,
        source_rate,
        comment,
        verify_hash,
        invoice_commission,
        invoice_sum,
        invoice_total_sum,
      } = callbackData;

      console.log(`📋 Callback Details:
        - Txn ID: ${txn_id}
        - Status: ${status}
        - Order Number: ${order_number}
        - Order Name: ${order_name}
        - Amount: ${amount} ${currency}
        - IPN Type: ${ipn_type}
        - Confirmations: ${confirmations}
      `);

      // Find payment by txn_id or order_number
      let payment = await prisma.payment.findFirst({
        where: {
          OR: [{ midtransTransactionId: txn_id }, { orderId: order_number }],
        },
        include: {
          user: true,
          roleModel: true,
        },
      });

      if (!payment) {
        console.error(
          `❌ Payment not found for txn_id: ${txn_id}, order_number: ${order_number}`
        );
        return res.status(404).json({ error: "Payment not found" });
      }

      console.log(
        `✅ Found payment: ${payment.orderId}, Current status: ${payment.status}`
      );

      // Map Plisio status to our system
      const mappedStatus = mapPlisioStatusToPrisma(status);
      console.log(`🔄 Status mapping: ${status} -> ${mappedStatus}`);

      // Update payment status
      let paymentUpdate = {
        status: mappedStatus,
        transactionStatus: status,
        midtransResponse: JSON.stringify(callbackData),
        updatedAt: new Date(),
      };

      // Add paid timestamp if completed
      if (status === "completed") {
        paymentUpdate.paidAt = new Date();
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: paymentUpdate,
        include: { user: true, roleModel: true },
      });

      console.log(
        `✅ Payment ${updatedPayment.orderId} status updated to: ${updatedPayment.status}`
      );

      // Handle successful payment completion
      if (mappedStatus === "SUCCESS" && updatedPayment.userId) {
        console.log(
          `🎉 Processing successful payment for user: ${updatedPayment.userId}`
        );

        const notificationController = require("./notificationController");

        // Handle star payment
        if (updatedPayment.type === "star" && updatedPayment.star) {
          console.log(
            `⭐ Updating user ${updatedPayment.userId} star to ${updatedPayment.star}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { star: updatedPayment.star },
          });

          // Send star upgrade notification
          const notificationResult =
            await notificationController.createStarUpgradeNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.star,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `✅ Star upgrade notification sent for order ${updatedPayment.orderId}`
            );
          } else {
            console.log(
              `⚠️ Star notification skipped: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "star",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              star: updatedPayment.star,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
              txnId: txn_id,
              currency: currency,
              amountReceived: amount,
            });
          } catch (err) {
            console.error("❌ Failed to send email to admin:", err);
          }
        }
        // Handle role payment
        else if (
          updatedPayment.role &&
          (updatedPayment.type === "role" || !updatedPayment.type)
        ) {
          console.log(
            `👑 Updating user ${updatedPayment.userId} role to ${updatedPayment.role}`
          );

          await prisma.user.update({
            where: { userId: updatedPayment.userId },
            data: { role: updatedPayment.role },
          });

          // Send role purchase notification
          const notificationResult =
            await notificationController.createRolePurchaseNotification(
              updatedPayment.userId,
              updatedPayment.user?.username || "User",
              updatedPayment.role,
              updatedPayment.amount,
              updatedPayment.orderId
            );

          if (notificationResult.success) {
            console.log(
              `✅ Role purchase notification sent for order ${updatedPayment.orderId}`
            );
          } else {
            console.log(
              `⚠️ Role notification skipped: ${notificationResult.message}`
            );
          }

          // Send email to admin
          try {
            await sendAdminPaymentSuccessEmail({
              to: "afrizaahmad18@gmail.com",
              type: "role",
              username: updatedPayment.user?.username || "User",
              email: updatedPayment.user?.email || "No email",
              role: updatedPayment.role,
              amount: updatedPayment.amount,
              orderId: updatedPayment.orderId,
              paymentMethod: "Crypto (Plisio)",
              txnId: txn_id,
              currency: currency,
              amountReceived: amount,
            });
          } catch (err) {
            console.error("❌ Failed to send email to admin:", err);
          }
        }
      }

      // Log final status
      console.log(
        `🏁 Callback processing completed for order ${updatedPayment.orderId}`
      );
      console.log(
        `📊 Final status: ${updatedPayment.status}, Plisio status: ${status}`
      );

      res.json({
        success: true,
        message: "Callback processed successfully",
        orderId: updatedPayment.orderId,
        status: updatedPayment.status,
        plisioStatus: status,
      });
    } catch (error) {
      console.error("❌ Plisio unified callback error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  // Get all payments for user
  static async getUserPayments(req, res) {
    try {
      const { userId } = req.params;

      const payments = await prisma.payment.findMany({
        where: {
          userId: userId,
          paymentType: "plisio", // Only Plisio payments
        },
        include: {
          roleModel: {
            select: {
              name: true,
              image: true,
              benefit: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Get user Plisio payments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get pending payment by user
  static async getPendingPaymentByUser(req, res) {
    try {
      const userId = req.user.userId;
      const pendingPayment = await prisma.payment.findFirst({
        where: {
          userId,
          status: "PENDING",
          paymentType: "plisio", // Only Plisio payments
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          userId: true,
          role: true,
          amount: true,
          midtransResponse: true,
          createdAt: true,
          updatedAt: true,
          roleModel: {
            select: {
              id: true,
              name: true,
              image: true,
              benefit: true,
              price: true,
            },
          },
        },
      });

      if (pendingPayment) {
        return res.json({ success: true, data: pendingPayment });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error" });
    }
  }

  // Cancel payment
  static async cancelPayment(req, res) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;
      const payment = await prisma.payment.findFirst({
        where: {
          orderId,
          userId,
          status: "PENDING",
          paymentType: "plisio", // Only Plisio payments
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: "Payment not found or not cancellable",
        });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });

      return res.json({ success: true, message: "Payment cancelled" });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error" });
    }
  }

  // Create star payment with Plisio
  static async createStarPayment(req, res) {
    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const currentStar = user.star || 0;
      const targetStar = Math.min(currentStar + 1, 8); // max 8 star
      if (currentStar >= 8) {
        return res.status(400).json({ error: "You already have max star (8)" });
      }

      // Price: 1.000 x 10^(targetStar-1) in IDR
      const priceIDR = 1000 * Math.pow(10, targetStar - 1);
      const currency = req.body.currency || "BTC"; // Default to BTC instead of USD

      // Convert IDR to USD (approximate rate)
      const usdRate = 0.000065; // 1 IDR = 0.000065 USD (approximate)
      const amountUSD = Math.round(priceIDR * usdRate * 100) / 100;

      // For cryptocurrency payments, we need to convert USD to the specific crypto
      let cryptoAmount;
      if (currency === "BTC") {
        cryptoAmount = amountUSD / 40000; // Approximate BTC rate
      } else if (currency === "SOL") {
        cryptoAmount = amountUSD / 100; // Approximate SOL rate
      } else {
        cryptoAmount = amountUSD; // Default fallback
      }

      const orderId = `plisio-star-${userId.slice(0, 8)}-${Date.now()
        .toString()
        .slice(-6)}-${Math.random().toString(36).substr(2, 5)}`;

      // Prepare invoice data for Plisio
      // Ensure URLs are properly defined
      const { backendUrl, frontendUrl } = getUrls();

      // Debug logging
      console.log("Star payment - Backend URL:", backendUrl);
      console.log("Star payment - Frontend URL:", frontendUrl);
      console.log("Star payment - PLISIO_API_KEY exists:", !!PLISIO_API_KEY);

      const invoiceData = {
        api_key: PLISIO_API_KEY,
        order_name: `Star Upgrade: Star ${targetStar}`,
        order_number: orderId,
        source_currency: "USD",
        source_amount: amountUSD,
        currency: currency,
        callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        success_callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        fail_callback_url: `${backendUrl}/api/plisio/webhook?json=true`,
        success_invoice_url: `${frontendUrl}/payment-success?orderId=${orderId}`,
        fail_invoice_url: `${frontendUrl}/buy-role`,
        email: user.email,
        description: `Upgrade to Star ${targetStar} for ${user.username}`,
        expire_min: 60, // Invoice expires in 60 minutes
      };

      console.log(
        "Star payment invoice data:",
        JSON.stringify(invoiceData, null, 2)
      );

      // Create invoice with Plisio using GET method
      const queryParams = new URLSearchParams(invoiceData).toString();
      const response = await axios.get(
        `${PLISIO_BASE_URL}/invoices/new?${queryParams}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;
      console.log(
        "Plisio Star Payment API Response:",
        JSON.stringify(result, null, 2)
      );

      if (result.status !== "success") {
        console.error("Plisio API Error:", result);
        if (result.data?.message) {
          throw new Error(result.data.message);
        } else if (result.message) {
          throw new Error(result.message);
        } else {
          throw new Error("Failed to create Plisio invoice");
        }
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          orderId,
          userId,
          role: user.role || "",
          amount: priceIDR,
          adminFee: 0,
          totalAmount: priceIDR,
          status: "PENDING",
          paymentMethod: "crypto",
          paymentType: "plisio",
          star: targetStar,
          type: "star",
        },
      });

      // Update payment with Plisio response
      await prisma.payment.update({
        where: { orderId },
        data: {
          midtransTransactionId: result.data.txn_id,
          status: mapPlisioStatusToPrisma(result.data.status),
          midtransResponse: JSON.stringify(result.data),
          snapRedirectUrl: result.data.invoice_url || result.data.hosted_url,
        },
      });

      // Send to frontend
      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId,
          amount: priceIDR,
          amountUSD: amountUSD,
          cryptoAmount: cryptoAmount,
          currency: currency,
          paymentMethod: "crypto",
          hostedUrl: result.data.invoice_url || result.data.hosted_url,
          status: result.data.status,
          txnId: result.data.txn_id,
          targetStar,
        },
      });
    } catch (error) {
      console.error("Create Plisio star payment error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }

  // Get star payment status
  static async getStarPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: { user: true },
      });

      if (!payment || payment.type !== "star") {
        return res.status(404).json({ error: "Star payment not found" });
      }

      // Get status from Plisio
      const response = await axios.get(`${PLISIO_BASE_URL}/operations`, {
        params: {
          api_key: PLISIO_API_KEY,
          txn_id: payment.midtransTransactionId,
        },
      });

      const result = response.data;

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to get payment status");
      }

      const plisioData = result.data[0];

      // Update payment status
      let paymentUpdate = {
        status: mapPlisioStatusToPrisma(plisioData.status),
        transactionStatus: plisioData.status,
        midtransResponse: JSON.stringify(plisioData),
      };

      if (plisioData.paid_at) {
        paymentUpdate.paidAt = new Date(plisioData.paid_at * 1000);
      }

      // If payment is successful, update user star and send notification
      if (
        mapPlisioStatusToPrisma(plisioData.status) === "SUCCESS" &&
        payment.userId &&
        payment.star &&
        payment.type === "star"
      ) {
        await prisma.user.update({
          where: { userId: payment.userId },
          data: { star: payment.star },
        });

        // Send star upgrade notification
        const notificationController = require("./notificationController");
        const notificationResult =
          await notificationController.createStarUpgradeNotification(
            payment.userId,
            payment.user?.username || "User",
            payment.star,
            payment.amount,
            payment.orderId
          );

        if (notificationResult.success) {
          console.log(
            `Plisio star upgrade notification sent for order ${payment.orderId}, user ${payment.userId}, star ${payment.star}`
          );
        } else {
          console.log(
            `Plisio star notification skipped for order ${payment.orderId}: ${notificationResult.message}`
          );
        }

        // Send email to admin
        try {
          await sendAdminPaymentSuccessEmail({
            to: "afrizaahmad18@gmail.com",
            type: "star",
            username: payment.user?.username || "User",
            email: payment.user?.email || "No email",
            star: payment.star,
            amount: payment.amount,
            orderId: payment.orderId,
            paymentMethod: "Crypto (Plisio)",
          });
        } catch (err) {
          console.error("Failed to send email to admin:", err);
        }
      }

      const updatedPayment = await prisma.payment.update({
        where: { orderId },
        data: paymentUpdate,
        include: { user: true },
      });

      res.json({
        success: true,
        data: {
          ...updatedPayment,
          status: plisioData.status,
          plisioData: plisioData,
        },
      });
    } catch (error) {
      console.error("Get Plisio star payment status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = PlisioController;

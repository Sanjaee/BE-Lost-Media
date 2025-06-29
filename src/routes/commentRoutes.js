const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/:postId/comments", commentController.getComments);

// Protected routes (authentication required)
router.use(authMiddleware);

router.post("/:postId/comment", commentController.createComment);
router.post(
  "/:postId/comments/:commentId/reply",
  commentController.replyComment
);

module.exports = router;

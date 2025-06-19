const express = require("express");
const router = express.Router();
const postController = require("../controllers/postControlle");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/", postController.getAllPosts);
router.get("/:postId", postController.getPostById);
router.get("/:postId/comments", postController.getComments);

// Protected routes (authentication required)
// Apply auth middleware to all routes below
router.use(authMiddleware);

router.post("/", postController.createPost);
router.put("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.get("/user/my-posts", postController.getUserPosts);
router.post("/:postId/like", postController.toggleLike);
router.post("/:postId/comment", postController.createComment);
router.post("/:postId/comments/:commentId/reply", postController.replyComment);

module.exports = router;

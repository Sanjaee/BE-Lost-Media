const express = require("express");
const router = express.Router();
const postController = require("../controllers/postControlle");
const authMiddleware = require("../middleware/authMiddleware");

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwt = require("jsonwebtoken");
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token is invalid, but we continue without user info
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Public routes (no authentication required)
router.get("/", optionalAuth, postController.getAllPosts);
router.get("/:postId", postController.getPostById);
router.get("/:postId/comments", postController.getComments);
router.post("/:postId/view", postController.incrementViewCount);

// Protected routes (authentication required)
// Apply auth middleware to all routes below
router.use(authMiddleware);

router.get("/manage/unpublished", postController.getUnpublishedPosts);
router.get("/manage/search", postController.searchUnpublishedPosts);
router.post("/", postController.createPost);
router.put("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.get("/user/my-posts", postController.getUserPosts);
router.post("/:postId/like", postController.toggleLike);
router.post("/:postId/comment", postController.createComment);
router.post("/:postId/comments/:commentId/reply", postController.replyComment);
router.post("/manage/:postId/publish", postController.setPublishStatus);
router.post("/manage/:postId/force-delete", postController.forceDeletePostById);

module.exports = router;

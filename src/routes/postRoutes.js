const express = require("express");
const router = express.Router();
const postController = require("../controllers/postControlle");
const commentRoutes = require("./commentRoutes");
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
router.get("/search", optionalAuth, postController.searchAllPosts);
router.get("/:postId", postController.getPostById);
router.post("/:postId/view", postController.incrementViewCount);

// Comment routes
router.use("/", commentRoutes);

// Protected routes (authentication required)
// Apply auth middleware to all routes below
router.use(authMiddleware);

router.get("/manage/unpublished", postController.getUnpublishedPosts);
router.get("/manage/search", postController.searchUnpublishedPosts);
router.get("/manage/published", postController.getPublishedPosts);
router.get("/manage/published/search", postController.searchPublishedPosts);
router.post("/", postController.createPost);
router.put("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.delete("/manage/published/:postId", postController.deletePublishedPost);
router.get("/user/my-posts", postController.getUserPosts);
router.get("/user/posts-count", postController.getUserPostsCount);
router.post("/:postId/like", postController.toggleLike);
router.post("/manage/:postId/publish", postController.setPublishStatus);
router.post("/manage/:postId/force-delete", postController.forceDeletePostById);
router.post("/manage/bulk-approve", postController.bulkApprovePosts);
router.post("/manage/bulk-delete", postController.bulkDeletePublishedPosts);
router.post("/manage/bulk-force-delete", postController.bulkForceDeletePosts);

module.exports = router;

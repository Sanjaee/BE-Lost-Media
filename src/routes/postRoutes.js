const express = require('express');
const router = express.Router();
const postController = require('../controllers/postControlle');

// Public routes (no authentication required)
router.get('/', postController.getAllPosts);
router.get('/:postId', postController.getPostById);

// Protected routes (authentication required)
 // Apply auth middleware to all routes below

router.post('/', postController.createPost);
router.put('/:postId', postController.updatePost);
router.delete('/:postId', postController.deletePost);
router.get('/user/my-posts', postController.getUserPosts);
router.post('/:postId/like', postController.toggleLike);

module.exports = router;
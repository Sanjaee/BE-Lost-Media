const prisma = require("../utils/prisma");

const commentController = {
  // Create comment on post
  createComment: async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.user;
      const { content } = req.body;

      if (!content || content.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Content is required" });
      }

      // Check if post exists
      const post = await prisma.post.findFirst({
        where: { postId, isDeleted: false },
      });
      if (!post) {
        return res
          .status(404)
          .json({ success: false, message: "Post not found" });
      }

      // Create comment and increment commentsCount
      const comment = await prisma.$transaction(async (tx) => {
        const newComment = await tx.comment.create({
          data: {
            postId,
            userId,
            content,
          },
          include: {
            author: {
              select: {
                userId: true,
                username: true,
                profilePic: true,
                role: true,
              },
            },
          },
        });
        await tx.post.update({
          where: { postId },
          data: { commentsCount: { increment: 1 } },
        });
        return newComment;
      });

      res
        .status(201)
        .json({ success: true, message: "Comment created", data: comment });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create comment",
        error: error.message,
      });
    }
  },

  // Get all comments for a post
  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await prisma.comment.findMany({
        where: { postId, isDeleted: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
        },
      });
      res.status(200).json({ success: true, data: comments });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch comments",
        error: error.message,
      });
    }
  },

  // Reply to a comment
  replyComment: async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { userId } = req.user;
      const { content } = req.body;

      if (!content || content.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Content is required" });
      }

      // Check if parent comment exists
      const parentComment = await prisma.comment.findFirst({
        where: { commentId, postId, isDeleted: false },
      });
      if (!parentComment) {
        return res
          .status(404)
          .json({ success: false, message: "Parent comment not found" });
      }

      // Create reply and increment commentsCount on post
      const reply = await prisma.$transaction(async (tx) => {
        const newReply = await tx.comment.create({
          data: {
            postId,
            userId,
            content,
            parentId: commentId,
          },
          include: {
            author: {
              select: {
                userId: true,
                username: true,
                profilePic: true,
                role: true,
              },
            },
          },
        });
        await tx.post.update({
          where: { postId },
          data: { commentsCount: { increment: 1 } },
        });
        return newReply;
      });

      res
        .status(201)
        .json({ success: true, message: "Reply created", data: reply });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create reply",
        error: error.message,
      });
    }
  },
};

module.exports = commentController;

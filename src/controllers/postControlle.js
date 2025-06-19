const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const postController = {
  // Get all posts with ordered content sections
  getAllPosts: async (req, res) => {
    try {
      const { page = 1, limit = 10, category, userId } = req.query;
      const skip = (page - 1) * limit;

      const whereClause = {
        isDeleted: false,
        ...(category && { category }),
        ...(userId && { userId }),
      };

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              posts: true,
              createdAt: true,
              role: true,
              star: true,
            },
          },
          sections: {
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const totalPosts = await prisma.post.count({
        where: whereClause,
      });

      res.status(200).json({
        success: true,
        data: posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  },

  // Get single post by ID with ordered content sections
  getPostById: async (req, res) => {
    try {
      const { postId } = req.params;

      const post = await prisma.post.findFirst({
        where: {
          postId,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              bio: true,
            },
          },
          sections: {
            orderBy: {
              order: "asc",
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  profilePic: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  userId: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // Increment view count
      await prisma.post.update({
        where: { postId },
        data: { viewsCount: { increment: 1 } },
      });

      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch post",
        error: error.message,
      });
    }
  },

  // Create new post with content sections
  createPost: async (req, res) => {
    try {
      const { title, description, category, mediaUrl, sections } = req.body;
      const { userId } = req.user;

      // Validate required fields
      if (!title || !description || !category) {
        return res.status(400).json({
          success: false,
          message: "Title, description, and category are required",
        });
      }

      // Generate content from sections (optional)
      const generateContentFromSections = (sections) => {
        if (!sections || sections.length === 0) return "";

        return sections
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((section) => {
            switch (section.type) {
              case "text":
                return section.content || "";
              case "code":
                // Preserve line breaks by using template literals
                return `\`\`\`\n${
                  section.content?.replace(/\n/g, "\n") || ""
                }\n\`\`\``;
              case "html":
                return section.content || "";
              case "image":
                return section.src ? `![Image](${section.src})` : "";
              case "video":
                return section.src ? `[Video](${section.src})` : "";
              case "link":
                return section.src ? `[Link](${section.src})` : "";
              default:
                return "";
            }
          })
          .filter((content) => content.trim() !== "")
          .join("\n\n");
      };

      // Create post with sections in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate content from sections
        const generatedContent = generateContentFromSections(sections);

        // Create the post
        const newPost = await tx.post.create({
          data: {
            userId,
            title,
            description,
            category,
            mediaUrl: mediaUrl || null,
            content: generatedContent, // Use generated content
          },
        });

        // Create content sections if provided
        if (sections && sections.length > 0) {
          const sectionsData = sections.map((section, index) => ({
            postId: newPost.postId,
            type: section.type,
            content: section.content || null,
            src: section.src || null,
            imageDetail: section.imageDetail || [],
            order: section.order || index + 1,
          }));

          await tx.contentSection.createMany({
            data: sectionsData,
          });
        }

        // Fetch the complete post with sections
        return await tx.post.findUnique({
          where: { postId: newPost.postId },
          include: {
            author: {
              select: {
                userId: true,
                username: true,
                profilePic: true,
              },
            },
            sections: {
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: result,
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create post",
        error: error.message,
      });
    }
  },

  // Update post with content sections
  updatePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { title, description, category, mediaUrl, sections } = req.body;
      const { userId } = req.user;

      // Check if post exists and belongs to user
      const existingPost = await prisma.post.findFirst({
        where: {
          postId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingPost) {
        return res.status(404).json({
          success: false,
          message:
            "Post not found or you are not authorized to update this post",
        });
      }

      // Update post with sections in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the post
        const updatedPost = await tx.post.update({
          where: { postId },
          data: {
            ...(title && { title }),
            ...(description && { description }),
            ...(category && { category }),
            ...(mediaUrl !== undefined && { mediaUrl }),
          },
        });

        // Update content sections if provided
        if (sections) {
          // Delete existing sections
          await tx.contentSection.deleteMany({
            where: { postId },
          });

          // Create new sections
          if (sections.length > 0) {
            const sectionsData = sections.map((section, index) => ({
              postId,
              type: section.type,
              content: section.content,
              src: section.src,
              imageDetail: section.imageDetail || [],
              order: section.order || index + 1,
            }));

            await tx.contentSection.createMany({
              data: sectionsData,
            });
          }
        }

        // Fetch the complete updated post with sections
        return await tx.post.findUnique({
          where: { postId },
          include: {
            author: {
              select: {
                userId: true,
                username: true,
                profilePic: true,
              },
            },
            sections: {
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      });

      res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update post",
        error: error.message,
      });
    }
  },

  // Delete post (soft delete)
  deletePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.user;

      // Check if post exists and belongs to user
      const existingPost = await prisma.post.findFirst({
        where: {
          postId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingPost) {
        return res.status(404).json({
          success: false,
          message:
            "Post not found or you are not authorized to delete this post",
        });
      }

      // Soft delete the post
      await prisma.post.update({
        where: { postId },
        data: { isDeleted: true },
      });

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete post",
        error: error.message,
      });
    }
  },

  // Get user's own posts
  getUserPosts: async (req, res) => {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 10, includeDeleted = false } = req.query;
      const skip = (page - 1) * limit;

      const whereClause = {
        userId,
        ...(includeDeleted === "true" ? {} : { isDeleted: false }),
      };

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          sections: {
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const totalPosts = await prisma.post.count({
        where: whereClause,
      });

      res.status(200).json({
        success: true,
        data: posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch user posts",
        error: error.message,
      });
    }
  },

  // Like/Unlike post
  toggleLike: async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.user;

      // Check if post exists
      const post = await prisma.post.findFirst({
        where: {
          postId,
          isDeleted: false,
        },
      });

      console.log("Post ID:", postId, "User ID:", userId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // Check if user already liked the post
      const existingLike = await prisma.like.findFirst({
        where: {
          postId,
          userId,
        },
      });

      let message;
      if (existingLike) {
        // Unlike the post
        await prisma.$transaction(async (tx) => {
          await tx.like.delete({
            where: { likeId: existingLike.likeId },
          });
          await tx.post.update({
            where: { postId },
            data: { likesCount: { decrement: 1 } },
          });
        });
        message = "Post unliked successfully";
      } else {
        // Like the post
        await prisma.$transaction(async (tx) => {
          await tx.like.create({
            data: {
              postId,
              userId,
              likeType: "post",
            },
          });
          await tx.post.update({
            where: { postId },
            data: { likesCount: { increment: 1 } },
          });
        });
        message = "Post liked successfully";
      }

      res.status(200).json({
        success: true,
        message,
        isLiked: !existingLike,
      });
    } catch (error) {
      console.error("Toggle like error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle like",
        error: error.message,
      });
    }
  },

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
            author: true,
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
        include: { author: true },
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
            author: true,
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

module.exports = postController;

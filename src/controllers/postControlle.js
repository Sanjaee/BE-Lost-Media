const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notificationController = require("./notificationController");

const postController = {
  // Get all posts with ordered content sections
  getAllPosts: async (req, res) => {
    try {
      const { page = 1, limit = 10, category, userId } = req.query;
      const skip = (page - 1) * limit;
      const currentUserId = req.user?.userId; // Get current user ID if authenticated

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
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
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

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      const totalPosts = await prisma.post.count({
        where: whereClause,
      });

      res.status(200).json({
        success: true,
        data: transformedPosts,
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

  // Search all published posts (lightweight search for everyone)
  searchAllPosts: async (req, res) => {
    try {
      const { q, category, author, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
      const currentUserId = req.user?.userId; // Get current user ID if authenticated

      // Build search conditions
      const whereClause = {
        isDeleted: false,
        isPublished: true, // Only published posts
      };

      // Search in title, description, and content
      if (q && q.trim() !== "") {
        const searchTerm = q.trim();
        whereClause.OR = [
          {
            title: {
              contains: searchTerm,
              mode: "insensitive", // Case insensitive search
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ];
      }

      // Filter by category
      if (category && category.trim() !== "") {
        whereClause.category = {
          contains: category.trim(),
          mode: "insensitive",
        };
      }

      // Filter by author
      if (author && author.trim() !== "") {
        whereClause.author = {
          username: {
            contains: author.trim(),
            mode: "insensitive",
          },
        };
      }

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count for pagination
      const totalPosts = await prisma.post.count({
        where: whereClause,
      });

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      res.status(200).json({
        success: true,
        data: transformedPosts,
        count: transformedPosts.length,
        totalCount: totalPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          itemsPerPage: parseInt(limit),
        },
        searchParams: {
          query: q || "",
          category: category || "",
          author: author || "",
        },
      });
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search posts",
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
              role: true,
              star: true,
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
      let updatedPost;

      if (existingLike) {
        // Unlike the post
        await prisma.$transaction(async (tx) => {
          await tx.like.delete({
            where: { likeId: existingLike.likeId },
          });
          updatedPost = await tx.post.update({
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
          updatedPost = await tx.post.update({
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
        likesCount: updatedPost.likesCount,
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

  // Increment view count only
  incrementViewCount: async (req, res) => {
    try {
      const { postId } = req.params;
      await prisma.post.update({
        where: { postId },
        data: { viewsCount: { increment: 1 } },
      });
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to increment view count",
        error: error.message,
      });
    }
  },

  // Publish or unpublish a post (only for certain roles)
  setPublishStatus: async (req, res) => {
    try {
      const { postId } = req.params;
      const { isPublished } = req.body;
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to publish/unpublish posts.",
        });
      }

      // Check if post exists
      const post = await prisma.post.findFirst({
        where: { postId, isDeleted: false },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
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

      // Check if post was previously unpublished and is now being published
      const wasUnpublished = !post.isPublished;
      const isBeingPublished = !!isPublished;

      // Update publish status
      const updated = await prisma.post.update({
        where: { postId },
        data: { isPublished: isBeingPublished },
      });

      // Send notification if post is being published for the first time
      if (wasUnpublished && isBeingPublished) {
        try {
          await notificationController.createPostApprovalNotification(
            postId,
            post.title,
            post.author.userId,
            req.user.userId,
            requesterRole
          );
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
          // Don't fail the main operation if notification fails
        }
      }

      res.status(200).json({
        success: true,
        message: `Post has been ${isPublished ? "published" : "unpublished"}`,
        data: updated,
        notificationSent: wasUnpublished && isBeingPublished,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update publish status",
        error: error.message,
      });
    }
  },

  // Get all unpublished posts (only for certain roles)
  getUnpublishedPosts: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const currentUserId = req.user?.userId;

      const posts = await prisma.post.findMany({
        where: {
          isPublished: false,
          isDeleted: false,
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
          sections: {
            orderBy: { order: "asc" },
          },
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Transform posts to include isLiked field (like getAllPosts)
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      res.status(200).json({
        success: true,
        data: transformedPosts,
        count: transformedPosts.length,
      });
    } catch (error) {
      console.error("Error fetching unpublished posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unpublished posts",
      });
    }
  },

  // Search unpublished posts (only for certain roles)
  searchUnpublishedPosts: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const { q, category, author, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
      const currentUserId = req.user?.userId;

      // Build search conditions
      const whereConditions = {
        isPublished: false,
        isDeleted: false,
      };

      // Search in title, description, and content
      if (q && q.trim() !== "") {
        const searchTerm = q.trim();
        whereConditions.OR = [
          {
            title: {
              contains: searchTerm,
              mode: "insensitive", // Case insensitive search
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ];
      }

      // Filter by category
      if (category && category.trim() !== "") {
        whereConditions.category = {
          contains: category.trim(),
          mode: "insensitive",
        };
      }

      // Filter by author
      if (author && author.trim() !== "") {
        whereConditions.author = {
          username: {
            contains: author.trim(),
            mode: "insensitive",
          },
        };
      }

      const posts = await prisma.post.findMany({
        where: whereConditions,
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
          sections: {
            orderBy: { order: "asc" },
          },
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count for pagination
      const totalPosts = await prisma.post.count({
        where: whereConditions,
      });

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      res.status(200).json({
        success: true,
        data: transformedPosts,
        count: transformedPosts.length,
        totalCount: totalPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          itemsPerPage: parseInt(limit),
        },
        searchParams: {
          query: q || "",
          category: category || "",
          author: author || "",
        },
      });
    } catch (error) {
      console.error("Error searching unpublished posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search unpublished posts",
        error: error.message,
      });
    }
  },

  // Force delete a post by ID (only for certain roles)
  forceDeletePostById: async (req, res) => {
    try {
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to force delete posts.",
        });
      }

      const { postId } = req.params;
      if (!postId) {
        return res.status(400).json({
          success: false,
          message: "postId is required",
        });
      }

      // Check if post exists and get author information
      const post = await prisma.post.findUnique({
        where: { postId },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
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

      // Delete related data and send notification in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete related data first
        await tx.contentSection.deleteMany({ where: { postId } });
        await tx.comment.deleteMany({ where: { postId } });
        await tx.like.deleteMany({ where: { postId } });
        await tx.post.delete({ where: { postId } });

        // Create notification for the author
        const notification = await tx.notification.create({
          data: {
            userId: post.author.userId,
            actorId: req.user.userId,
            type: "post_force_deleted",
            content: `Post "${post.title}" telah dihapus paksa oleh ${requesterRole} karena tidak memenuhi standar.`,
            actionUrl: `/profile/${post.author.userId}`,
          },
        });

        return { notification };
      });

      res.status(200).json({
        success: true,
        message: "Post and related data have been force deleted.",
        notificationSent: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to force delete post",
        error: error.message,
      });
    }
  },

  // Get all published posts (only for certain roles)
  getPublishedPosts: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const currentUserId = req.user?.userId;

      const posts = await prisma.post.findMany({
        where: {
          isPublished: true,
          isDeleted: false,
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
          sections: {
            orderBy: { order: "asc" },
          },
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      res.status(200).json({
        success: true,
        data: transformedPosts,
        count: transformedPosts.length,
      });
    } catch (error) {
      console.error("Error fetching published posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch published posts",
      });
    }
  },

  // Search published posts (only for certain roles)
  searchPublishedPosts: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin", "mod"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const { q, category, author, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
      const currentUserId = req.user?.userId;

      // Build search conditions
      const whereConditions = {
        isPublished: true,
        isDeleted: false,
      };

      // Search in title, description, and content
      if (q && q.trim() !== "") {
        const searchTerm = q.trim();
        whereConditions.OR = [
          {
            title: {
              contains: searchTerm,
              mode: "insensitive", // Case insensitive search
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ];
      }

      // Filter by category
      if (category && category.trim() !== "") {
        whereConditions.category = {
          contains: category.trim(),
          mode: "insensitive",
        };
      }

      // Filter by author
      if (author && author.trim() !== "") {
        whereConditions.author = {
          username: {
            contains: author.trim(),
            mode: "insensitive",
          },
        };
      }

      const posts = await prisma.post.findMany({
        where: whereConditions,
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
            },
          },
          sections: {
            orderBy: { order: "asc" },
          },
          ...(currentUserId && {
            likes: {
              where: {
                userId: currentUserId,
              },
            },
          }),
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count for pagination
      const totalPosts = await prisma.post.count({
        where: whereConditions,
      });

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      res.status(200).json({
        success: true,
        data: transformedPosts,
        count: transformedPosts.length,
        totalCount: totalPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          itemsPerPage: parseInt(limit),
        },
        searchParams: {
          query: q || "",
          category: category || "",
          author: author || "",
        },
      });
    } catch (error) {
      console.error("Error searching published posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search published posts",
        error: error.message,
      });
    }
  },

  // Delete published post (only for certain roles)
  deletePublishedPost: async (req, res) => {
    try {
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete published posts.",
        });
      }

      const { postId } = req.params;
      if (!postId) {
        return res.status(400).json({
          success: false,
          message: "postId is required",
        });
      }

      // Check if post exists and is published
      const post = await prisma.post.findFirst({
        where: {
          postId,
          isPublished: true,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Published post not found",
        });
      }

      // Delete related data and send notification in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete related data first
        await tx.contentSection.deleteMany({ where: { postId } });
        await tx.comment.deleteMany({ where: { postId } });
        await tx.like.deleteMany({ where: { postId } });
        await tx.post.delete({ where: { postId } });

        // Create notification for the author
        const notification = await tx.notification.create({
          data: {
            userId: post.author.userId,
            actorId: req.user.userId,
            type: "post_deleted",
            content: `Post "${post.title}" telah dihapus oleh ${requesterRole}.`,
            actionUrl: `/profile/${post.author.userId}`,
          },
        });

        return { notification };
      });

      res.status(200).json({
        success: true,
        message: "Published post has been deleted successfully.",
        notificationSent: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete published post",
        error: error.message,
      });
    }
  },

  // Bulk approve posts (only for certain roles)
  bulkApprovePosts: async (req, res) => {
    try {
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to bulk approve posts.",
        });
      }

      const { postIds } = req.body;
      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "postIds array is required and must not be empty",
        });
      }

      // Get all unpublished posts that match the provided IDs
      const posts = await prisma.post.findMany({
        where: {
          postId: { in: postIds },
          isPublished: false,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (posts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No unpublished posts found with the provided IDs",
        });
      }

      const results = await prisma.$transaction(async (tx) => {
        const approvedPosts = [];
        const notifications = [];

        for (const post of posts) {
          // Update post to published
          const updatedPost = await tx.post.update({
            where: { postId: post.postId },
            data: { isPublished: true },
          });

          approvedPosts.push(updatedPost);

          // Create notification for the author
          const notification = await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: req.user.userId,
              type: "post_approved",
              content: `Post "${post.title}" telah disetujui dan dipublikasikan oleh ${requesterRole}.`,
              actionUrl: `/post/${post.postId}`,
            },
          });

          notifications.push(notification);
        }

        return { approvedPosts, notifications };
      });

      res.status(200).json({
        success: true,
        message: `${results.approvedPosts.length} posts have been approved and published`,
        data: {
          approvedCount: results.approvedPosts.length,
          notificationCount: results.notifications.length,
          postIds: results.approvedPosts.map((post) => post.postId),
        },
      });
    } catch (error) {
      console.error("Error bulk approving posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk approve posts",
        error: error.message,
      });
    }
  },

  // Bulk delete published posts (only for certain roles)
  bulkDeletePublishedPosts: async (req, res) => {
    try {
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to bulk delete published posts.",
        });
      }

      const { postIds } = req.body;
      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "postIds array is required and must not be empty",
        });
      }

      // Get all published posts that match the provided IDs
      const posts = await prisma.post.findMany({
        where: {
          postId: { in: postIds },
          isPublished: true,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (posts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No published posts found with the provided IDs",
        });
      }

      const results = await prisma.$transaction(async (tx) => {
        const deletedPosts = [];
        const notifications = [];

        for (const post of posts) {
          // Delete related data first
          await tx.contentSection.deleteMany({
            where: { postId: post.postId },
          });
          await tx.comment.deleteMany({ where: { postId: post.postId } });
          await tx.like.deleteMany({ where: { postId: post.postId } });
          await tx.post.delete({ where: { postId: post.postId } });

          deletedPosts.push(post);

          // Create notification for the author
          const notification = await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: req.user.userId,
              type: "post_deleted",
              content: `Post "${post.title}" telah dihapus oleh ${requesterRole}.`,
              actionUrl: `/profile/${post.author.userId}`,
            },
          });

          notifications.push(notification);
        }

        return { deletedPosts, notifications };
      });

      res.status(200).json({
        success: true,
        message: `${results.deletedPosts.length} posts have been deleted`,
        data: {
          deletedCount: results.deletedPosts.length,
          notificationCount: results.notifications.length,
          postIds: results.deletedPosts.map((post) => post.postId),
        },
      });
    } catch (error) {
      console.error("Error bulk deleting posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk delete posts",
        error: error.message,
      });
    }
  },

  // Bulk force delete posts (only for certain roles)
  bulkForceDeletePosts: async (req, res) => {
    try {
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      const allowedRoles = ["owner", "admin", "mod"];
      if (!allowedRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to bulk force delete posts.",
        });
      }

      const { postIds } = req.body;
      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "postIds array is required and must not be empty",
        });
      }

      // Get all posts that match the provided IDs
      const posts = await prisma.post.findMany({
        where: {
          postId: { in: postIds },
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (posts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No posts found with the provided IDs",
        });
      }

      const results = await prisma.$transaction(async (tx) => {
        const forceDeletedPosts = [];
        const notifications = [];

        for (const post of posts) {
          // Delete related data first
          await tx.contentSection.deleteMany({
            where: { postId: post.postId },
          });
          await tx.comment.deleteMany({ where: { postId: post.postId } });
          await tx.like.deleteMany({ where: { postId: post.postId } });
          await tx.post.delete({ where: { postId: post.postId } });

          forceDeletedPosts.push(post);

          // Create notification for the author
          const notification = await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: req.user.userId,
              type: "post_force_deleted",
              content: `Post "${post.title}" telah dihapus paksa oleh ${requesterRole} karena tidak memenuhi standar.`,
              actionUrl: `/profile/${post.author.userId}`,
            },
          });

          notifications.push(notification);
        }

        return { forceDeletedPosts, notifications };
      });

      res.status(200).json({
        success: true,
        message: `${results.forceDeletedPosts.length} posts have been force deleted`,
        data: {
          forceDeletedCount: results.forceDeletedPosts.length,
          notificationCount: results.notifications.length,
          postIds: results.forceDeletedPosts.map((post) => post.postId),
        },
      });
    } catch (error) {
      console.error("Error bulk force deleting posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk force delete posts",
        error: error.message,
      });
    }
  },
};

module.exports = postController;

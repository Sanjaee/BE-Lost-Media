const prisma = require("../utils/prisma");
const notificationController = require("./notificationController");
const axiomController = require("./axiomController");

const postController = {
  // Function to combine getAllPosts with data - limit-based pagination
  getAllPostsWithAxiom: async (req, res) => {
    try {
      const { limit, offset = 0, category, userId } = req.query;

      // Validasi wajib parameter limit untuk mencegah memory overload
      if (!limit) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' is required. Example: ?limit=20&offset=0",
          example: "/api/posts/axiom?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validasi range limit
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive number (minimum 1)",
          example: "/api/posts/axiom?limit=20&offset=0",
        });
      }

      if (parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' cannot exceed 100 to prevent memory issues",
          example: "/api/posts/axiom?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      // Validasi offset
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'offset' must be a non-negative number",
          example: "/api/posts/axiom?limit=20&offset=0",
        });
      }

      // Fetch Axiom data only - no database queries
      let axiomData = null;
      try {
        axiomData = await axiomController.fetchAxiomData();
      } catch (error) {
        console.error("Error fetching Axiom data:", error);
        axiomData = null;
      }

      // Create Axiom posts if data is available
      let axiomPosts = [];
      if (axiomData && Array.isArray(axiomData) && axiomData.length > 0) {
        console.log(`Creating ${axiomData.length} Axiom posts...`);
        axiomPosts = axiomData.map((token, index) => ({
          postId: `${
            token.tokenAddress || token.pairAddress || index
          }-${index}`,
          userId: "00000000-0000-0000-0000-000000000000",
          title: (
            token.tokenName ||
            token.tokenTicker ||
            "Unknown Token"
          ).substring(0, 100),
          description: `Token: ${(
            token.tokenTicker ||
            token.tokenName ||
            "N/A"
          ).substring(0, 30)} | Protocol: ${(token.protocol || "N/A").substring(
            0,
            20
          )} | Market Cap: ${(token.marketCapSol || 0).toFixed(2)} SOL`,
          content: `Token: ${(
            token.tokenName ||
            token.tokenTicker ||
            "Unknown"
          ).substring(0, 50)}\nProtocol: ${(token.protocol || "N/A").substring(
            0,
            30
          )}\nMarket Cap: ${(token.marketCapSol || 0).toFixed(2)} SOL`,
          category: "BOT",
          mediaUrl:
            token.tokenImage ||
            "https://via.placeholder.com/400x200?text=Token+Image",
          blurred: true,
          viewsCount: 0,
          likesCount: 0,
          sharesCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
          isPublished: true,
          isLiked: false,
          author: {
            userId: "00000000-0000-0000-0000-000000000000",
            username: "BOT COINS",
            profilePic: "/admin",
            posts: 0,
            createdAt: new Date().toISOString(),
            role: "member",
            star: 0,
          },
          sections: [
            {
              sectionId: `${token.tokenAddress || token.pairAddress || index}`,
              type: "code",
              content: (
                token.tokenAddress ||
                token.pairAddress ||
                "Unknown Address"
              ).substring(0, 50),
              src: null,
              order: 1,
              postId: `botcoin-${
                token.tokenAddress || token.pairAddress || index
              }-${index}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              sectionId: `stats-${
                token.tokenAddress || token.pairAddress || index
              }`,
              type: "html",
              content: `
                <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 16px;">
                    <!-- Top Row -->
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">👥</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                        token.top10HoldersPercent || 0
                      ).toFixed(2)}%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">Top 10 H.</div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">👨‍🍳</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                        token.devHoldsPercent || 0
                      ).toFixed(2)}%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">Dev H.</div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">🎯</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                        token.snipersHoldPercent || 0
                      ).toFixed(2)}%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">Snipers H.</div>
                    </div>
                    
                    <!-- Bottom Row -->
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">👻</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                        token.insidersHoldPercent || 0
                      ).toFixed(2)}%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">Insiders</div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">🔗</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                        token.bundlersHoldPercent || 0
                      ).toFixed(2)}%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">Bundlers</div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                      <div style="font-size: 20px; margin-bottom: 6px;">🔥</div>
                      <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">100.00%</div>
                      <div style="color: #888; font-size: 11px; line-height: 1.2;">LP Burned</div>
                    </div>
                  </div>
                  
                  <div style="background: #2a2a2a; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <h4 style="color: #00ff88; margin: 0 0 8px 0; font-size: 14px;">Market Data</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px;">
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #888;">Market Cap:</span>
                        <span style="color: #fff;">${(
                          token.marketCapSol || 0
                        ).toFixed(2)} SOL</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #888;">Volume (24h):</span>
                        <span style="color: #fff;">${(
                          token.volumeSol || 0
                        ).toFixed(2)} SOL</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style="background: #2a2a2a; padding: 12px; border-radius: 6px;">
                    <h4 style="color: #00ff88; margin: 0 0 8px 0; font-size: 14px;">Social Links</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                      ${
                        token.website
                          ? `<a href="${token.website}" target="_blank" style="color: #00ff88; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #00ff88;">🌐 Website</a>`
                          : ""
                      }
                      ${
                        token.twitter
                          ? `<a href="${token.twitter}" target="_blank" style="color: #1da1f2; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #1da1f2;">🐦 Twitter</a>`
                          : ""
                      }
                      ${
                        token.telegram
                          ? `<a href="${token.telegram}" target="_blank" style="color: #0088cc; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #0088cc;">📱 Telegram</a>`
                          : ""
                      }
                      ${
                        token.discord
                          ? `<a href="${token.discord}" target="_blank" style="color: #7289da; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #7289da;">🎮 Discord</a>`
                          : ""
                      }
                      ${
                        !token.website &&
                        !token.twitter &&
                        !token.telegram &&
                        !token.discord
                          ? '<span style="color: #888; font-size: 12px;">No social links available</span>'
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `,
              src: null,
              order: 2,
              postId: `stats-${
                token.tokenAddress || token.pairAddress || index
              }`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          _count: {
            comments: 0,
            likes: 0,
          },
          comments: [],
          source: "axiom",
        }));
      } else {
        console.log("No Axiom data available, returning empty result");
      }

      // Apply limit-based pagination to Axiom posts only
      const paginatedPosts = axiomPosts.slice(
        parsedOffset,
        parsedOffset + parsedLimit
      );
      const totalPosts = axiomPosts.length;

      console.log(
        `✅ Axiom API Success - Offset: ${parsedOffset}, Limit: ${parsedLimit}, Returned: ${paginatedPosts.length} of ${totalPosts} total Axiom posts`
      );

      res.status(200).json({
        success: true,
        data: paginatedPosts,
        pagination: {
          offset: parsedOffset,
          limit: parsedLimit,
          totalItems: totalPosts,
          returned: paginatedPosts.length,
          hasMore: parsedOffset + paginatedPosts.length < totalPosts,
        },
        sources: {
          database: 0,
          axiom: paginatedPosts.length,
          total: paginatedPosts.length,
        },
      });
      console.log("Axiom posts only:", axiomPosts);
    } catch (error) {
      console.error("Error in getAllPostsWithAxiom:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch Axiom posts",
        error: error.message,
      });
    }
  },

  // Get all posts with ordered content sections - limit-based pagination (DATABASE ONLY)
  getAllPosts: async (req, res) => {
    try {
      const { limit, offset = 0, category, userId } = req.query;

      // Validasi wajib parameter limit untuk mencegah memory overload
      if (!limit) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' is required. Example: ?limit=20&offset=0",
          example: "/api/posts?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validasi range limit
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive number (minimum 1)",
          example: "/api/posts?limit=20&offset=0",
        });
      }

      if (parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' cannot exceed 100 to prevent memory issues",
          example: "/api/posts?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      // Validasi offset
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'offset' must be a non-negative number",
          example: "/api/posts?limit=20&offset=0",
        });
      }

      const currentUserId = req.user?.userId;

      // Log untuk debugging
      console.log(
        `📊 getAllPosts called - Limit: ${parsedLimit}, Offset: ${parsedOffset}, User: ${
          currentUserId || "Anonymous"
        }`
      );

      const whereClause = {
        isDeleted: false,
        ...(category && { category }),
        ...(userId && { userId }),
      };

      // Optimized database query - only essential fields
      console.log(
        `🔍 Querying database: skip=${parsedOffset}, take=${parsedLimit}`
      );

      const allDatabasePosts = await prisma.post.findMany({
        where: whereClause,
        select: {
          // Essential post fields only
          postId: true,
          userId: true,
          title: true,
          description: true,
          category: true,
          mediaUrl: true,
          blurred: true,
          viewsCount: true,
          likesCount: true,
          sharesCount: true,
          createdAt: true,
          isPublished: true,
          // Essential author fields only
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
              createdAt: true,
              star: true,
            },
          },
          // Limited sections for performance
          sections: {
            select: {
              sectionId: true,
              type: true,
              content: true,
              src: true,
              order: true,
              imageDetail: true,
            },
            orderBy: { order: "asc" },
            take: 3, // Only first 3 sections for list view
          },
          // Quick count only
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          // User like status if authenticated
          ...(currentUserId && {
            likes: {
              where: { userId: currentUserId },
              select: { likeId: true },
              take: 1,
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        skip: parsedOffset,
        take: parsedLimit,
      });

      console.log(
        `✅ Database query completed: ${allDatabasePosts.length} posts retrieved`
      );

      // Transform posts - minimal processing
      const transformedPosts = allDatabasePosts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove likes array from response
        comments: [], // Empty array for list view
      }));

      // Quick count query
      const totalDatabasePosts = await prisma.post.count({
        where: whereClause,
      });

      console.log(
        `✅ Response: ${transformedPosts.length}/${totalDatabasePosts} posts, offset=${parsedOffset}, limit=${parsedLimit}`
      );

      // Send response immediately - no additional processing
      return res.status(200).json({
        success: true,
        data: transformedPosts,
        pagination: {
          offset: parsedOffset,
          limit: parsedLimit,
          totalItems: totalDatabasePosts,
          returned: transformedPosts.length,
          hasMore: parsedOffset + transformedPosts.length < totalDatabasePosts,
        },
        sources: {
          database: transformedPosts.length,
          axiom: 0,
          total: transformedPosts.length,
        },
        meta: {
          endpoint: "/api/posts",
          queryTime: new Date().toISOString(),
          note: "Database posts only - use /api/posts/combined for mixed content",
        },
      });
    } catch (error) {
      res.status(200).json({
        success: false,
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  },

  // Combined function to get both database and Axiom posts with limit-based pagination
  getAllPostsCombined: async (req, res) => {
    try {
      const { limit, offset = 0, category, userId } = req.query;

      // Validasi wajib parameter limit untuk mencegah memory overload
      if (!limit) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' is required. Example: ?limit=20&offset=0",
          example: "/api/posts/combined?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validasi range limit
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive number (minimum 1)",
          example: "/api/posts/combined?limit=20&offset=0",
        });
      }

      if (parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' cannot exceed 100 to prevent memory issues",
          example: "/api/posts/combined?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      // Validasi offset
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'offset' must be a non-negative number",
          example: "/api/posts/combined?limit=20&offset=0",
        });
      }

      const currentUserId = req.user?.userId;

      console.log(
        `🔄 getAllPostsCombined called - Limit: ${parsedLimit}, Offset: ${parsedOffset}, User: ${
          currentUserId || "Anonymous"
        }`
      );

      // Fetch database posts
      const whereClause = {
        isDeleted: false,
        ...(category && { category }),
        ...(userId && { userId }),
      };

      const allDatabasePosts = await prisma.post.findMany({
        where: whereClause,
        select: {
          postId: true,
          userId: true,
          title: true,
          description: true,
          category: true,
          mediaUrl: true,
          blurred: true,
          viewsCount: true,
          likesCount: true,
          sharesCount: true,
          createdAt: true,
          isPublished: true,
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
              createdAt: true,
              star: true,
            },
          },
          sections: {
            select: {
              sectionId: true,
              type: true,
              content: true,
              src: true,
              order: true,
              imageDetail: true,
            },
            orderBy: { order: "asc" },
            take: 3,
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          ...(currentUserId && {
            likes: {
              where: { userId: currentUserId },
              select: { likeId: true },
              take: 1,
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      });

      // Transform database posts
      const transformedDatabasePosts = allDatabasePosts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined,
        comments: [],
        source: "database",
      }));

      // Fetch Axiom data
      let axiomPosts = [];
      try {
        const axiomData = await axiomController.fetchAxiomData();
        if (axiomData && Array.isArray(axiomData) && axiomData.length > 0) {
          console.log(`Creating ${axiomData.length} Axiom posts...`);
          axiomPosts = axiomData.map((token, index) => ({
            postId: `${
              token.tokenAddress || token.pairAddress || index
            }-${index}`,
            userId: "00000000-0000-0000-0000-000000000000",
            title: (
              token.tokenName ||
              token.tokenTicker ||
              "Unknown Token"
            ).substring(0, 100),
            description: `Token: ${(
              token.tokenTicker ||
              token.tokenName ||
              "N/A"
            ).substring(0, 30)} | Protocol: ${(
              token.protocol || "N/A"
            ).substring(0, 20)} | Market Cap: ${(
              token.marketCapSol || 0
            ).toFixed(2)} SOL`,
            content: `Token: ${(
              token.tokenName ||
              token.tokenTicker ||
              "Unknown"
            ).substring(0, 50)}\nProtocol: ${(
              token.protocol || "N/A"
            ).substring(0, 30)}\nMarket Cap: ${(
              token.marketCapSol || 0
            ).toFixed(2)} SOL`,
            category: "BOT",
            mediaUrl:
              token.tokenImage ||
              "https://via.placeholder.com/400x200?text=Token+Image",
            blurred: true,
            viewsCount: 0,
            likesCount: 0,
            sharesCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
            isPublished: true,
            isLiked: false,
            author: {
              userId: "00000000-0000-0000-0000-000000000000",
              username: "BOT COINS",
              profilePic: "/admin",
              posts: 0,
              createdAt: new Date().toISOString(),
              role: "member",
              star: 0,
            },
            sections: [
              {
                sectionId: `${
                  token.tokenAddress || token.pairAddress || index
                }`,
                type: "code",
                content: (
                  token.tokenAddress ||
                  token.pairAddress ||
                  "Unknown Address"
                ).substring(0, 50),
                src: null,
                order: 1,
                postId: `botcoin-${
                  token.tokenAddress || token.pairAddress || index
                }-${index}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                sectionId: `stats-${
                  token.tokenAddress || token.pairAddress || index
                }`,
                type: "html",
                content: `
                  <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 16px;">
                      <!-- Top Row -->
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">👥</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                          token.top10HoldersPercent || 0
                        ).toFixed(2)}%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">Top 10 H.</div>
                      </div>
                      
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">👨‍🍳</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                          token.devHoldsPercent || 0
                        ).toFixed(2)}%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">Dev H.</div>
                      </div>
                      
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">🎯</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                          token.snipersHoldPercent || 0
                        ).toFixed(2)}%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">Snipers H.</div>
                      </div>
                      
                      <!-- Bottom Row -->
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">👻</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                          token.insidersHoldPercent || 0
                        ).toFixed(2)}%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">Insiders</div>
                      </div>
                      
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">🔗</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">${(
                          token.bundlersHoldPercent || 0
                        ).toFixed(2)}%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">Bundlers</div>
                      </div>
                      
                      <div style="background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #333; min-height: 100px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">🔥</div>
                        <div style="color: #00ff88; font-size: 16px; font-weight: 600; margin-bottom: 4px; word-break: break-word;">100.00%</div>
                        <div style="color: #888; font-size: 11px; line-height: 1.2;">LP Burned</div>
                      </div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                      <h4 style="color: #00ff88; margin: 0 0 8px 0; font-size: 14px;">Market Data</h4>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #888;">Market Cap:</span>
                          <span style="color: #fff;">${(
                            token.marketCapSol || 0
                          ).toFixed(2)} SOL</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #888;">Volume (24h):</span>
                          <span style="color: #fff;">${(
                            token.volumeSol || 0
                          ).toFixed(2)} SOL</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 6px;">
                      <h4 style="color: #00ff88; margin: 0 0 8px 0; font-size: 14px;">Social Links</h4>
                      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${
                          token.website
                            ? `<a href="${token.website}" target="_blank" style="color: #00ff88; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #00ff88;">🌐 Website</a>`
                            : ""
                        }
                        ${
                          token.twitter
                            ? `<a href="${token.twitter}" target="_blank" style="color: #1da1f2; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #1da1f2;">🐦 Twitter</a>`
                            : ""
                        }
                        ${
                          token.telegram
                            ? `<a href="${token.telegram}" target="_blank" style="color: #0088cc; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #0088cc;">📱 Telegram</a>`
                            : ""
                        }
                        ${
                          token.discord
                            ? `<a href="${token.discord}" target="_blank" style="color: #7289da; text-decoration: none; padding: 6px 12px; background: #1a1a1a; border-radius: 4px; font-size: 12px; border: 1px solid #7289da;">🎮 Discord</a>`
                            : ""
                        }
                        ${
                          !token.website &&
                          !token.twitter &&
                          !token.telegram &&
                          !token.discord
                            ? '<span style="color: #888; font-size: 12px;">No social links available</span>'
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                `,
                src: null,
                order: 2,
                postId: `stats-${
                  token.tokenAddress || token.pairAddress || index
                }`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            _count: {
              comments: 0,
              likes: 0,
            },
            comments: [],
            source: "axiom",
          }));
        }
      } catch (error) {
        console.error("Error fetching Axiom data:", error);
      }

      // Combine and sort all posts by createdAt (newest first)
      const allPosts = [...transformedDatabasePosts, ...axiomPosts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination to combined results
      const paginatedPosts = allPosts.slice(
        parsedOffset,
        parsedOffset + parsedLimit
      );

      const totalPosts = allPosts.length;
      const databaseCount = transformedDatabasePosts.length;
      const axiomCount = axiomPosts.length;

      console.log(
        `✅ Combined API Success - Offset: ${parsedOffset}, Limit: ${parsedLimit}, Returned: ${paginatedPosts.length} of ${totalPosts} total posts (DB: ${databaseCount}, Axiom: ${axiomCount})`
      );

      res.status(200).json({
        success: true,
        data: paginatedPosts,
        pagination: {
          offset: parsedOffset,
          limit: parsedLimit,
          totalItems: totalPosts,
          returned: paginatedPosts.length,
          hasMore: parsedOffset + paginatedPosts.length < totalPosts,
        },
        sources: {
          database: databaseCount,
          axiom: axiomCount,
          total: totalPosts,
        },
        meta: {
          endpoint: "/api/posts/combined",
          queryTime: new Date().toISOString(),
          note: "Combined database and Axiom posts",
        },
      });
    } catch (error) {
      console.error("Error in getAllPostsCombined:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch combined posts",
        error: error.message,
      });
    }
  },

  // Search all published posts with limit-based pagination
  searchAllPosts: async (req, res) => {
    try {
      const { q, category, author, limit, offset = 0 } = req.query;

      // Validasi wajib parameter limit untuk mencegah memory overload
      if (!limit) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' is required. Example: ?q=search&limit=20&offset=0",
          example: "/api/posts/search?q=example&limit=20&offset=0",
          maxLimit: 100,
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validasi range limit
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive number (minimum 1)",
          example: "/api/posts/search?q=example&limit=20&offset=0",
        });
      }

      if (parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' cannot exceed 100 to prevent memory issues",
          example: "/api/posts/search?q=example&limit=20&offset=0",
          maxLimit: 100,
        });
      }

      // Validasi offset
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'offset' must be a non-negative number",
          example: "/api/posts/search?q=example&limit=20&offset=0",
        });
      }

      const currentUserId = req.user?.userId; // Get current user ID if authenticated

      // Log untuk debugging
      console.log(
        `🔍 searchAllPosts called - Query: "${q || ""}", Category: "${
          category || ""
        }", Author: "${
          author || ""
        }", Limit: ${parsedLimit}, Offset: ${parsedOffset}, User: ${
          currentUserId || "Anonymous"
        }`
      );

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

      console.log(
        `🔍 Search conditions: ${JSON.stringify(
          whereClause
        )}, skip=${parsedOffset}, take=${parsedLimit}`
      );

      // Fetch posts with pagination
      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
              createdAt: true,
              star: true,
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
        skip: parsedOffset,
        take: parsedLimit,
      });

      console.log(`✅ Search query completed: ${posts.length} posts retrieved`);

      // Transform posts to include isLiked field
      const transformedPosts = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove the likes array from response
      }));

      // Get total count for pagination
      const totalCount = await prisma.post.count({
        where: whereClause,
      });

      console.log(
        `✅ Search response: ${transformedPosts.length}/${totalCount} posts, offset=${parsedOffset}, limit=${parsedLimit}`
      );

      res.status(200).json({
        success: true,
        data: transformedPosts,
        pagination: {
          offset: parsedOffset,
          limit: parsedLimit,
          totalItems: totalCount,
          returned: transformedPosts.length,
          hasMore: parsedOffset + transformedPosts.length < totalCount,
        },
        count: transformedPosts.length,
        totalCount: totalCount,
        searchParams: {
          query: q || "",
          category: category || "",
          author: author || "",
        },
        meta: {
          endpoint: "/api/posts/search",
          queryTime: new Date().toISOString(),
          note: "Search results with pagination - use limit and offset parameters",
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

      // Increment view count safely
      try {
        await prisma.post.update({
          where: { postId },
          data: { viewsCount: { increment: 1 } },
        });
      } catch (viewError) {
        // If view count increment fails, log it but don't fail the entire request
        console.warn(
          `Failed to increment view count for post ${postId}:`,
          viewError.message
        );
      }

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
      const {
        title,
        description,
        category,
        mediaUrl,
        sections,
        blurred,
        scheduledAt,
        isScheduled,
      } = req.body;
      const { userId } = req.user;

      // Ambil data user untuk cek role dan postsCount
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { role: true, postsCount: true },
      });
      if (!user) {
        return res.status(403).json({
          success: false,
          message: "User not found.",
        });
      }
      // Batasan jumlah post berdasarkan role
      const roleLimit = {
        member: 3,
        vip: 5,
        god: 10,
      };
      const privilegedRoles = ["owner", "admin", "mod", "god"];
      if (
        !privilegedRoles.includes(user.role) &&
        user.role in roleLimit &&
        user.postsCount >= roleLimit[user.role]
      ) {
        return res.status(403).json({
          success: false,
          message: `Role ${user.role} hanya dapat membuat maksimal ${
            roleLimit[user.role]
          } post.`,
        });
      }

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
            blurred: blurred !== undefined ? blurred : true, // Default to true if not provided
            content: generatedContent, // Use generated content
            isPublished: privilegedRoles.includes(user.role) && !isScheduled, // Auto-publish for privileged roles only if not scheduled
            scheduledAt:
              isScheduled && scheduledAt ? new Date(scheduledAt) : null,
            isScheduled: isScheduled || false,
          },
        });

        // Increment postsCount user jika post berhasil dibuat DAN bukan privileged role
        if (!privilegedRoles.includes(user.role)) {
          await tx.user.update({
            where: { userId },
            data: { postsCount: { increment: 1 } },
          });
        }

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
      const {
        title,
        description,
        category,
        mediaUrl,
        sections,
        blurred,
        scheduledAt,
        isScheduled,
      } = req.body;
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
            ...(blurred !== undefined && { blurred }),
            ...(scheduledAt !== undefined && {
              scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            }),
            ...(isScheduled !== undefined && { isScheduled }),
            // Update isPublished based on scheduling
            ...(isScheduled !== undefined && {
              isPublished: isScheduled ? false : existingPost.isPublished,
            }),
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

      // Decrement postsCount user (not below 0)
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { postsCount: true },
      });
      if (user && user.postsCount > 0) {
        await prisma.user.update({
          where: { userId },
          data: { postsCount: { decrement: 1 } },
        });
      }

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
      const { page = 1, limit = 20, includeDeleted = false } = req.query;
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

  // Increment view count only
  incrementViewCount: async (req, res) => {
    try {
      const { postId } = req.params;

      // Check if post exists in database first
      const post = await prisma.post.findFirst({
        where: { postId, isDeleted: false },
        select: { postId: true },
      });

      // If post doesn't exist in database, it might be an Axiom post
      if (!post) {
        // For Axiom posts, we can't increment view count in database
        // Just return success without error
        return res.status(200).json({
          success: true,
          message: "View count not incremented for Axiom posts",
          isAxiomPost: true,
        });
      }

      // Increment view count for database posts
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
      const allowedRoles = ["owner", "admin"];
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
              createdAt: true,
              star: true,
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
      const allowedRoles = ["owner", "admin"];
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
              createdAt: true,
              star: true,
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
      const allowedRoles = ["owner", "admin"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const { q, category, author, page = 1, limit = 20 } = req.query;
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
              createdAt: true,
              star: true,
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
      const allowedRoles = ["owner", "admin"];
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

        // Decrement postsCount user jika post berhasil dihapus
        const currentUser = await tx.user.findUnique({
          where: { userId: post.author.userId },
          select: { postsCount: true },
        });

        await tx.user.update({
          where: { userId: post.author.userId },
          data: {
            postsCount: Math.max(0, (currentUser?.postsCount || 0) - 1),
          },
        });

        // Create notification for the author
        const notification = await tx.notification.create({
          data: {
            userId: post.author.userId,
            actorId: req.user.userId,
            type: "post_force_deleted",
            content: `Post "${post.title}" has been force deleted by ${requesterRole} because it doesn't meet the standards.`,
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

  // Get all published posts with pagination (only for certain roles)
  getPublishedPosts: async (req, res) => {
    try {
      const { limit, offset = 0 } = req.query;

      // Validasi wajib parameter limit untuk mencegah memory overload
      if (!limit) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' is required. Example: ?limit=20&offset=0",
          example: "/api/posts/manage/published?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      // Validasi range limit
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive number (minimum 1)",
          example: "/api/posts/manage/published?limit=20&offset=0",
        });
      }

      if (parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'limit' cannot exceed 100 to prevent memory issues",
          example: "/api/posts/manage/published?limit=20&offset=0",
          maxLimit: 100,
        });
      }

      // Validasi offset
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'offset' must be a non-negative number",
          example: "/api/posts/manage/published?limit=20&offset=0",
        });
      }

      const allowedRoles = ["owner", "admin"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const currentUserId = req.user?.userId;

      // Log untuk debugging
      console.log(
        `📊 getPublishedPosts called - Limit: ${parsedLimit}, Offset: ${parsedOffset}, User: ${
          currentUserId || "Anonymous"
        }`
      );

      const whereClause = {
        isPublished: true,
        isDeleted: false,
      };

      // Optimized database query - only essential fields
      console.log(
        `🔍 Querying published posts: skip=${parsedOffset}, take=${parsedLimit}`
      );

      const publishedPosts = await prisma.post.findMany({
        where: whereClause,
        select: {
          // Essential post fields only
          postId: true,
          userId: true,
          title: true,
          description: true,
          category: true,
          mediaUrl: true,
          blurred: true,
          viewsCount: true,
          likesCount: true,
          sharesCount: true,
          createdAt: true,
          isPublished: true,
          // Essential author fields only
          author: {
            select: {
              userId: true,
              username: true,
              profilePic: true,
              role: true,
              createdAt: true,
              star: true,
            },
          },
          // Limited sections for performance
          sections: {
            select: {
              sectionId: true,
              type: true,
              content: true,
              src: true,
              order: true,
              imageDetail: true,
            },
            orderBy: { order: "asc" },
            take: 3, // Only first 3 sections for list view
          },
          // Quick count only
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          // User like status if authenticated
          ...(currentUserId && {
            likes: {
              where: { userId: currentUserId },
              select: { likeId: true },
              take: 1,
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        skip: parsedOffset,
        take: parsedLimit,
      });

      console.log(
        `✅ Published posts query completed: ${publishedPosts.length} posts retrieved`
      );

      // Transform posts - minimal processing
      const transformedPosts = publishedPosts.map((post) => ({
        ...post,
        isLiked: currentUserId ? post.likes?.length > 0 || false : false,
        likes: undefined, // Remove likes array from response
      }));

      // Quick count query
      const totalPublishedPosts = await prisma.post.count({
        where: whereClause,
      });

      console.log(
        `✅ Response: ${transformedPosts.length}/${totalPublishedPosts} published posts, offset=${parsedOffset}, limit=${parsedLimit}`
      );

      // Send response immediately - no additional processing
      return res.status(200).json({
        success: true,
        data: transformedPosts,
        pagination: {
          offset: parsedOffset,
          limit: parsedLimit,
          totalItems: totalPublishedPosts,
          returned: transformedPosts.length,
          hasMore: parsedOffset + transformedPosts.length < totalPublishedPosts,
        },
        count: transformedPosts.length,
        totalCount: totalPublishedPosts,
        meta: {
          endpoint: "/api/posts/manage/published",
          queryTime: new Date().toISOString(),
          note: "Published posts with pagination - use limit and offset parameters",
        },
      });
    } catch (error) {
      console.error("Error fetching published posts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch published posts",
        error: error.message,
      });
    }
  },

  // Search published posts (only for certain roles)
  searchPublishedPosts: async (req, res) => {
    try {
      const allowedRoles = ["owner", "admin"];
      const requesterRole =
        req.headers["x-user-role"] || (req.user && req.user.role);
      if (!allowedRoles.includes(requesterRole)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only staff can access this endpoint" });
      }

      const { q, category, author, page = 1, limit = 20 } = req.query;
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
              createdAt: true,
              star: true,
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
      const allowedRoles = ["owner", "admin"];
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

        // Decrement postsCount user jika post berhasil dihapus
        const currentUser = await tx.user.findUnique({
          where: { userId: post.author.userId },
          select: { postsCount: true },
        });

        await tx.user.update({
          where: { userId: post.author.userId },
          data: {
            postsCount: Math.max(0, (currentUser?.postsCount || 0) - 1),
          },
        });

        // Create notification for the author
        const notification = await tx.notification.create({
          data: {
            userId: post.author.userId,
            actorId: req.user.userId,
            type: "post_deleted",
            content: `Post "${post.title}" has been deleted by ${requesterRole}.`,
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
      const allowedRoles = ["owner", "admin"];
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
              content: `Post "${post.title}" has been approved and published by ${requesterRole}.`,
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
      const allowedRoles = ["owner", "admin"];
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

        // Group posts by author to avoid duplicate decrements
        const postsByAuthor = {};
        posts.forEach((post) => {
          if (!postsByAuthor[post.author.userId]) {
            postsByAuthor[post.author.userId] = [];
          }
          postsByAuthor[post.author.userId].push(post);
        });

        for (const post of posts) {
          // Delete related data first
          await tx.contentSection.deleteMany({
            where: { postId: post.postId },
          });
          await tx.comment.deleteMany({ where: { postId: post.postId } });
          await tx.like.deleteMany({ where: { postId: post.postId } });
          await tx.post.delete({ where: { postId: post.postId } });

          deletedPosts.push(post);

          // Decrement postsCount for each author (only once per author)
          for (const [authorId, authorPosts] of Object.entries(postsByAuthor)) {
            await tx.user.update({
              where: { userId: authorId },
              data: {
                postsCount: {
                  decrement: authorPosts.length,
                  // Ensure postsCount doesn't go below 0
                  set: Math.max(
                    0,
                    (
                      await tx.user.findUnique({
                        where: { userId: authorId },
                        select: { postsCount: true },
                      })
                    ).postsCount - authorPosts.length
                  ),
                },
              },
            });
          }

          // Create notification for the author
          const notification = await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: req.user.userId,
              type: "post_deleted",
              content: `Post "${post.title}" has been deleted by ${requesterRole}.`,
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
      const allowedRoles = ["owner", "admin"];
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

        // Group posts by author to avoid duplicate decrements
        const postsByAuthor = {};
        posts.forEach((post) => {
          if (!postsByAuthor[post.author.userId]) {
            postsByAuthor[post.author.userId] = [];
          }
          postsByAuthor[post.author.userId].push(post);
        });

        for (const post of posts) {
          // Delete related data first
          await tx.contentSection.deleteMany({
            where: { postId: post.postId },
          });
          await tx.comment.deleteMany({ where: { postId: post.postId } });
          await tx.like.deleteMany({ where: { postId: post.postId } });
          await tx.post.delete({ where: { postId: post.postId } });

          forceDeletedPosts.push(post);

          // Decrement postsCount for each author (only once per author)
          for (const [authorId, authorPosts] of Object.entries(postsByAuthor)) {
            await tx.user.update({
              where: { userId: authorId },
              data: {
                postsCount: {
                  decrement: authorPosts.length,
                  // Ensure postsCount doesn't go below 0
                  set: Math.max(
                    0,
                    (
                      await tx.user.findUnique({
                        where: { userId: authorId },
                        select: { postsCount: true },
                      })
                    ).postsCount - authorPosts.length
                  ),
                },
              },
            });
          }

          // Create notification for the author
          const notification = await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: req.user.userId,
              type: "post_force_deleted",
              content: `Post "${post.title}" has been force deleted by ${requesterRole} because it doesn't meet the standards.`,
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

  // Endpoint untuk mengambil postsCount dan role user yang sedang login
  getUserPostsCount: async (req, res) => {
    try {
      const { userId } = req.user;
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { postsCount: true, role: true },
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      res.status(200).json({
        success: true,
        postsCount: user.postsCount,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch posts count",
        error: error.message,
      });
    }
  },

  // Function to publish scheduled posts (can be called by cron job or manually)
  publishScheduledPosts: async () => {
    try {
      const now = new Date();

      // Find all scheduled posts that should be published
      const scheduledPosts = await prisma.post.findMany({
        where: {
          isScheduled: true,
          isPublished: false,
          isDeleted: false,
          scheduledAt: {
            lte: now, // Less than or equal to current time
          },
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

      if (scheduledPosts.length === 0) {
        console.log("No scheduled posts to publish");
        return { success: true, publishedCount: 0 };
      }

      // Publish all scheduled posts
      const publishedPosts = await prisma.$transaction(async (tx) => {
        const published = [];

        for (const post of scheduledPosts) {
          const updatedPost = await tx.post.update({
            where: { postId: post.postId },
            data: {
              isPublished: true,
              isScheduled: false,
              scheduledAt: null, // Clear scheduled date after publishing
            },
          });

          published.push(updatedPost);

          // Create notification for the author
          await tx.notification.create({
            data: {
              userId: post.author.userId,
              actorId: post.author.userId, // Self notification
              type: "post_scheduled_published",
              content: `Your scheduled post "${post.title}" has been published automatically.`,
              actionUrl: `/post/${post.postId}`,
            },
          });
        }

        return published;
      });

      console.log(`Published ${publishedPosts.length} scheduled posts`);
      return { success: true, publishedCount: publishedPosts.length };
    } catch (error) {
      console.error("Error publishing scheduled posts:", error);
      return { success: false, error: error.message };
    }
  },
};

module.exports = postController;

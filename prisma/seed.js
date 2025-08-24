// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

/**
 * Usage:
 *  node prisma/seed.js                 -> seed default (creates DUMMY category posts)
 *  node prisma/seed.js --reset         -> delete dummy-post-* & dummy-section-* then seed
 *  node prisma/seed.js --deleteDummy   -> delete posts with category 'DUMMY' only (then exit)
 *  node prisma/seed.js --deleteAll     -> delete ALL posts & contentSections (then exit)
 *
 * NPM Scripts:
 *  npm run seed                        -> create dummy posts
 *  npm run seed:reset                  -> reset and create dummy posts
 *  npm run seed:deleteDummy            -> delete only DUMMY category posts (RECOMMENDED)
 *  npm run seed:delete                 -> delete ALL posts (DANGEROUS)
 *
 * ⚠️  IMPORTANT: Use "seed:deleteDummy" WITHOUT SPACE between "seed" and ":deleteDummy"
 *     WRONG: npm run seed :deleteDummy
 *     RIGHT: npm run seed:deleteDummy
 *
 *  Environment:
 *    SEED_TOTAL   -> number of posts to create (default 1000)
 *    SEED_USER_ID -> single user id to use (if you prefer single user); otherwise script uses provided userIds intersection
 */

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");
  const shouldDeleteAll = args.includes("--deleteAll");
  const shouldDeleteDummy = args.includes("--deleteDummy");

  // Check for common mistake commands
  if (args.includes(":deleteDummy")) {
    console.error("❌ Invalid command: ':deleteDummy'");
    console.error("💡 Correct usage: npm run seed:deleteDummy (without space)");
    console.error("   or: node prisma/seed.js --deleteDummy");
    process.exit(1);
  }

  console.log("🌱 Starting seed...");

  // Debug: Show what arguments were received
  if (args.length > 0) {
    console.log(`🔧 Arguments received: ${args.join(", ")}`);
  }

  // ----- configuration -----
  const categories = ["DUMMY"]; // Using single DUMMY category for easy cleanup
  const originalCategories = [
    "TECH",
    "CRYPTO",
    "GAMING",
    "LIFESTYLE",
    "EDUCATION",
  ]; // Keep for reference

  // ----- deleteDummy mode (early exit) -----
  if (shouldDeleteDummy) {
    console.log(
      "🗑️  --deleteDummy flag detected. Deleting posts with category 'DUMMY'..."
    );

    try {
      // First, find all DUMMY posts
      const dummyPosts = await prisma.post.findMany({
        where: { category: "DUMMY" },
        select: { postId: true },
      });

      if (dummyPosts.length === 0) {
        console.log("   ℹ️  No DUMMY posts found to delete.");
        return;
      }

      const dummyPostIds = dummyPosts.map((p) => p.postId);
      console.log(`   🎯 Found ${dummyPosts.length} DUMMY posts to delete...`);

      // Use batch deletion with longer timeout to avoid transaction timeout
      const result = await prisma.$transaction(
        async (tx) => {
          // Delete in proper order to avoid foreign key constraint issues
          // 1. Delete content sections
          const delSections = await tx.contentSection.deleteMany({
            where: { postId: { in: dummyPostIds } },
          });
          console.log(`   - contentSections deleted: ${delSections.count}`);

          // 2. Delete comments (including nested comments)
          const delComments = await tx.comment.deleteMany({
            where: { postId: { in: dummyPostIds } },
          });
          console.log(`   - comments deleted: ${delComments.count}`);

          // 3. Delete likes
          const delLikes = await tx.like.deleteMany({
            where: { postId: { in: dummyPostIds } },
          });
          console.log(`   - likes deleted: ${delLikes.count}`);

          // 4. Finally delete the posts
          const delPosts = await tx.post.deleteMany({
            where: { category: "DUMMY" },
          });
          console.log(`   - DUMMY posts deleted: ${delPosts.count}`);

          return {
            message: "deleteDummy completed successfully",
            count: delPosts.count,
            details: {
              posts: delPosts.count,
              sections: delSections.count,
              comments: delComments.count,
              likes: delLikes.count,
            },
          };
        },
        {
          timeout: 30000, // 30 seconds timeout for large deletions
          maxWait: 35000, // 35 seconds max wait
        }
      );

      console.log(`✅ ${result.message}`);
      console.log(`📊 Deletion summary:`);
      console.log(`   - Posts: ${result.details.posts}`);
      console.log(`   - Sections: ${result.details.sections}`);
      console.log(`   - Comments: ${result.details.comments}`);
      console.log(`   - Likes: ${result.details.likes}`);

      console.log("🔌 Database connection will be closed...");
      return; // This will exit the main function and go to finally block
    } catch (err) {
      console.error("❌ deleteDummy failed:", err);

      // If transaction timeout, try alternative approach with batch deletion
      if (err.code === "P2028") {
        console.log(
          "🔄 Transaction timeout detected. Trying batch deletion approach..."
        );

        try {
          // Delete in batches without transaction
          const batchSize = 1000;
          let totalDeleted = 0;

          // Get all DUMMY post IDs
          const allDummyPosts = await prisma.post.findMany({
            where: { category: "DUMMY" },
            select: { postId: true },
          });

          const allDummyPostIds = allDummyPosts.map((p) => p.postId);
          console.log(
            `   🎯 Processing ${allDummyPostIds.length} posts in batches of ${batchSize}...`
          );

          // Process in batches
          for (let i = 0; i < allDummyPostIds.length; i += batchSize) {
            const batchIds = allDummyPostIds.slice(i, i + batchSize);

            // Delete related data for this batch
            await prisma.contentSection.deleteMany({
              where: { postId: { in: batchIds } },
            });

            await prisma.comment.deleteMany({
              where: { postId: { in: batchIds } },
            });

            await prisma.like.deleteMany({
              where: { postId: { in: batchIds } },
            });

            // Delete posts in this batch
            const deletedBatch = await prisma.post.deleteMany({
              where: { postId: { in: batchIds } },
            });

            totalDeleted += deletedBatch.count;
            console.log(
              `   📦 Batch ${Math.floor(i / batchSize) + 1}: Deleted ${
                deletedBatch.count
              } posts (Total: ${totalDeleted})`
            );
          }

          console.log(`✅ Batch deletion completed successfully!`);
          console.log(`📊 Total posts deleted: ${totalDeleted}`);
          return;
        } catch (batchErr) {
          console.error("❌ Batch deletion also failed:", batchErr);
          process.exit(1);
        }
      }

      process.exit(1);
    }
  }

  // Get all existing users from database randomly (exclude owner role)
  console.log("🔍 Fetching existing users from database (excluding owners)...");
  const existingUsers = await prisma.user.findMany({
    select: { userId: true, username: true, role: true },
    where: {
      role: { not: "owner" }, // Exclude owner role
    },
    orderBy: { createdAt: "desc" }, // Get newest users first
  });

  if (existingUsers.length === 0) {
    console.error(
      "❌ No non-owner users found in database. Please create some non-owner users first."
    );
    process.exit(1);
  }

  console.log(`🎯 Found ${existingUsers.length} non-owner users for seeding`);

  // Shuffle array to get random users
  const shuffledUsers = existingUsers.sort(() => 0.5 - Math.random());
  const userIds = shuffledUsers.map((user) => user.userId);

  // ----- deleteAll mode (early exit) -----
  if (shouldDeleteAll) {
    console.log("⚠️  --deleteAll flag detected. Deleting ALL related data...");

    try {
      // urutan penting: child → parent
      const delSections = await prisma.contentSection.deleteMany({});
      console.log(`   - contentSection deleted: ${delSections.count}`);

      const delComments = await prisma.comment.deleteMany({});
      console.log(`   - comments deleted: ${delComments.count}`);

      const delLikes = await prisma.like.deleteMany({});
      console.log(`   - likes deleted: ${delLikes.count}`);

      const delPosts = await prisma.post.deleteMany({});
      console.log(`   - posts deleted: ${delPosts.count}`);

      console.log("✅ deleteAll completed. Exiting.");
      return;
    } catch (err) {
      console.error("❌ deleteAll failed:", err);
      process.exit(1);
    }
  }

  // ----- cleanup dummy data automatically (by category and ID pattern) -----
  console.log("🧹 Cleaning up existing dummy data...");
  try {
    // Delete by category "DUMMY" first
    const deletedPostsByCategory = await prisma.post.deleteMany({
      where: { category: "DUMMY" },
    });
    console.log(
      `   ✅ Cleaned posts by category DUMMY: ${deletedPostsByCategory.count}`
    );

    // Also cleanup by ID pattern (for backward compatibility)
    const deletedSections = await prisma.contentSection.deleteMany({
      where: { sectionId: { startsWith: "dummy-section-" } },
    });
    const deletedPosts = await prisma.post.deleteMany({
      where: { postId: { startsWith: "dummy-post-" } },
    });
    console.log(`   ✅ Cleaned dummy sections by ID: ${deletedSections.count}`);
    console.log(`   ✅ Cleaned dummy posts by ID: ${deletedPosts.count}`);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    return;
  }

  // ----- reset dummy items (additional cleanup if --reset flag) -----
  if (shouldReset) {
    console.log("🗑️  --reset flag detected. Additional cleanup...");
    // Already cleaned above, so just log
    console.log("   ✅ Reset completed");
  }

  // ----- use existing users from database -----
  // If SEED_USER_ID env provided, prefer that single id (and validate it)
  const envSingleUser = process.env.SEED_USER_ID;
  let useUserIds = userIds;

  if (envSingleUser) {
    const singleUser = existingUsers.find((u) => u.userId === envSingleUser);
    if (singleUser) {
      if (singleUser.role === "owner") {
        console.error(
          `❌ SEED_USER_ID ${envSingleUser} is an owner role, which is excluded from seeding`
        );
        process.exit(1);
      }
      useUserIds = [envSingleUser];
      console.log(
        `🔧 SEED_USER_ID provided in env -> using single userId ${envSingleUser} [${singleUser.role}]`
      );
    } else {
      console.error(
        `❌ SEED_USER_ID ${envSingleUser} not found in non-owner users database`
      );
      process.exit(1);
    }
  }

  console.log(
    `👥 Found ${existingUsers.length} non-owner users in DB (will use ${useUserIds.length} for seeding):`
  );
  existingUsers
    .slice(0, 5)
    .forEach((u) =>
      console.log(
        `  - ${u.userId} (${u.username || "no-username"}) [${u.role}]`
      )
    );
  if (existingUsers.length > 5) {
    console.log(`  ... and ${existingUsers.length - 5} more non-owner users`);
  }

  // ----- seeding params -----
  const TOTAL = parseInt(process.env.SEED_TOTAL || "10000", 10);
  console.log(
    `📝 Creating ${TOTAL} dummy posts using ${useUserIds.length} non-owner user(s)...`
  );
  console.log(`🚫 Owner users are excluded from seeding process`);
  console.log(
    `🎲 Posts will be randomly distributed among available non-owner users`
  );

  let createdPosts = 0;
  let failedPosts = 0;

  for (let i = 1; i <= TOTAL; i++) {
    const category = categories[(i - 1) % categories.length]; // Will always be "DUMMY"
    const topicCategory =
      originalCategories[(i - 1) % originalCategories.length]; // For variation in content
    const userId = useUserIds[(i - 1) % useUserIds.length];

    // unique ids to avoid unique constraint
    const postId = `dummy-post-${crypto.randomUUID()}`;
    const sectionId = `dummy-section-${crypto.randomUUID()}`;

    try {
      const newPost = await prisma.post.create({
        data: {
          postId,
          userId,
          title: `Dummy Post ${i} - ${topicCategory} Content`,
          description: `This is a dummy post for testing purposes. Topic: ${topicCategory}. Category: ${category}`,
          content: `This is the content of dummy post ${i}. It contains some sample text to simulate real post content. Topic: ${topicCategory}. Category: ${category}`,
          category, // Always "DUMMY" for easy cleanup
          mediaUrl: `/bg.png`,
          blurred: false,
          viewsCount: Math.floor(Math.random() * 1000),
          likesCount: Math.floor(Math.random() * 100),
          sharesCount: Math.floor(Math.random() * 50),
          createdAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
          isDeleted: false,
          isPublished: true,
        },
      });

      await prisma.contentSection.create({
        data: {
          sectionId,
          postId: newPost.postId,
          type: "text",
          content: `This is the content section for dummy post ${i}. Topic: ${topicCategory}. This post is marked as category ${category} for easy cleanup.`,
          src: null,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      createdPosts++;
      if (i % 50 === 0 || i === TOTAL) {
        const currentUser = existingUsers.find((u) => u.userId === userId);
        console.log(
          `✅ Created ${i}/${TOTAL} DUMMY posts (topic: ${topicCategory}, user: ${
            currentUser?.username || "unknown"
          } [${currentUser?.role || "unknown"}])`
        );
      }
    } catch (error) {
      failedPosts++;
      console.error(
        `❌ Failed to create dummy post ${i}:`,
        error.message || error
      );
      if (error.code) console.error("   Prisma code:", error.code);
      // continue to next
    }
  }

  console.log("\n🎉 Seed completed!");
  console.log("📊 Summary:");
  console.log(`   ✅ Created: ${createdPosts} DUMMY posts`);
  console.log(`   ❌ Failed: ${failedPosts} posts`);
  console.log(`   📝 Total attempted: ${TOTAL}`);
  console.log(`   🏷️  All posts created with category: DUMMY`);
  console.log(
    `   🗑️  To delete all dummy posts, run: node prisma/seed.js --deleteDummy`
  );
  if (shouldReset) console.log("🔄 Database was reset before seeding");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed");
  });

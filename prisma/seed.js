// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

/**
 * Usage:
 *  node prisma/seed.js                 -> seed default (no reset)
 *  node prisma/seed.js --reset         -> delete dummy-post-* & dummy-section-* then seed
 *  node prisma/seed.js --deleteAll     -> delete ALL posts & contentSections (then exit)
 *  Environment:
 *    SEED_TOTAL   -> number of posts to create (default 1000)
 *    SEED_USER_ID -> single user id to use (if you prefer single user); otherwise script uses provided userIds intersection
 */

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");
  const shouldDeleteAll = args.includes("--deleteAll");

  console.log("🌱 Starting seed...");

  // ----- configuration -----
  const categories = ["TECH", "CRYPTO", "GAMING", "LIFESTYLE", "EDUCATION"];

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

  // ----- cleanup dummy data automatically -----
  console.log("🧹 Cleaning up existing dummy data...");
  try {
    const deletedSections = await prisma.contentSection.deleteMany({
      where: { sectionId: { startsWith: "dummy-section-" } },
    });
    const deletedPosts = await prisma.post.deleteMany({
      where: { postId: { startsWith: "dummy-post-" } },
    });
    console.log(`   ✅ Cleaned dummy sections: ${deletedSections.count}`);
    console.log(`   ✅ Cleaned dummy posts: ${deletedPosts.count}`);
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
  const TOTAL = parseInt(process.env.SEED_TOTAL || "1000", 10);
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
    const category = categories[(i - 1) % categories.length];
    const userId = useUserIds[(i - 1) % useUserIds.length];

    // unique ids to avoid unique constraint
    const postId = `dummy-post-${crypto.randomUUID()}`;
    const sectionId = `dummy-section-${crypto.randomUUID()}`;

    try {
      const newPost = await prisma.post.create({
        data: {
          postId,
          userId,
          title: `Dummy Post ${i} - ${category} Content`,
          description: `This is a dummy post for testing purposes. Category: ${category}`,
          content: `This is the content of dummy post ${i}. It contains some sample text to simulate real post content. Category: ${category}`,
          category,
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
          content: `This is the content section for dummy post ${i}.`,
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
          `✅ Created ${i}/${TOTAL} posts (current user: ${
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
  console.log(`   ✅ Created: ${createdPosts} posts`);
  console.log(`   ❌ Failed: ${failedPosts} posts`);
  console.log(`   📝 Total attempted: ${TOTAL}`);
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

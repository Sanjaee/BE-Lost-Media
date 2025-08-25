const postController = require("../controllers/postControlle");

// Function to check and publish scheduled posts
const checkScheduledPosts = async () => {
  try {
    console.log("🔍 Checking for scheduled posts to publish...");
    const result = await postController.publishScheduledPosts();

    if (result.success) {
      if (result.publishedCount > 0) {
        console.log(`✅ Published ${result.publishedCount} scheduled posts`);
      } else {
        console.log("ℹ️ No scheduled posts to publish");
      }
    } else {
      console.error("❌ Error publishing scheduled posts:", result.error);
    }
  } catch (error) {
    console.error("❌ Error in scheduled posts check:", error);
  }
};

// Start the scheduler (check every minute)
const startScheduler = () => {
  console.log("🚀 Starting scheduled posts scheduler...");

  // Check immediately on startup
  checkScheduledPosts();

  // Then check every minute
  setInterval(checkScheduledPosts, 60 * 1000);
};

module.exports = {
  checkScheduledPosts,
  startScheduler,
};

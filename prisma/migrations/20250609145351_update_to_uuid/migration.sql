/*
  Warnings:

  - The primary key for the `comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `content_sections` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `followers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `posts` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_postId_fkey";

-- DropForeignKey
ALTER TABLE "content_sections" DROP CONSTRAINT "content_sections_postId_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_commentId_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_postId_fkey";

-- AlterTable
ALTER TABLE "comments" DROP CONSTRAINT "comments_pkey",
ALTER COLUMN "commentId" DROP DEFAULT,
ALTER COLUMN "commentId" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("commentId");
DROP SEQUENCE "comments_commentId_seq";

-- AlterTable
ALTER TABLE "content_sections" DROP CONSTRAINT "content_sections_pkey",
ALTER COLUMN "sectionId" DROP DEFAULT,
ALTER COLUMN "sectionId" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ADD CONSTRAINT "content_sections_pkey" PRIMARY KEY ("sectionId");
DROP SEQUENCE "content_sections_sectionId_seq";

-- AlterTable
ALTER TABLE "followers" DROP CONSTRAINT "followers_pkey",
ALTER COLUMN "followId" DROP DEFAULT,
ALTER COLUMN "followId" SET DATA TYPE TEXT,
ADD CONSTRAINT "followers_pkey" PRIMARY KEY ("followId");
DROP SEQUENCE "followers_followId_seq";

-- AlterTable
ALTER TABLE "likes" DROP CONSTRAINT "likes_pkey",
ALTER COLUMN "likeId" DROP DEFAULT,
ALTER COLUMN "likeId" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ALTER COLUMN "commentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("likeId");
DROP SEQUENCE "likes_likeId_seq";

-- AlterTable
ALTER TABLE "messages" DROP CONSTRAINT "messages_pkey",
ALTER COLUMN "messageId" DROP DEFAULT,
ALTER COLUMN "messageId" SET DATA TYPE TEXT,
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("messageId");
DROP SEQUENCE "messages_messageId_seq";

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
ALTER COLUMN "notifId" DROP DEFAULT,
ALTER COLUMN "notifId" SET DATA TYPE TEXT,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("notifId");
DROP SEQUENCE "notifications_notifId_seq";

-- AlterTable
ALTER TABLE "posts" DROP CONSTRAINT "posts_pkey",
ALTER COLUMN "postId" DROP DEFAULT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("postId");
DROP SEQUENCE "posts_postId_seq";

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("postId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("postId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("commentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("postId") ON DELETE CASCADE ON UPDATE CASCADE;

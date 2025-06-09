/*
  Warnings:

  - Added the required column `category` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "viewsCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "content_sections" (
    "sectionId" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "src" TEXT,
    "order" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sections_pkey" PRIMARY KEY ("sectionId")
);

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("postId") ON DELETE CASCADE ON UPDATE CASCADE;

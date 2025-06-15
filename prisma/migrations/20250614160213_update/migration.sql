/*
  Warnings:

  - You are about to drop the column `imageDetail` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "content_sections" ADD COLUMN     "imageDetail" TEXT[];

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "imageDetail";

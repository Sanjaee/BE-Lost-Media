-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("commentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

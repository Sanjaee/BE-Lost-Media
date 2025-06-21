/*
  Warnings:

  - Made the column `star` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member',
ALTER COLUMN "star" SET NOT NULL;

/*
  Warnings:

  - You are about to drop the column `sample_size` on the `profiles` table. All the data in the column will be lost.
  - The `created_at` column on the `profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `country_name` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "sample_size",
ADD COLUMN     "country_name" TEXT NOT NULL,
DROP COLUMN "created_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "profiles_gender_idx" ON "profiles"("gender");

-- CreateIndex
CREATE INDEX "profiles_age_group_idx" ON "profiles"("age_group");

-- CreateIndex
CREATE INDEX "profiles_country_id_idx" ON "profiles"("country_id");

-- CreateIndex
CREATE INDEX "profiles_age_idx" ON "profiles"("age");

-- CreateIndex
CREATE INDEX "profiles_gender_probability_idx" ON "profiles"("gender_probability");

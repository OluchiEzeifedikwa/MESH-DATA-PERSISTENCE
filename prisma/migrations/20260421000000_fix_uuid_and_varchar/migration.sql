-- AlterTable: cast id from TEXT to UUID using existing UUID v7 values
ALTER TABLE "profiles" ALTER COLUMN "id" TYPE UUID USING "id"::UUID;

-- AlterTable: enforce VARCHAR(2) on country_id
ALTER TABLE "profiles" ALTER COLUMN "country_id" TYPE VARCHAR(2);

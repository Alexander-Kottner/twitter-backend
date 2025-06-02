-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iv" VARCHAR(32),
ADD COLUMN     "tag" VARCHAR(32);

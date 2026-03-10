-- Add encrypted API key fields to User table
ALTER TABLE "User" ADD COLUMN "anthropicKeyEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "anthropicKeyIv" TEXT;
ALTER TABLE "User" ADD COLUMN "anthropicKeyTag" TEXT;
ALTER TABLE "User" ADD COLUMN "serpApiKeyEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "serpApiKeyIv" TEXT;
ALTER TABLE "User" ADD COLUMN "serpApiKeyTag" TEXT;

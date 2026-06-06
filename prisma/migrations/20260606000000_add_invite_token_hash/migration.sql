-- Add a hashed one-time token for invite acceptance.
ALTER TABLE "invites" ADD COLUMN "token_hash" TEXT;

CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateTable
CREATE TABLE "next_auth"."Authenticator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credentialID" VARCHAR(1024) NOT NULL,
    "userId" UUID NOT NULL,
    "counter" BIGINT NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "next_auth"."Authenticator"("credentialID");

-- CreateIndex
CREATE INDEX "Authenticator_userId_idx" ON "next_auth"."Authenticator"("userId");

-- AddForeignKey
ALTER TABLE "next_auth"."Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "next_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

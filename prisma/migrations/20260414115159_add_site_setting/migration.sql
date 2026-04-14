-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- Default messaging links (idempotent)
INSERT INTO "SiteSetting" ("id", "key", "value", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'whatsapp_link', 'https://wa.me/905362115993', NOW()),
  (gen_random_uuid()::text, 'wechat_id', 'kismetgoreme', NOW()),
  (gen_random_uuid()::text, 'line_link', 'https://line.me/ti/p/~kismetgoreme', NOW())
ON CONFLICT ("key") DO NOTHING;

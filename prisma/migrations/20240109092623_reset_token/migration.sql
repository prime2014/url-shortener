-- DropForeignKey
ALTER TABLE "clicklocation" DROP CONSTRAINT "clicklocation_urlId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "clicklocation" ADD CONSTRAINT "clicklocation_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "urlstatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

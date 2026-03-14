import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// .env ファイルから環境変数を明示的に読み込む
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});

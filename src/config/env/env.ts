import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT ?? 1335,
  DATABASE_HOST: process.env.DATABASE_HOST ?? "localhost",
  DATABASE_PORT: process.env.DATABASE_PORT ?? "5432",
  DATABASE_NAME: process.env.DATABASE_NAME ?? "database",
  DATABASE_USERNAME: process.env.DATABASE_USERNAME ?? "user",
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? "password",
  DATABASE_SSL: process.env.DATABASE_SSL === "true",
  NODE_ENV: process.env.NODE_ENV ?? "develop",
  DB_ADMIN_PUBLIC_KEY: process.env.DB_ADMIN_PUBLIC_KEY ?? "",
  SOLANA_WALLET_PRIVATE_KEY: process.env.SOLANA_WALLET_PRIVATE_KEY ?? "",
  SOLANA_API_URL: process.env.SOLANA_API_URL ?? "https://api.devnet.solana.com",
  DEFAULT_DEPIN_PROGRAM_ID:
    process.env.DEFAULT_DEPIN_PROGRAM_ID ??
    "D1sMCRu3tRwCviHUDj69WrRQzDoVKd2m2YKydRyauYmJ",
  DEFAULT_REWARD_SYSTEM_PROGRAM_ID:
    process.env.DEFAULT_REWARD_SYSTEM_PROGRAM_ID ??
    "Ey6f9uyT1s3UrCGpc586aeHmEupYdfR2xo8Nh7TpqLhX",
  SOLANA_API_KEY: process.env.SOLANA_API_KEY ?? undefined,
  EXPLORERS_DATABASE_HOST: process.env.EXPLORERS_DATABASE_HOST ?? "localhost",
  EXPLORERS_DATABASE_PORT: process.env.EXPLORERS_DATABASE_PORT ?? "5432",
  EXPLORERS_DATABASE_NAME:
    process.env.EXPLORERS_DATABASE_NAME ?? "explorers_db",
  EXPLORERS_DATABASE_USERNAME:
    process.env.EXPLORERS_DATABASE_USERNAME ?? "explorer_user",
  EXPLORERS_DATABASE_PASSWORD:
    process.env.EXPLORERS_DATABASE_PASSWORD ?? "explorer_password",
  EXPLORERS_DATABASE_SSL: process.env.EXPLORERS_DATABASE_SSL === "true",
};

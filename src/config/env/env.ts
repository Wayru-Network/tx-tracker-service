import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT ?? 1335,
  DATABASE_HOST: process.env.DATABASE_HOST ?? 'localhost',
  DATABASE_PORT: process.env.DATABASE_PORT ?? '5432',
  DATABASE_NAME: process.env.DATABASE_NAME ?? 'database',
  DATABASE_USERNAME: process.env.DATABASE_USERNAME ?? 'user',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? 'password',
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  NODE_ENV: process.env.NODE_ENV ?? 'develop',
  DB_ADMIN_PUBLIC_KEY: process.env.DB_ADMIN_PUBLIC_KEY ?? '',
  SOLANA_WALLET_PRIVATE_KEY: process.env.SOLANA_WALLET_PRIVATE_KEY ?? '',
  SOLANA_API_URL: process.env.SOLANA_API_URL ?? 'https://api.devnet.solana.com',
  DEFAULT_DEPIN_PROGRAM_ID: process.env.DEFAULT_DEPIN_PROGRAM_ID ?? 'ECcNAeDo6TbYpr1bY2e1uybkiNEuRSbxRbqad4r1azK8',
  SOLANA_API_KEY: process.env.SOLANA_API_KEY ?? undefined
};
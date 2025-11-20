import { Pool } from "pg";
import { ENV } from "@/config/env/env";

const pool = new Pool({
  host: ENV.DATABASE_HOST,
  port: parseInt(ENV.DATABASE_PORT || "5432"),
  database: ENV.DATABASE_NAME,
  user: ENV.DATABASE_USERNAME,
  password: ENV.DATABASE_PASSWORD,
  ssl: ENV.DATABASE_SSL == true,
});

const explorers_pool = new Pool({
  host: ENV.EXPLORERS_DATABASE_HOST,
  port: parseInt(ENV.EXPLORERS_DATABASE_PORT || "5432"),
  database: ENV.EXPLORERS_DATABASE_NAME,
  user: ENV.EXPLORERS_DATABASE_USERNAME,
  password: ENV.EXPLORERS_DATABASE_PASSWORD,
  ssl: ENV.EXPLORERS_DATABASE_SSL == true,
});

export { explorers_pool };

export default pool;

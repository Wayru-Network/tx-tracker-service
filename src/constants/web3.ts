import { ENV } from "@config/env/env"

const key = ENV.SOLANA_API_KEY
const api_url = ENV.SOLANA_API_URL
export const SOLANA_API_URL = ((key && api_url) ? `${api_url}?api-key=${key}` : api_url) ?? 'http://localhost:8899';
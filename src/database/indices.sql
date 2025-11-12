-- Database indices for performance optimization
-- These indices improve query performance for the Token 2022 transfer listener
-- and other database operations

-- Index for hotspot_stake table: stake_nft_mint lookup
-- This is critical for batch checking NFT mints in the transfer listener
-- Only indexes non-unstaked stakes for better performance
CREATE INDEX IF NOT EXISTS idx_hotspot_stake_nft_mint 
ON hotspot_stake(stake_nft_mint) 
WHERE status != 'unstaked';

-- Index for hotspot_stake table: staker_wallet_address lookup
-- Used for querying stakes by wallet address
CREATE INDEX IF NOT EXISTS idx_hotspot_stake_staker_wallet 
ON hotspot_stake(staker_wallet_address) 
WHERE status != 'unstaked';

-- Composite index for common query patterns
-- Used when filtering by both wallet and status
CREATE INDEX IF NOT EXISTS idx_hotspot_stake_wallet_status 
ON hotspot_stake(staker_wallet_address, status) 
WHERE status != 'unstaked';

-- Index for updated_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_hotspot_stake_updated_at 
ON hotspot_stake(updated_at DESC);


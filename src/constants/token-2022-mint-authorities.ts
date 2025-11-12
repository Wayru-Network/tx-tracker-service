import { PublicKey } from "@solana/web3.js";

/**
 * Mint authorities for Token 2022 NFTs that we want to track
 * These are the mint authorities that should be monitored for transfers
 * Add new mint authorities here as needed
 */
export const TOKEN_2022_TRACKED_MINT_AUTHORITIES: PublicKey[] = [
    new PublicKey("EQUGQEigTt7wBWgGK3rMeYVEy6zWioEH6ME2cc3Uvdb7"),
];

/**
 * Get tracked mint authorities as string array (for logging)
 */
export const getTrackedMintAuthoritiesAsStrings = (): string[] => {
    return TOKEN_2022_TRACKED_MINT_AUTHORITIES.map(authority => authority.toString());
};


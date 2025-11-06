import pool from "@config/db"
import { Nfnode } from "@interfaces/api/nfnodes/nfnodes"

export const getNfnodeBySolanaAssetId = async (assetId: string): Promise<Nfnode | null> => {
    try {
        const client = await pool.connect()
        const result = await client.query<Nfnode>('SELECT * FROM nfnodes WHERE solana_asset_id = $1', [assetId])
        client.release()
        const document = result?.rows?.length ? result.rows[0] ?? null : null
        return document
    } catch (error) {
        console.error('Error getting nfnode by mint:', error)
        return null
    }
}
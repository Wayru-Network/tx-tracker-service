import pool from "@config/db"
import { Key } from "@interfaces/api/keys/keys"

export const getKeyByName = async (key: string): Promise<Key | null> => {
    try {
        const client = await pool.connect()
        const result = await client.query('SELECT * FROM keys WHERE name = $1', [key])
        client.release()
        const document = result?.rows?.length ? result.rows[0] : null
        return document
    } catch (error) {
        console.error('Error getting key by name:', error)
        return null
    }
}


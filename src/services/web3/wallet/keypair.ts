import { Keypair } from "@solana/web3.js"
import { base58 } from '@metaplex-foundation/umi/serializers';

export const getKeyPair = (private_key: string): Keypair => {
    const keypair = Keypair.fromSeed(base58.serialize(private_key).slice(0, 32))
    return keypair
}


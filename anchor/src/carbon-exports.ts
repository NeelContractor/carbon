// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import CarbonIDL from '../target/idl/carbon.json'
import type { Carbon } from '../target/types/carbon'

// Re-export the generated IDL and type
export { Carbon, CarbonIDL }

// The programId is imported from the program IDL.
export const CARBON_PROGRAM_ID = new PublicKey(CarbonIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getCarbonProgram(provider: AnchorProvider, address?: PublicKey): Program<Carbon> {
  return new Program({ ...CarbonIDL, address: address ? address.toBase58() : CarbonIDL.address } as Carbon, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getCarbonProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('4WEXh5GfWzfAyxmhAdVC5VFLxhj9hsv5zo7t6CeQMf5B')
    case 'mainnet-beta':
    default:
      return CARBON_PROGRAM_ID
  }
}

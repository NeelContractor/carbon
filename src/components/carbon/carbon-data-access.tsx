'use client'

import { getCarbonProgram, getCarbonProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import BN from 'bn.js'

interface InitializeArgs {
  authorityPubkey: PublicKey
}

interface RegisterIndustryArgs {
  industryAuthority: PublicKey
  COMPANY_NAME: string
  BOND_AMOUNT: BN
}

interface VerifyIndustryArgs {
  industryAuthority: PublicKey
  adminPubkey: PublicKey
}

interface DepositBondArgs {
  industryAuthority: PublicKey
  industryAuthorityPubkey: PublicKey
  depositAmount: BN
}

interface WithdrawBondArgs {
  industryAuthority: PublicKey
  industryAuthorityPubkey: PublicKey
  withdrawAmount: BN
}

interface SubmitEmissionReportArgs {
  co2Emitted: BN
  reportPeriod: string
  industryAuthorityPubkey: PublicKey
}

interface CreateAuctionArgs {
  adminPubkey: PublicKey
  BATCH_NUMBER: number
  TOTAL_TOKENS: BN
  START_PRICE: BN
  RESERVE_PRICE: BN
  AUCTION_DURATION: BN
}

interface PlaceBidArgs {
  industryAuthorityPubkey: PublicKey
  BATCH_NUMBER: number
  tokenAmount: BN
  bidTimestamp: BN
}

interface FinalizeAuctionArgs {
  BATCH_NUMBER: number
  adminPubkey: PublicKey
}

interface ClaimTokensArgs {
  BATCH_NUMBER: number
  industryAuthorityPubkey: PublicKey
  ctMintPubkey: PublicKey
  bidTimestamp: BN
}

interface WithdrawProceedsArgs {
  BATCH_NUMBER: number
  adminPubkey: PublicKey
  treasuryPubkey: PublicKey // Changed: Now requires treasury address
}

interface BurnCtForComplianceArgs {
  industryAuthorityPubkey: PublicKey
  ctMintPubkey: PublicKey
  burnAmount: BN
  emissionAmount: BN
}

interface CancelAuctionArgs {
  adminPubkey: PublicKey
  batchNumber: number // Fixed: lowercase to match usage
}

export function useCarbonProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getCarbonProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getCarbonProgram(provider, programId), [provider, programId])

  const auctionAccounts = useQuery({
    queryKey: ['auction', 'all', { cluster }],
    queryFn: () => program.account.auction.all(),
  })

  const bidAccounts = useQuery({
    queryKey: ['bid', 'all', { cluster }],
    queryFn: () => program.account.bid.all(),
  })

  const emissionReportAccounts = useQuery({
    queryKey: ['emissionReport', 'all', { cluster }],
    queryFn: () => program.account.emissionReport.all(),
  })

  const industryAccounts = useQuery({
    queryKey: ['industryAccount', 'all', { cluster }], // Fixed: unique query key
    queryFn: () => program.account.industryAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeHandler = useMutation<string, Error, InitializeArgs>({
    mutationKey: ['carbon', 'initialize', { cluster }], // Fixed: better naming
    mutationFn: async ({ authorityPubkey }) => {
      const ctMintKeypair = Keypair.generate()
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority')],
        program.programId
      )

      return await program.methods
        .initialize()
        .accountsStrict({
          authority: authorityPubkey,
          ctMint: ctMintKeypair.publicKey,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctMintKeypair]) // Added: signer for ct_mint
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await auctionAccounts.refetch()
      await bidAccounts.refetch()
      await emissionReportAccounts.refetch()
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Initialize error:', error)
      toast.error('Failed to initialize account')
    },
  })

  const registerIndustryHandler = useMutation<string, Error, RegisterIndustryArgs>({
    mutationKey: ['carbon', 'registerIndustry', { cluster }],
    mutationFn: async ({ industryAuthority, COMPANY_NAME, BOND_AMOUNT }) => {
      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthority.toBuffer()],
        program.programId
      )

      return await program.methods
        .registerIndustry(COMPANY_NAME, BOND_AMOUNT)
        .accountsStrict({
          industryAccount,
          authority: industryAuthority,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Register industry error:', error)
      toast.error('Failed to register industry account')
    },
  })

  const verifyIndustryHandler = useMutation<string, Error, VerifyIndustryArgs>({
    mutationKey: ['carbon', 'verifyIndustry', { cluster }],
    mutationFn: async ({ industryAuthority, adminPubkey }) => {
      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthority.toBuffer()],
        program.programId
      )

      return await program.methods
        .verifyIndustry()
        .accountsStrict({
          admin: adminPubkey,
          industryAccount,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Verify industry error:', error)
      toast.error('Failed to verify industry account')
    },
  })

  const depositBondHandler = useMutation<string, Error, DepositBondArgs>({
    mutationKey: ['carbon', 'depositBond', { cluster }],
    mutationFn: async ({ industryAuthority, industryAuthorityPubkey, depositAmount }) => {
      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthority.toBuffer()],
        program.programId
      )
      const [bondVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('bond_vault'), industryAccount.toBuffer()],
        program.programId
      )

      return await program.methods
        .depositBond(depositAmount)
        .accountsStrict({
          industryAccount,
          bondVault,
          authority: industryAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Deposit bond error:', error)
      toast.error('Failed to deposit bond amount')
    },
  })

  const withdrawBondHandler = useMutation<string, Error, WithdrawBondArgs>({
    mutationKey: ['carbon', 'withdrawBond', { cluster }],
    mutationFn: async ({ industryAuthority, industryAuthorityPubkey, withdrawAmount }) => {
      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthority.toBuffer()],
        program.programId
      )
      const [bondVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('bond_vault'), industryAccount.toBuffer()],
        program.programId
      )

      return await program.methods
        .withdrawBond(withdrawAmount)
        .accountsStrict({
          industryAccount,
          bondVault,
          authority: industryAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Withdraw bond error:', error)
      toast.error('Failed to withdraw bond amount')
    },
  })

  const submitEmissionReportHandler = useMutation<string, Error, SubmitEmissionReportArgs>({
    mutationKey: ['carbon', 'submitEmissionReport', { cluster }],
    mutationFn: async ({ co2Emitted, reportPeriod, industryAuthorityPubkey }) => {
      const timestamp = new BN(Date.now())

      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthorityPubkey.toBuffer()],
        program.programId
      )

      const [emissionReport] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('emission_report'),
          industryAccount.toBuffer(),
          timestamp.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )

      return await program.methods
        .submitEmissionReport(co2Emitted, reportPeriod, timestamp)
        .accountsStrict({
          industryAccount,
          emissionReport,
          authority: industryAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await emissionReportAccounts.refetch()
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Submit emission report error:', error)
      toast.error('Failed to submit emission report')
    },
  })

  const createAuctionHandler = useMutation<string, Error, CreateAuctionArgs>({
    mutationKey: ['carbon', 'createAuction', { cluster }],
    mutationFn: async ({ adminPubkey, BATCH_NUMBER, TOTAL_TOKENS, START_PRICE, RESERVE_PRICE, AUCTION_DURATION }) => {
      const [auctionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      return await program.methods
        .createAuction(
          BATCH_NUMBER,
          TOTAL_TOKENS,
          START_PRICE,
          RESERVE_PRICE,
          AUCTION_DURATION
        )
        .accountsStrict({
          auction: auctionAccount,
          authority: adminPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await auctionAccounts.refetch()
    },
    onError: (error) => {
      console.error('Create auction error:', error)
      toast.error('Failed to create auction')
    },
  })

  const placeBidHandler = useMutation<string, Error, PlaceBidArgs>({
    mutationKey: ['carbon', 'placeBid', { cluster }],
    mutationFn: async ({ industryAuthorityPubkey, BATCH_NUMBER, tokenAmount, bidTimestamp }) => {
      const [auctionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )
      const [bidAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          auctionAccount.toBuffer(),
          industryAuthorityPubkey.toBuffer(),
          bidTimestamp.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )

      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthorityPubkey.toBuffer()],
        program.programId
      )

      const [escrowAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), auctionAccount.toBuffer()],
        program.programId
      )

      return await program.methods
        .placeBid(tokenAmount, bidTimestamp)
        .accountsStrict({
          auction: auctionAccount,
          bid: bidAccount,
          industryAccount,
          escrow: escrowAccount,
          bidder: industryAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await bidAccounts.refetch()
      await auctionAccounts.refetch()
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Place bid error:', error)
      toast.error('Failed to place bid')
    },
  })

  const finalizeAuctionHandler = useMutation<string, Error, FinalizeAuctionArgs>({
    mutationKey: ['carbon', 'finalizeAuction', { cluster }],
    mutationFn: async ({ BATCH_NUMBER, adminPubkey }) => {
      const [auctionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      return await program.methods
        .finalizeAuction()
        .accountsStrict({
          auction: auctionAccount,
          authority: adminPubkey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await auctionAccounts.refetch()
    },
    onError: (error) => {
      console.error('Finalize auction error:', error)
      toast.error('Failed to finalize auction')
    },
  })

  const claimTokensHandler = useMutation<string, Error, ClaimTokensArgs>({
    mutationKey: ['carbon', 'claimTokens', { cluster }],
    mutationFn: async ({ BATCH_NUMBER, industryAuthorityPubkey, ctMintPubkey, bidTimestamp }) => {
      const [auctionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      const [escrowAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), auctionAccount.toBuffer()],
        program.programId
      )
      const [bidAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          auctionAccount.toBuffer(),
          industryAuthorityPubkey.toBuffer(),
          bidTimestamp.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )

      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthorityPubkey.toBuffer()],
        program.programId
      )
      const industryTokenAccount = await getAssociatedTokenAddress(
        ctMintPubkey,
        industryAuthorityPubkey
      )

      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority')],
        program.programId
      )

      return await program.methods
        .claimTokens()
        .accountsStrict({
          auction: auctionAccount,
          bid: bidAccount,
          industryAccount,
          ctMint: ctMintPubkey,
          industryCtAccount: industryTokenAccount,
          mintAuthority,
          escrow: escrowAccount,
          bidder: industryAuthorityPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await bidAccounts.refetch()
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Claim tokens error:', error)
      toast.error('Failed to claim tokens')
    },
  })

  const withdrawProceedsHandler = useMutation<string, Error, WithdrawProceedsArgs>({
    mutationKey: ['carbon', 'withdrawProceeds', { cluster }],
    mutationFn: async ({ BATCH_NUMBER, adminPubkey, treasuryPubkey }) => {
      const [auctionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      const [escrowAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), auctionAccount.toBuffer()],
        program.programId
      )

      return await program.methods
        .withdrawProceeds()
        .accountsStrict({
          auction: auctionAccount,
          escrow: escrowAccount,
          treasury: treasuryPubkey, // Fixed: Use provided treasury address
          authority: adminPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await auctionAccounts.refetch()
    },
    onError: (error) => {
      console.error('Withdraw proceeds error:', error)
      toast.error('Failed to withdraw proceeds')
    },
  })

  const burnCtForComplianceHandler = useMutation<string, Error, BurnCtForComplianceArgs>({
    mutationKey: ['carbon', 'burnCtForCompliance', { cluster }],
    mutationFn: async ({ industryAuthorityPubkey, ctMintPubkey, burnAmount, emissionAmount }) => {
      const [industryAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('industry'), industryAuthorityPubkey.toBuffer()],
        program.programId
      )

      const industryTokenAccount = await getAssociatedTokenAddress(
        ctMintPubkey,
        industryAuthorityPubkey
      )

      return await program.methods
        .burnCtForCompliance(burnAmount, emissionAmount)
        .accountsStrict({
          industryAccount,
          ctMint: ctMintPubkey,
          industryCtAccount: industryTokenAccount,
          authority: industryAuthorityPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await industryAccounts.refetch()
    },
    onError: (error) => {
      console.error('Burn CT for compliance error:', error)
      toast.error('Failed to burn CT for compliance')
    },
  })

  const cancelAuctionHandler = useMutation<string, Error, CancelAuctionArgs>({
    mutationKey: ['carbon', 'cancelAuction', { cluster }],
    mutationFn: async ({ adminPubkey, batchNumber }) => {
      const [auctionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(batchNumber).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      return await program.methods
        .cancelAuction()
        .accountsStrict({
          auction: auctionPDA,
          authority: adminPubkey,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await auctionAccounts.refetch()
    },
    onError: (error) => {
      console.error('Cancel auction error:', error)
      toast.error('Failed to cancel auction')
    },
  })

  return {
    program,
    programId,
    auctionAccounts,
    bidAccounts,
    industryAccounts,
    emissionReportAccounts,
    getProgramAccount,
    initializeHandler,
    registerIndustryHandler,
    verifyIndustryHandler,
    depositBondHandler,
    withdrawBondHandler,
    submitEmissionReportHandler,
    createAuctionHandler,
    placeBidHandler,
    finalizeAuctionHandler,
    claimTokensHandler,
    withdrawProceedsHandler,
    burnCtForComplianceHandler,
    cancelAuctionHandler,
  }
}

// export function useCarbonProgramAccount({ account }: { account: PublicKey }) {
  // const { cluster } = useCluster()
  // const transactionToast = useTransactionToast()
  // const { program, auctionAccounts, bidAccounts, emissionReportAccounts, industryAccounts } = useCarbonProgram()

  // const accountQuery = useQuery({
  //   queryKey: ['counter', 'fetch', { cluster, account }],
  //   queryFn: () => program.account.counter.fetch(account),
  // })

  // const closeMutation = useMutation({
  //   mutationKey: ['counter', 'close', { cluster, account }],
  //   mutationFn: () => program.methods.close().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accounts.refetch()
  //   },
  // })

  // const decrementMutation = useMutation({
  //   mutationKey: ['counter', 'decrement', { cluster, account }],
  //   mutationFn: () => program.methods.decrement().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  // const incrementMutation = useMutation({
  //   mutationKey: ['counter', 'increment', { cluster, account }],
  //   mutationFn: () => program.methods.increment().accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  // const setMutation = useMutation({
  //   mutationKey: ['counter', 'set', { cluster, account }],
  //   mutationFn: (value: number) => program.methods.set(value).accounts({ counter: account }).rpc(),
  //   onSuccess: async (tx) => {
  //     transactionToast(tx)
  //     await accountQuery.refetch()
  //   },
  // })

  // return {
  //   accountQuery,
  //   closeMutation,
  //   decrementMutation,
  //   incrementMutation,
  //   setMutation,
  // }
// }

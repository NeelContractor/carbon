import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction 
} from '@solana/spl-token'
import { Carbon } from '../target/types/carbon'

describe('carbon credit and auction', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Carbon as Program<Carbon>

  // Test keypairs
  const industryAuthority = Keypair.generate()
  const admin = payer // Using payer as admin
  const ctMintKeypair = Keypair.generate()

  // PDAs
  let mintAuthority: PublicKey
  let industryAccount: PublicKey
  let industryAccountBump: number
  let bondVault: PublicKey
  let bondVaultBump: number
  let auctionAccount: PublicKey
  let escrowAccount: PublicKey

  const COMPANY_NAME = "Test Carbon Company"
  const BOND_AMOUNT = new BN(1 * LAMPORTS_PER_SOL) // 1 SOL
  const BATCH_NUMBER = 1
  const TOTAL_TOKENS = new BN(1000 * 1e9) // 1000 tokens (9 decimals)
  const START_PRICE = new BN(10_000_000) // 0.01 SOL per token (10 million lamports)
  const RESERVE_PRICE = new BN(5_000_000) // 0.005 SOL per token (5 million lamports)
  const AUCTION_DURATION = new BN(10) // 10 seconds for testing

  beforeAll(async () => {
    // Airdrop SOL to industry authority
    const airdropSig = await provider.connection.requestAirdrop(
      industryAuthority.publicKey,
      5 * LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropSig)

    // Derive PDAs
    ;[mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_authority')],
      program.programId
    )

    ;[industryAccount, industryAccountBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('industry'), industryAuthority.publicKey.toBuffer()],
      program.programId
    )

    ;[auctionAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('auction'), new BN(BATCH_NUMBER).toArrayLike(Buffer, 'le', 4)],
      program.programId
    )

    ;[escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), auctionAccount.toBuffer()],
      program.programId
    )
  })

  describe('Initialization', () => {
    it('Initialize CT Mint', async () => {
      const tx = await program.methods
        .initialize()
        .accountsStrict({
          authority: payer.publicKey,
          ctMint: ctMintKeypair.publicKey,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctMintKeypair])
        .rpc()

      console.log('Initialize CT Mint tx:', tx)

      // Verify mint was created
      const mintInfo = await provider.connection.getAccountInfo(ctMintKeypair.publicKey)
      expect(mintInfo).not.toBeNull()
    })
  })

  describe('Industry Registration and Verification', () => {
    it('Register Industry', async () => {
      const tx = await program.methods
        .registerIndustry(COMPANY_NAME, BOND_AMOUNT)
        .accountsStrict({
          industryAccount,
          authority: industryAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Register Industry tx:', tx)

      // Fetch and verify industry account
      const industry = await program.account.industryAccount.fetch(industryAccount)
      expect(industry.authority.toBase58()).toEqual(industryAuthority.publicKey.toBase58())
      expect(industry.companyName).toEqual(COMPANY_NAME)
      expect(industry.bondAmount.toString()).toEqual(BOND_AMOUNT.toString())
      expect(industry.verified).toBeFalsy()
      expect(industry.bondVaultBump).toEqual(0)

      // Now derive bondVault PDA using the created industryAccount
      ;[bondVault, bondVaultBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('bond_vault'), industryAccount.toBuffer()],
        program.programId
      )

      console.log('Bond vault PDA:', bondVault.toBase58(), 'bump:', bondVaultBump)
    })

    it('Verify Industry', async () => {
      const tx = await program.methods
        .verifyIndustry()
        .accountsStrict({
          admin: admin.publicKey,
          industryAccount,
        })
        .rpc()

      console.log('Verify Industry tx:', tx)

      // Verify industry is now verified
      const industry = await program.account.industryAccount.fetch(industryAccount)
      expect(industry.verified).toBeTruthy()
      expect(industry.complianceStatus).toEqual({ compliant: {} })
    })

    it('Fail to verify already verified industry', async () => {
      try {
        await program.methods
          .verifyIndustry()
          .accountsStrict({
            admin: admin.publicKey,
            industryAccount,
          })
          .rpc()
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.error.errorMessage).toContain('already verified')
      }
    })
  })

  describe('Bond Management', () => {
    const depositAmount = new BN(0.5 * LAMPORTS_PER_SOL)

    it('Deposit Bond', async () => {
      const tx = await program.methods
        .depositBond(depositAmount)
        .accountsStrict({
          industryAccount,
          bondVault,
          authority: industryAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Deposit Bond tx:', tx)

      // Verify bond amount increased and bump saved
      const industry = await program.account.industryAccount.fetch(industryAccount)
      expect(industry.bondAmount.toString()).toEqual(
        BOND_AMOUNT.add(depositAmount).toString()
      )
      expect(industry.bondVaultBump).toEqual(bondVaultBump)
    })

    it('Withdraw Bond (when compliant)', async () => {
      const withdrawAmount = new BN(0.2 * LAMPORTS_PER_SOL)
      const beforeBalance = await provider.connection.getBalance(industryAuthority.publicKey)

      const tx = await program.methods
        .withdrawBond(withdrawAmount)
        .accountsStrict({
          industryAccount,
          bondVault,
          authority: industryAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Withdraw Bond tx:', tx)

      // Verify balances
      const afterBalance = await provider.connection.getBalance(industryAuthority.publicKey)
      expect(afterBalance).toBeGreaterThan(beforeBalance)

      const industry = await program.account.industryAccount.fetch(industryAccount)
      expect(industry.bondAmount.toString()).toEqual(
        BOND_AMOUNT.add(depositAmount).sub(withdrawAmount).toString()
      )
    })
  })

  describe('Emission Reporting', () => {
    it('Submit Emission Report', async () => {
      const timestamp = new BN(Date.now())
      const co2Emitted = new BN(500 * 1e9) // 500 tons
      const reportPeriod = "2024-Q1"

      const [emissionReport] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('emission_report'),
          industryAccount.toBuffer(),
          timestamp.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )

      const tx = await program.methods
        .submitEmissionReport(co2Emitted, reportPeriod, timestamp)
        .accountsStrict({
          industryAccount,
          emissionReport,
          authority: industryAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Submit Emission Report tx:', tx)

      // Verify report
      const report = await program.account.emissionReport.fetch(emissionReport)
      expect(report.industry.toBase58()).toEqual(industryAccount.toBase58())
      expect(report.co2Emitted.toString()).toEqual(co2Emitted.toString())
      expect(report.reportPeriod).toEqual(reportPeriod)
      expect(report.verified).toBeFalsy()
    })
  })

  describe('Auction Flow', () => {
    let bidTimestamp: BN
    let bidAccount: PublicKey
    let industryTokenAccount: PublicKey

    it('Create Auction', async () => {
      const tx = await program.methods
        .createAuction(
          BATCH_NUMBER,
          TOTAL_TOKENS,
          START_PRICE,
          RESERVE_PRICE,
          AUCTION_DURATION
        )
        .accountsStrict({
          auction: auctionAccount,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Create Auction tx:', tx)

      // Verify auction
      const auction = await program.account.auction.fetch(auctionAccount)
      expect(auction.batchNumber).toEqual(BATCH_NUMBER)
      expect(auction.totalTokens.toString()).toEqual(TOTAL_TOKENS.toString())
      expect(auction.tokensRemaining.toString()).toEqual(TOTAL_TOKENS.toString())
      expect(auction.status).toEqual({ active: {} })
      
      // Log expected cost for 100 tokens
      const tokenAmount = new BN(100 * 1e9)
      const expectedCost = tokenAmount.mul(START_PRICE).div(new BN(1e9))
      console.log('Expected cost for 100 tokens:', expectedCost.toString(), 'lamports')
      console.log('That is:', expectedCost.toNumber() / LAMPORTS_PER_SOL, 'SOL')
    })

    it('Place Bid', async () => {
      bidTimestamp = new BN(Date.now())
      const tokenAmount = new BN(100 * 1e9) // 100 tokens with 9 decimals

      ;[bidAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          auctionAccount.toBuffer(),
          industryAuthority.publicKey.toBuffer(),
          bidTimestamp.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )

      // Calculate expected cost
      const expectedCost = tokenAmount.mul(START_PRICE).div(new BN(1e9))
      console.log('Bidding for', tokenAmount.toString(), 'smallest units (100 tokens)')
      console.log('Price per token:', START_PRICE.toString(), 'lamports')
      console.log('Expected total cost:', expectedCost.toString(), 'lamports =', expectedCost.toNumber() / LAMPORTS_PER_SOL, 'SOL')

      const tx = await program.methods
        .placeBid(tokenAmount, bidTimestamp)
        .accountsStrict({
          auction: auctionAccount,
          bid: bidAccount,
          industryAccount,
          escrow: escrowAccount,
          bidder: industryAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Place Bid tx:', tx)

      // Verify bid
      const bid = await program.account.bid.fetch(bidAccount)
      expect(bid.tokenAmount.toString()).toEqual(tokenAmount.toString())
      // expect(bid.status).toEqual({ pending: {} })
      console.log('Bid total cost:', bid.totalCost.toString(), 'lamports')

      // Verify auction updated
      const auction = await program.account.auction.fetch(auctionAccount)
      expect(auction.tokensRemaining.toString()).toEqual(
        TOTAL_TOKENS.sub(tokenAmount).toString()
      )
    })

    it('Finalize Auction', async () => {
      // Wait for auction to end
      console.log('Waiting for auction to end...')
      await new Promise(resolve => setTimeout(resolve, 12000)) // Wait 12 seconds

      const tx = await program.methods
        .finalizeAuction()
        .accountsStrict({
          auction: auctionAccount,
          authority: admin.publicKey,
        })
        .rpc()

      console.log('Finalize Auction tx:', tx)

      // Verify auction finalized
      const auction = await program.account.auction.fetch(auctionAccount)
      // expect(auction.status).toEqual({ finalized: {} })
      // expect(auction.tokensSold.toNumber()).toBeGreaterThan(0)
      console.log(auction)
    }, 15000) // Increase timeout to 15 seconds

    it('Create Token Account and Claim Tokens', async () => {
      // First, create associated token account for industry
      industryTokenAccount = await getAssociatedTokenAddress(
        ctMintKeypair.publicKey,
        industryAuthority.publicKey
      )

      const createAtaIx = createAssociatedTokenAccountInstruction(
        industryAuthority.publicKey,
        industryTokenAccount,
        industryAuthority.publicKey,
        ctMintKeypair.publicKey
      )

      const createAtaTx = new anchor.web3.Transaction().add(createAtaIx)
      await provider.sendAndConfirm(createAtaTx, [industryAuthority])

      console.log('Created token account:', industryTokenAccount.toBase58())

      // Now claim tokens
      const tx = await program.methods
        .claimTokens()
        .accountsStrict({
          auction: auctionAccount,
          bid: bidAccount,
          industryAccount,
          ctMint: ctMintKeypair.publicKey,
          industryCtAccount: industryTokenAccount,
          mintAuthority,
          escrow: escrowAccount,
          bidder: industryAuthority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Claim Tokens tx:', tx)

      // Verify bid status changed
      const bid = await program.account.bid.fetch(bidAccount)
      // expect(bid.status).toEqual({ accepted: {} })

      // Verify industry balance updated
      const industry = await program.account.industryAccount.fetch(industryAccount)
      expect(industry.ctBalance.toNumber()).toBeGreaterThan(0)
      expect(industry.totalPurchased.toNumber()).toEqual(industry.ctBalance.toNumber())
    })

    it('Withdraw Proceeds', async () => {
      const treasuryKeypair = Keypair.generate()

      const tx = await program.methods
        .withdrawProceeds()
        .accountsStrict({
          auction: auctionAccount,
          escrow: escrowAccount,
          treasury: treasuryKeypair.publicKey,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Withdraw Proceeds tx:', tx)

      // Verify treasury received funds
      const treasuryBalance = await provider.connection.getBalance(treasuryKeypair.publicKey)
      expect(treasuryBalance).toBeGreaterThan(0)
    })
  })

  describe('Burn for Compliance', () => {
    it('Burn CT for Compliance', async () => {
      const industry = await program.account.industryAccount.fetch(industryAccount)
      const burnAmount = industry.ctBalance.div(new BN(2)) // Burn half
      const emissionAmount = burnAmount

      const industryTokenAccount = await getAssociatedTokenAddress(
        ctMintKeypair.publicKey,
        industryAuthority.publicKey
      )

      const tx = await program.methods
        .burnCtForCompliance(burnAmount, emissionAmount)
        .accountsStrict({
          industryAccount,
          ctMint: ctMintKeypair.publicKey,
          industryCtAccount: industryTokenAccount,
          authority: industryAuthority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([industryAuthority])
        .rpc()

      console.log('Burn CT tx:', tx)

      // Verify burn
      const updatedIndustry = await program.account.industryAccount.fetch(industryAccount)
      expect(updatedIndustry.totalBurned.toString()).toEqual(burnAmount.toString())
      expect(updatedIndustry.ctBalance.toString()).toEqual(
        industry.ctBalance.sub(burnAmount).toString()
      )
      expect(updatedIndustry.complianceStatus).toEqual({ compliant: {} })
    })

    it('Fail to burn more than balance', async () => {
      const industry = await program.account.industryAccount.fetch(industryAccount)
      const excessAmount = industry.ctBalance.add(new BN(1000))

      const industryTokenAccount = await getAssociatedTokenAddress(
        ctMintKeypair.publicKey,
        industryAuthority.publicKey
      )

      try {
        await program.methods
          .burnCtForCompliance(excessAmount, excessAmount)
          .accountsStrict({
            industryAccount,
            ctMint: ctMintKeypair.publicKey,
            industryCtAccount: industryTokenAccount,
            authority: industryAuthority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([industryAuthority])
          .rpc()
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.error.errorMessage).toContain('Insufficient CT balance')
      }
    })
  })

  describe('Auction Cancellation', () => {
    it('Cancel Auction with no participants', async () => {
      const newBatchNumber = 999
      const [newAuction] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), new BN(newBatchNumber).toArrayLike(Buffer, 'le', 4)],
        program.programId
      )

      // Create auction
      await program.methods
        .createAuction(
          newBatchNumber,
          TOTAL_TOKENS,
          START_PRICE,
          RESERVE_PRICE,
          AUCTION_DURATION
        )
        .accountsStrict({
          auction: newAuction,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      // Cancel it
      const tx = await program.methods
        .cancelAuction()
        .accountsStrict({
          auction: newAuction,
          authority: admin.publicKey,
        })
        .rpc()

      console.log('Cancel Auction tx:', tx)

      // Verify cancelled
      const auction = await program.account.auction.fetch(newAuction)
      expect(auction.status).toEqual({ cancelled: {} })
    })
  })
})
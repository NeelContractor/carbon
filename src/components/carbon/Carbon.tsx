"use client"

import { useState } from 'react'
import { Leaf, TreeDeciduous, Sprout, Globe, TrendingUp, Award, ShoppingCart, Clock, Users, Zap, ChevronRight, BadgeCheck, Settings, BarChart3, FileText, Wallet, Plus, ArrowUpRight, Activity, Target, Flame, AlertCircle } from 'lucide-react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useCarbonProgram } from './carbon-data-access'
import { WalletButton } from '../solana/solana-provider'
import { ThemeSelect } from '../theme-select'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useQuery } from '@tanstack/react-query'

const ADMIN_PUBKEY = new PublicKey("7EpJ8M9MBnN3Jyi7bwKhV9YFCzhDEK7drbMCTRB9Xm8Y");

export type ComplianceStatus = 
    { pending: Record<string, never> } | 
    { compliant: Record<string, never> } |
    { nonCompliant: Record<string, never> } |
    { warning: Record<string, never> };

export type AuctionStatus = 
    { active: Record<string, never> } | 
    { completed: Record<string, never> } |
    { finalized: Record<string, never> } |
    { cancelled: Record<string, never> };

export type BidStatus = 
    { pending: Record<string, never> } | 
    { accepted: Record<string, never> } |
    { refunded: Record<string, never> };

export interface EmissionReport {
    industry: PublicKey,
    co2Emitted: BN,
    reportPeriod: string,
    submittedAt: BN,
    verified: boolean,
}

export interface IndustryAccount {
    authority: PublicKey,
    companyName: string,
    bondAmount: BN,
    verified: boolean,
    ctBalance: BN,
    totalPurchased: BN,
    totalBurned: BN,
    complianceStatus: ComplianceStatus,
    createdAt: BN,
    bump: number,
    bondVaultBump: number,
}

export interface Bid {
    auction: PublicKey,
    bidder: PublicKey,
    industry: PublicKey,
    tokenAmount: BN,
    pricePerToken: BN,
    totalCost: BN,
    timestamp: BN,
    status: BidStatus,
}

export interface Auction {
    authority: PublicKey,
    batchNumber: number,
    totalTokens: BN,
    tokensRemaining: BN,
    startPrice: BN,
    currentPrice: BN,
    reservePrice: BN,
    startTime: BN,
    endTime: BN,
    status: AuctionStatus,
    totalRaised: BN,
    participantCount: number,
    tokensSold: BN,
}

export default function CarbonChainUI() {
  const { publicKey } = useWallet()
  const { connection } = useConnection();
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Form states
  const [companyName, setCompanyName] = useState('')
  const [bondAmount, setBondAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [emissionAmount, setEmissionAmount] = useState('')
  const [co2Emitted, setCo2Emitted] = useState('')
  const [reportPeriod, setReportPeriod] = useState('')
  // const [batchNumber, setBatchNumber] = useState('')
  const [totalTokens, setTotalTokens] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('')
  const [bidTokenAmount, setBidTokenAmount] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<{
    account: Auction;
    publicKey: PublicKey;
} | null>(null)
  const [ctMintAddress, setCtMintAddress] = useState('')
  const [verifyIndustryAddress, setVerifyIndustryAddress] = useState('')
  const [finalizeAuctionBatch, setFinalizeAuctionBatch] = useState('')
  const [cancelAuctionBatch, setCancelAuctionBatch] = useState('')
  const [withdrawProceedsBatch, setWithdrawProceedsBatch] = useState('')
  const [treasuryAddress, setTreasuryAddress] = useState('')

  const {
    program,
    auctionAccounts,
    bidAccounts,
    industryAccounts,
    // initializeHandler,
    emissionReportAccounts,
    registerIndustryHandler,
    verifyIndustryHandler,
    depositBondHandler,
    withdrawBondHandler,
    submitEmissionReportHandler,
    createAuctionHandler,
    placeBidHandler,
    burnCtForComplianceHandler,
    finalizeAuctionHandler,
    // claimTokensHandler,
    cancelAuctionHandler,
    withdrawProceedsHandler,
  } = useCarbonProgram()

  // Query to find CT mint address automatically
  const ctMintQuery = useQuery({
    queryKey: ['ctMint', { cluster: 'devnet' }],
    queryFn: async () => {
      try {
        const [mintAuthority] = PublicKey.findProgramAddressSync(
          [Buffer.from('mint_authority')],
          program.programId
        )
        
        const mints = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 82 },
          ]
        })
        
        for (const { pubkey } of mints) {
          try {
            const mintInfo = await connection.getParsedAccountInfo(pubkey)
            if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
              const parsed = mintInfo.value.data.parsed
              if (parsed.info.mintAuthority === mintAuthority.toString()) {
                return pubkey.toString()
              }
            }
          } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
            continue
          }
        }
        
        return null
      } catch (error) {
        console.error('CT Mint detection error:', error)
        return null
      }
    },
    enabled: !!publicKey && !!program,
    staleTime: Infinity,
    retry: false, // Don't retry if not found
  })  

  // Check if current user is admin
  const isAdmin = publicKey?.toString() === ADMIN_PUBKEY.toString()

  // Auto-detected CT mint address
  const detectedCtMint = ctMintQuery.data || ctMintAddress

  // Get user's industry account
  const userIndustry = industryAccounts.data?.find(
    acc => acc.account.authority.toString() === publicKey?.toString()
  )

  // Get user's bids
  const userBids = bidAccounts.data?.filter(
    bid => bid.account.bidder.toString() === publicKey?.toString()
  )

  // Get user's emission reports
  const userReports = emissionReportAccounts.data?.filter(
    report => report.account.industry.toString() === userIndustry?.publicKey.toString()
  )

  // Get next batch number
  const getNextBatchNumber = () => {
    if (!auctionAccounts.data || auctionAccounts.data.length === 0) {
      return 1
    }
    const maxBatch = Math.max(...auctionAccounts.data.map(a => a.account.batchNumber))
    return maxBatch + 1
  }

  const nextBatchNumber = getNextBatchNumber()

  const formatNumber = (num: BN) => {
    if (!num) return '0'
    return (num.toNumber() / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const formatCompact = (num: BN) => {
    if (!num) return '0'
    const value = num.toNumber() / 1e9
    if (value >= 1000) return `${(value/1000).toFixed(1)}K`
    return value.toFixed(1)
  }

  const getComplianceColor = (status?: ComplianceStatus) => {
    if (!status) return 'gray'
    const statusStr = Object.keys(status)[0]
    return {
      compliant: 'emerald',
      nonCompliant: 'red',
      pending: 'amber',
      warning: 'orange'
    }[statusStr] || 'gray'
  }

  const handleRegisterIndustry = async () => {
    if (!publicKey || !companyName || !bondAmount) return
    try {
      await registerIndustryHandler.mutateAsync({
        industryAuthority: publicKey,
        COMPANY_NAME: companyName,
        BOND_AMOUNT: new BN(parseFloat(bondAmount) * 1e9)
      })
      setCompanyName('')
      setBondAmount('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleDepositBond = async () => {
    if (!publicKey || !depositAmount) return
    try {
      await depositBondHandler.mutateAsync({
        industryAuthority: publicKey,
        industryAuthorityPubkey: publicKey,
        depositAmount: new BN(parseFloat(depositAmount) * 1e9)
      })
      setDepositAmount('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleWithdrawBond = async () => {
    if (!publicKey || !withdrawAmount) return
    try {
      await withdrawBondHandler.mutateAsync({
        industryAuthority: publicKey,
        industryAuthorityPubkey: publicKey,
        withdrawAmount: new BN(parseFloat(withdrawAmount) * 1e9)
      })
      setWithdrawAmount('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleSubmitReport = async () => {
    if (!publicKey || !co2Emitted || !reportPeriod) return
    try {
      await submitEmissionReportHandler.mutateAsync({
        co2Emitted: new BN(parseFloat(co2Emitted) * 1e9),
        reportPeriod,
        industryAuthorityPubkey: publicKey
      })
      setCo2Emitted('')
      setReportPeriod('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateAuction = async () => {
    if (!publicKey || !totalTokens || !startPrice || !reservePrice || !auctionDuration) return
    try {
      await createAuctionHandler.mutateAsync({
        adminPubkey: publicKey,
        BATCH_NUMBER: nextBatchNumber,
        TOTAL_TOKENS: new BN(parseFloat(totalTokens) * 1e9),
        START_PRICE: new BN(parseFloat(startPrice) * 1e9),
        RESERVE_PRICE: new BN(parseFloat(reservePrice) * 1e9),
        AUCTION_DURATION: new BN(parseInt(auctionDuration))
      })
      setTotalTokens('')
      setStartPrice('')
      setReservePrice('')
      setAuctionDuration('')
    } catch (error) {
      console.error(error)
    }
  }

  const handlePlaceBid = async (auction: { account: Auction, publicKey: PublicKey }) => {
    if (!publicKey || !bidTokenAmount) return
    try {
      await placeBidHandler.mutateAsync({
        industryAuthorityPubkey: publicKey,
        BATCH_NUMBER: auction.account.batchNumber,
        tokenAmount: new BN(parseFloat(bidTokenAmount) * 1e9),
        bidTimestamp: new BN(Math.floor(Date.now() / 1000)) // new BN(Date.now())
      })
      setBidTokenAmount('')
      setSelectedAuction(null)
    } catch (error) {
      console.error(error)
    }
  }

  const handleBurnTokens = async () => {
    if (!publicKey || !burnAmount || !emissionAmount || !detectedCtMint) return
    try {
      await burnCtForComplianceHandler.mutateAsync({
        industryAuthorityPubkey: publicKey,
        ctMintPubkey: new PublicKey(detectedCtMint),
        burnAmount: new BN(parseFloat(burnAmount) * 1e9),
        emissionAmount: new BN(parseFloat(emissionAmount) * 1e9)
      })
      setBurnAmount('')
      setEmissionAmount('')
    } catch (error) {
      console.error(error)
    }
  }

  // const handleClaimTokens = async (bid: { account: Bid, publicKey: PublicKey }, auction: { account: Auction, publicKey: PublicKey }) => {
  //   if (!publicKey || !detectedCtMint) return
  //   try {
  //     await claimTokensHandler.mutateAsync({
  //       BATCH_NUMBER: auction.account.batchNumber,
  //       industryAuthorityPubkey: publicKey,
  //       ctMintPubkey: new PublicKey(detectedCtMint),
  //       bidTimestamp: bid.account.timestamp
  //     })
  //   } catch (error) {
  //     console.error(error)
  //   }
  // }

  const handleVerifyIndustry = async () => {
    if (!publicKey || !verifyIndustryAddress) return
    try {
      await verifyIndustryHandler.mutateAsync({
        industryAuthority: new PublicKey(verifyIndustryAddress),
        adminPubkey: publicKey
      })
      setVerifyIndustryAddress('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleFinalizeAuction = async () => {
    if (!publicKey || !finalizeAuctionBatch) return
    try {
      await finalizeAuctionHandler.mutateAsync({
        BATCH_NUMBER: parseInt(finalizeAuctionBatch),
        adminPubkey: publicKey
      })
      setFinalizeAuctionBatch('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleCancelAuction = async () => {
    if (!publicKey || !cancelAuctionBatch) return
    try {
      await cancelAuctionHandler.mutateAsync({
        adminPubkey: publicKey,
        batchNumber: parseInt(cancelAuctionBatch)
      })
      setCancelAuctionBatch('')
    } catch (error) {
      console.error(error)
    }
  }

  const handleWithdrawProceeds = async () => {
    if (!publicKey || !withdrawProceedsBatch || !treasuryAddress) return
    try {
      await withdrawProceedsHandler.mutateAsync({
        BATCH_NUMBER: parseInt(withdrawProceedsBatch),
        adminPubkey: publicKey,
        treasuryPubkey: new PublicKey(treasuryAddress)
      })
      setWithdrawProceedsBatch('')
      setTreasuryAddress('')
    } catch (error) {
      console.error(error)
    }
  }

  const StatCard = ({ icon: Icon, label, value, subtitle, gradient, trend }: { icon: React.ElementType, label: string, value: string, subtitle: string, gradient: string, trend?: string }) => (
    <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className="flex items-center space-x-1 text-emerald-600 text-sm font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  )

  const AuctionCard = ({ auction }: { auction: { account: Auction, publicKey: PublicKey } }) => {
    const timeLeft = Math.max(0, auction.account.endTime.toNumber() - Date.now() / 1000)
    const hours = Math.floor(timeLeft / 3600)
    const minutes = Math.floor((timeLeft % 3600) / 60)
    const seconds = Math.floor(timeLeft % 60);
    const progress = ((auction.account.totalTokens.toNumber() - auction.account.tokensRemaining.toNumber()) / auction.account.totalTokens.toNumber()) * 100

    return (
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-2xl font-bold text-gray-900">BATCH-{auction.account.batchNumber}</h3>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold animate-pulse">
                  LIVE
                </div>
              </div>
              <p className="text-sm text-gray-500">Dutch Auction • Price Declining</p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1 text-orange-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-lg font-bold">{hours}h {minutes}m {seconds}s</span>
              </div>
              <p className="text-xs text-gray-500">Time Remaining</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Tokens Sold</span>
              <span className="font-semibold text-gray-900">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-gray-600 mb-1">Current Price</p>
              <p className="text-xl font-bold text-emerald-600">{formatNumber(auction.account.currentPrice)}</p>
              <p className="text-xs text-gray-500">SOL/CT</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Reserve</p>
              <p className="text-xl font-bold text-blue-600">{formatNumber(auction.account.reservePrice)}</p>
              <p className="text-xs text-gray-500">SOL/CT</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100">
              <p className="text-xs text-gray-600 mb-1">Available</p>
              <p className="text-xl font-bold text-purple-600">{formatCompact(auction.account.tokensRemaining)}</p>
              <p className="text-xs text-gray-500">CT</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-gray-600 mb-1">Bidders</p>
              <p className="text-xl font-bold text-amber-600">{auction.account.participantCount}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <input
              type="number"
              placeholder="Enter token amount"
              value={selectedAuction?.publicKey.toString() === auction.publicKey.toString() ? bidTokenAmount : ''}
              onChange={(e) => {
                setSelectedAuction(auction)
                setBidTokenAmount(e.target.value)
              }}
              disabled={!publicKey || !userIndustry}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={() => handlePlaceBid(auction)}
              disabled={!publicKey || !userIndustry || !bidTokenAmount || placeBidHandler.isPending}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{placeBidHandler.isPending ? 'Placing...' : 'Place Bid'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <div className="relative">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <TreeDeciduous className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                    CarbonChain
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Decentralized Carbon Trading Platform</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <ThemeSelect />
                <button className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <Activity className="w-5 h-5 text-gray-600" />
                </button>
                <WalletButton />
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white/50 backdrop-blur-lg border-b border-gray-100 sticky top-[73px] z-40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-2 py-3">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'auctions', label: 'Live Auctions', icon: TrendingUp },
                { id: 'mybids', label: 'My Bids', icon: ShoppingCart },
                { id: 'compliance', label: 'Compliance', icon: BadgeCheck },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'register', label: 'Register', icon: Plus },
                ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Settings }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {!publicKey ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
              <p className="text-gray-500 mb-8">Connect your Solana wallet to access CarbonChain</p>
              <WalletButton />
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Welcome Banner */}
                  <div className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-8 text-white overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48"></div>
                    <div className="relative">
                      <h2 className="text-3xl font-bold mb-2">
                        Welcome back{userIndustry ? `, ${userIndustry.account.companyName}` : ''}!
                      </h2>
                      <p className="text-emerald-100 mb-6">Your carbon trading dashboard is ready</p>
                      <div className="flex items-center space-x-4">
                        {userIndustry && (
                          <>
                            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                              <span className="text-sm font-semibold">
                                {userIndustry.account.verified ? '✓ Verified Account' : '⏳ Pending Verification'}
                              </span>
                            </div>
                            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                              <span className="text-sm font-semibold">
                                🌱 {Object.keys(userIndustry.account.complianceStatus)[0]} Status
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!detectedCtMint && isAdmin && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900 mb-2">CT Mint Not Initialized</h3>
                          <p className="text-amber-700 text-sm mb-4">
                            The Carbon Token (CT) mint has not been initialized yet. You must initialize it before creating auctions or allowing token claims.
                          </p>
                          <button
                            onClick={() => setActiveTab('admin')}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold text-sm"
                          >
                            Go to Admin Panel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {userIndustry ? (
                    <>
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                          icon={Leaf}
                          label="CT Balance"
                          value={formatNumber(userIndustry.account.ctBalance)}
                          subtitle="Carbon Tokens Available"
                          gradient="from-emerald-500 to-green-500"
                        />
                        <StatCard
                          icon={TrendingUp}
                          label="Total Purchased"
                          value={formatNumber(userIndustry.account.totalPurchased)}
                          subtitle="All-time acquisitions"
                          gradient="from-blue-500 to-indigo-500"
                        />
                        <StatCard
                          icon={Flame}
                          label="Total Burned"
                          value={formatNumber(userIndustry.account.totalBurned)}
                          subtitle="For compliance"
                          gradient="from-orange-500 to-red-500"
                        />
                        <StatCard
                          icon={Award}
                          label="Bond Amount"
                          value={`${formatNumber(userIndustry.account.bondAmount)} SOL`}
                          subtitle="Security deposit"
                          gradient="from-purple-500 to-pink-500"
                        />
                      </div>

                      {/* Active Auctions Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Auctions</h2>
                            <p className="text-gray-500">Active carbon token auctions</p>
                          </div>
                          <button
                            onClick={() => setActiveTab('auctions')}
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold flex items-center space-x-2"
                          >
                            <span>View All</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        {auctionAccounts.isLoading ? (
                          <div className="text-center py-12">
                            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading auctions...</p>
                          </div>
                        ) : auctionAccounts.data && auctionAccounts.data.length > 0 ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {auctionAccounts.data.slice(0, 2).map((auction) => (
                              <AuctionCard key={auction.publicKey.toString()} auction={auction} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No active auctions at the moment</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                              <Target className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className={`px-3 py-1 bg-${getComplianceColor(userIndustry.account.complianceStatus)}-100 text-${getComplianceColor(userIndustry.account.complianceStatus)}-700 rounded-full text-xs font-bold`}>
                              {Object.keys(userIndustry.account.complianceStatus)[0]}
                            </span>
                          </div>
                          <h3 className="text-gray-900 font-bold text-lg mb-1">Compliance Status</h3>
                          <p className="text-3xl font-bold text-emerald-600 mb-2">
                            {Object.keys(userIndustry.account.complianceStatus)[0] === 'compliant' ? '✓' : '⏳'}
                          </p>
                          <p className="text-sm text-gray-500">Current standing</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Active</span>
                          </div>
                          <h3 className="text-gray-900 font-bold text-lg mb-1">Active Bids</h3>
                          <p className="text-3xl font-bold text-blue-600 mb-2">{userBids?.length || 0}</p>
                          <p className="text-sm text-gray-500">In auctions</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Updated</span>
                          </div>
                          <h3 className="text-gray-900 font-bold text-lg mb-1">Reports Filed</h3>
                          <p className="text-3xl font-bold text-purple-600 mb-2">{userReports?.length || 0}</p>
                          <p className="text-sm text-gray-500">Emission reports</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                      <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Industry Account</h3>
                      <p className="text-gray-500 mb-6">Register your company to start trading carbon tokens</p>
                      <button
                        onClick={() => setActiveTab('register')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg font-semibold"
                      >
                        Register Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Auctions View */}
              {activeTab === 'auctions' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Carbon Token Auctions</h2>
                    <p className="text-gray-500">Participate in dutch auctions for carbon credits</p>
                  </div>
                  {auctionAccounts.isLoading ? (
                    <div className="text-center py-20">
                      <div className="animate-spin w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-500 mt-4">Loading auctions...</p>
                    </div>
                  ) : auctionAccounts.data && auctionAccounts.data.length > 0 ? (
                    <div className="space-y-6">
                      {auctionAccounts.data.map((auction) => (
                        <AuctionCard key={auction.publicKey.toString()} auction={auction} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                      <Globe className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Auctions</h3>
                      <p className="text-gray-500">Check back later for new carbon token auctions</p>
                    </div>
                  )}
                </div>
              )}

              {/* My Bids View */}
              {activeTab === 'mybids' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">My Active Bids</h2>
                    <p className="text-gray-500">Track your auction participation</p>
                  </div>
                  {bidAccounts.isLoading ? (
                    <div className="text-center py-20">
                      <div className="animate-spin w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-500 mt-4">Loading bids...</p>
                    </div>
                  ) : userBids && userBids.length > 0 ? (
                    <div className="space-y-4">
                      {userBids.map((bid) => {
                        const statusKey = Object.keys(bid.account.status)[0]
                        const auction = auctionAccounts.data?.find(a => a.publicKey.toString() === bid.account.auction.toString())

                        return (
                          <div key={bid.publicKey.toString()} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                  <ShoppingCart className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">
                                    Bid • BATCH-{auction?.account.batchNumber || '...'}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {new Date(bid.account.timestamp.toNumber()).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 mb-1">Token Amount</p>
                                <p className="text-xl font-bold text-gray-900">{formatCompact(bid.account.tokenAmount)} CT</p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 mb-1">Price Per Token</p>
                                <p className="text-xl font-bold text-emerald-600">{formatNumber(bid.account.pricePerToken)} SOL</p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                                <p className="text-xl font-bold text-purple-600">{formatNumber(bid.account.totalCost)} SOL</p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
                                {/* {statusKey === 'pending' && auction && Object.keys(auction.account.status)[0] === 'finalized' && (
                                  <button 
                                    onClick={() => handleClaimTokens(bid, auction)}
                                    disabled={claimTokensHandler.isPending || !detectedCtMint}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {claimTokensHandler.isPending ? 'Claiming...' : !detectedCtMint ? 'No Mint' : 'Claim'}
                                  </button>
                                )} */}
                                {/* {statusKey === 'accepted' && auction && Object.keys(auction.account.status)[0] == 'completed'  && (
                                  <span className="text-emerald-600 font-semibold text-sm">✓ Claimed</span>
                                )} */}
                                {statusKey === 'pending' && auction && Object.keys(auction.account.status)[0] !== 'finalized' && (
                                  <span className="text-amber-600 font-semibold text-sm">⏳ Pending</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                      <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Bids</h3>
                      <p className="text-gray-500 mb-6">You haven&apos;t placed any bids yet</p>
                      <button
                        onClick={() => setActiveTab('auctions')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg font-semibold"
                      >
                        Browse Auctions
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance View */}
              {activeTab === 'compliance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Compliance Dashboard</h2>
                    <p className="text-gray-500">Manage your carbon compliance and bonds</p>
                  </div>
                  
                  {userIndustry ? (
                    <>
                      <div className={`bg-gradient-to-br from-${getComplianceColor(userIndustry.account.complianceStatus)}-50 to-${getComplianceColor(userIndustry.account.complianceStatus)}-100 rounded-2xl p-8 border-2 border-${getComplianceColor(userIndustry.account.complianceStatus)}-200`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className={`text-3xl font-bold text-${getComplianceColor(userIndustry.account.complianceStatus)}-600 mb-2 uppercase`}>
                              {Object.keys(userIndustry.account.complianceStatus)[0]}
                            </h3>
                            <p className="text-gray-600">Current compliance status</p>
                          </div>
                          <div className={`w-20 h-20 bg-gradient-to-br from-${getComplianceColor(userIndustry.account.complianceStatus)}-400 to-${getComplianceColor(userIndustry.account.complianceStatus)}-500 rounded-full flex items-center justify-center`}>
                            <BadgeCheck className="w-12 h-12 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Burn Tokens */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Flame className="w-5 h-5 text-orange-500 mr-2" />
                            Burn Carbon Tokens
                          </h3>
                          <div className="space-y-3">
                            {/* Show CT Mint Status */}
                            <div className="p-3 bg-gray-50 rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">
                                {ctMintQuery.isLoading ? 'Detecting CT Mint...' : 
                                 detectedCtMint ? 'CT Mint Address (Auto-detected)' : 
                                 'CT Mint Not Found'}
                              </p>
                              {detectedCtMint && (
                                <p className="text-xs font-mono text-gray-700 break-all">{detectedCtMint}</p>
                              )}
                              {!detectedCtMint && !ctMintQuery.isLoading && (
                                <input
                                  type="text"
                                  placeholder="Enter CT Mint address manually"
                                  value={ctMintAddress}
                                  onChange={(e) => setCtMintAddress(e.target.value)}
                                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono text-gray-900"
                                />
                              )}
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount to Burn (CT)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={burnAmount}
                                onChange={(e) => setBurnAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">CO2 Emissions (tons)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={emissionAmount}
                                onChange={(e) => setEmissionAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                              />
                            </div>
                            <button 
                              onClick={handleBurnTokens}
                              disabled={!burnAmount || !emissionAmount || !detectedCtMint || burnCtForComplianceHandler.isPending}
                              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {burnCtForComplianceHandler.isPending ? 'Burning...' : 'Burn Tokens'}
                            </button>
                          </div>
                        </div>

                        {/* Account Summary */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                            Account Summary
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                              <span className="text-gray-700 font-medium">CT Balance</span>
                              <span className="font-bold text-emerald-600">{formatNumber(userIndustry.account.ctBalance)} CT</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                              <span className="text-gray-700 font-medium">Tokens Burned</span>
                              <span className="font-bold text-orange-600">{formatNumber(userIndustry.account.totalBurned)} CT</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                              <span className="text-gray-700 font-medium">Total Purchased</span>
                              <span className="font-bold text-blue-600">{formatNumber(userIndustry.account.totalPurchased)} CT</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                              <span className="text-gray-700 font-medium">Bond Amount</span>
                              <span className="font-bold text-purple-600">{formatNumber(userIndustry.account.bondAmount)} SOL</span>
                            </div>
                          </div>
                        </div>

                        {/* Deposit Bond */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Award className="w-5 h-5 text-blue-500 mr-2" />
                            Deposit Bond
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (SOL)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                              />
                            </div>
                            <button 
                              onClick={handleDepositBond}
                              disabled={!depositAmount || !userIndustry.account.verified || depositBondHandler.isPending}
                              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {depositBondHandler.isPending ? 'Depositing...' : 'Deposit Bond'}
                            </button>
                            <p className="text-xs text-gray-500">Current: {formatNumber(userIndustry.account.bondAmount)} SOL</p>
                          </div>
                        </div>

                        {/* Withdraw Bond */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Wallet className="w-5 h-5 text-purple-500 mr-2" />
                            Withdraw Bond
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (SOL)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                              />
                            </div>
                            <button 
                              onClick={handleWithdrawBond}
                              disabled={!withdrawAmount || Object.keys(userIndustry.account.complianceStatus)[0] !== 'compliant' || withdrawBondHandler.isPending}
                              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {withdrawBondHandler.isPending ? 'Withdrawing...' : 'Withdraw Bond'}
                            </button>
                            <p className="text-xs text-gray-500">Must be compliant to withdraw</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                      <BadgeCheck className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h3>
                      <p className="text-gray-500 mb-6">Register your industry account to access compliance features</p>
                      <button
                        onClick={() => setActiveTab('register')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg font-semibold"
                      >
                        Register Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reports View */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Emission Reports</h2>
                    <p className="text-gray-500">Submit and track your emission reports</p>
                  </div>
                  
                  {userIndustry ? (
                    <>
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 border border-blue-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Submit New Report</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">CO2 Emitted (tons)</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={co2Emitted}
                              onChange={(e) => setCo2Emitted(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Report Period</label>
                            <input
                              type="text"
                              placeholder="e.g., 2024-Q4"
                              value={reportPeriod}
                              onChange={(e) => setReportPeriod(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleSubmitReport}
                          disabled={!co2Emitted || !reportPeriod || submitEmissionReportHandler.isPending}
                          className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl hover:from-blue-600 hover:to-green-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitEmissionReportHandler.isPending ? 'Submitting...' : 'Submit Report'}
                        </button>
                      </div>

                      {emissionReportAccounts.isLoading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                          <p className="text-gray-500 mt-4">Loading reports...</p>
                        </div>
                      ) : userReports && userReports.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-gray-900">Your Reports</h3>
                          {userReports.map((report) => (
                            <div key={report.publicKey.toString()} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-green-400 rounded-xl flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{report.account.reportPeriod}</p>
                                  <p className="text-sm text-gray-500">
                                    {formatNumber(report.account.co2Emitted)} tons CO2 • 
                                    {new Date(report.account.submittedAt.toNumber() * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                                report.account.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {report.account.verified ? '✓ Verified' : '⏳ Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No emission reports submitted yet</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                      <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h3>
                      <p className="text-gray-500 mb-6">Register your industry account to submit emission reports</p>
                      <button
                        onClick={() => setActiveTab('register')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg font-semibold"
                      >
                        Register Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Register View */}
              {activeTab === 'register' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Register Industry Account</h2>
                    <p className="text-gray-500">Create your account to start trading carbon tokens</p>
                  </div>
                  
                  {!userIndustry ? (
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Create Your Industry Account</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                            <input
                              type="text"
                              placeholder="Enter your company name"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Bond Amount (SOL)</label>
                            <input
                              type="number"
                              placeholder="Minimum 1 SOL"
                              value={bondAmount}
                              onChange={(e) => setBondAmount(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                            />
                            <p className="text-xs text-gray-500 mt-2">A security deposit of at least 1 SOL is required</p>
                          </div>
                          <button 
                            onClick={handleRegisterIndustry}
                            disabled={!companyName || !bondAmount || parseFloat(bondAmount) < 1 || registerIndustryHandler.isPending}
                            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {registerIndustryHandler.isPending ? 'Registering...' : 'Register Industry'}
                          </button>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-emerald-200">
                          <h4 className="font-bold text-gray-900 mb-3">What happens next?</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-start">
                              <BadgeCheck className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>Your account will be created and pending verification</span>
                            </li>
                            <li className="flex items-start">
                              <Award className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>Admin will verify your industry account</span>
                            </li>
                            <li className="flex items-start">
                              <Leaf className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>Once verified, you can participate in carbon token auctions</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BadgeCheck className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Already Registered</h3>
                      <p className="text-gray-600 mb-4">Company: {userIndustry.account.companyName}</p>
                      <p className="text-sm text-gray-500 mb-6">
                        Status: {userIndustry.account.verified ? '✓ Verified' : '⏳ Pending Verification'}
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => setActiveTab('dashboard')}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg font-semibold"
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin Section - Create Auction */}
                  {isAdmin && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100 shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Settings className="w-6 h-6 text-orange-600 mr-3" />
                        Admin: Create Auction
                      </h2>
                      <div className="max-w-2xl">
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                          <h3 className="font-bold text-gray-900 mb-4">Create New Carbon Token Auction</h3>
                          
                          {/* Show next batch number (read-only) */}
                          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-sm text-gray-600 mb-1">Next Batch Number (Auto-generated)</p>
                            <p className="text-2xl font-bold text-blue-600">#{nextBatchNumber}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Total Tokens (CT)</label>
                              <input
                                type="number"
                                placeholder="e.g., 100"
                                value={totalTokens}
                                onChange={(e) => setTotalTokens(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Start Price (SOL)</label>
                              <input
                                type="number"
                                placeholder="e.g., 1.5"
                                value={startPrice}
                                onChange={(e) => setStartPrice(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Reserve Price (SOL)</label>
                              <input
                                type="number"
                                placeholder="e.g., 0.5"
                                value={reservePrice}
                                onChange={(e) => setReservePrice(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Duration (seconds)</label>
                              <input
                                type="number"
                                placeholder="e.g., 86400 (24 hours)"
                                value={auctionDuration}
                                onChange={(e) => setAuctionDuration(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={handleCreateAuction}
                            disabled={!totalTokens || !startPrice || !reservePrice || !auctionDuration || createAuctionHandler.isPending}
                            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {createAuctionHandler.isPending ? 'Creating...' : 'Create Auction'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Panel View */}
              {activeTab === 'admin' && isAdmin && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Control Panel</h2>
                    <p className="text-gray-500">Manage industries, auctions, and platform operations</p>
                  </div>

                  {/* <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Zap className="w-5 h-5 text-emerald-500 mr-2" />
                      Initialize CT Mint
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Status: {detectedCtMint ? '✓ Already Initialized' : '⚠️ Not Initialized'}
                      </p>
                      {detectedCtMint ? (
                        <div className="p-3 bg-emerald-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">CT Mint Address</p>
                          <p className="text-xs font-mono text-gray-700 break-all">{detectedCtMint}</p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => initializeHandler.mutate({ authorityPubkey: publicKey! })}
                          disabled={!publicKey || initializeHandler.isPending}
                          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {initializeHandler.isPending ? 'Initializing...' : 'Initialize CT Mint'}
                        </button>
                      )}
                    </div>
                  </div> */}

                  {/* Admin Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                      icon={Users}
                      label="Total Industries"
                      value={industryAccounts.data?.length.toString() || '0'}
                      subtitle="Registered companies"
                      gradient="from-blue-500 to-indigo-500"
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Active Auctions"
                      value={auctionAccounts.data?.filter(a => Object.keys(a.account.status)[0] === 'active').length.toString() || '0'}
                      subtitle="Live on platform"
                      gradient="from-emerald-500 to-green-500"
                    />
                    <StatCard
                      icon={ShoppingCart}
                      label="Total Bids"
                      value={bidAccounts.data?.length.toString() || '0'}
                      subtitle="All time"
                      gradient="from-purple-500 to-pink-500"
                    />
                    <StatCard
                      icon={FileText}
                      label="Emission Reports"
                      value={emissionReportAccounts.data?.length.toString() || '0'}
                      subtitle="Submitted"
                      gradient="from-amber-500 to-orange-500"
                    />
                  </div>

                  {/* Verify Industry */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <BadgeCheck className="w-5 h-5 text-emerald-500 mr-2" />
                      Verify Industry Account
                    </h3>
                    <div className="max-w-2xl">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Industry Authority Address</label>
                          <input
                            type="text"
                            placeholder="Enter industry authority public key"
                            value={verifyIndustryAddress}
                            onChange={(e) => setVerifyIndustryAddress(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-mono text-sm"
                          />
                        </div>
                        <button 
                          onClick={handleVerifyIndustry}
                          disabled={!verifyIndustryAddress || verifyIndustryHandler.isPending}
                          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifyIndustryHandler.isPending ? 'Verifying...' : 'Verify Industry'}
                        </button>
                      </div>

                      {/* Pending Industries List */}
                      <div className="mt-6">
                        <h4 className="font-bold text-gray-900 mb-3">Pending Verification</h4>
                        <div className="space-y-2">
                          {industryAccounts.data
                            ?.filter(ind => !ind.account.verified)
                            .map(ind => (
                              <div key={ind.publicKey.toString()} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <div>
                                  <p className="font-semibold text-gray-900">{ind.account.companyName}</p>
                                  <p className="text-xs text-gray-500 font-mono">{ind.account.authority.toString()}</p>
                                </div>
                                <button
                                  onClick={() => setVerifyIndustryAddress(ind.account.authority.toString())}
                                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-semibold"
                                >
                                  Select
                                </button>
                              </div>
                            ))}
                          {!industryAccounts.data?.some(ind => !ind.account.verified) && (
                            <p className="text-sm text-gray-500 text-center py-4">No pending verifications</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auction Management */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Finalize Auction */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 text-blue-500 mr-2" />
                        Finalize Auction
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Batch Number</label>
                          <input
                            type="number"
                            placeholder="Enter batch number"
                            value={finalizeAuctionBatch}
                            onChange={(e) => setFinalizeAuctionBatch(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                        <button 
                          onClick={handleFinalizeAuction}
                          disabled={!finalizeAuctionBatch || finalizeAuctionHandler.isPending}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {finalizeAuctionHandler.isPending ? 'Finalizing...' : 'Finalize Auction'}
                        </button>
                      </div>

                      {/* Active Auctions for Quick Selection */}
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Quick Select:</p>
                        <div className="flex flex-wrap gap-2">
                          {auctionAccounts.data
                            ?.filter(a => ['active', 'completed'].includes(Object.keys(a.account.status)[0]))
                            .map(a => (
                              <button
                                key={a.publicKey.toString()}
                                onClick={() => setFinalizeAuctionBatch(a.account.batchNumber.toString())}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-xs font-semibold"
                              >
                                Batch #{a.account.batchNumber}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Cancel Auction */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        Cancel Auction
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Batch Number</label>
                          <input
                            type="number"
                            placeholder="Enter batch number"
                            value={cancelAuctionBatch}
                            onChange={(e) => setCancelAuctionBatch(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                          />
                        </div>
                        <button 
                          onClick={handleCancelAuction}
                          disabled={!cancelAuctionBatch || cancelAuctionHandler.isPending}
                          className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelAuctionHandler.isPending ? 'Cancelling...' : 'Cancel Auction'}
                        </button>
                        <p className="text-xs text-gray-500">⚠️ Only auctions with no participants can be cancelled</p>
                      </div>
                    </div>
                  </div>

                  {/* Withdraw Proceeds */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Wallet className="w-5 h-5 text-purple-500 mr-2" />
                      Withdraw Auction Proceeds
                    </h3>
                    <div className="max-w-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Batch Number</label>
                          <input
                            type="number"
                            placeholder="Enter batch number"
                            value={withdrawProceedsBatch}
                            onChange={(e) => setWithdrawProceedsBatch(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Treasury Address
                            {publicKey && (
                              <button
                                onClick={() => setTreasuryAddress(publicKey.toString())}
                                className="ml-2 text-xs text-purple-600 hover:text-purple-700 font-semibold"
                              >
                                (Use My Wallet)
                              </button>
                            )}
                          </label>
                          <input
                            type="text"
                            placeholder="Enter treasury public key"
                            value={treasuryAddress}
                            onChange={(e) => setTreasuryAddress(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 font-mono text-sm"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleWithdrawProceeds}
                        disabled={!withdrawProceedsBatch || !treasuryAddress || withdrawProceedsHandler.isPending}
                        className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {withdrawProceedsHandler.isPending ? 'Withdrawing...' : 'Withdraw Proceeds'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2">💡 Auction must be finalized before withdrawing proceeds</p>

                      {/* Finalized Auctions for Quick Selection */}
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Finalized Auctions:</p>
                        <div className="flex flex-wrap gap-2">
                          {auctionAccounts.data
                            ?.filter(a => Object.keys(a.account.status)[0] === 'finalized')
                            .map(a => (
                              <button
                                key={a.publicKey.toString()}
                                onClick={() => setWithdrawProceedsBatch(a.account.batchNumber.toString())}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-xs font-semibold"
                              >
                                Batch #{a.account.batchNumber} • {formatNumber(a.account.totalRaised)} SOL
                              </button>
                            ))}
                          {auctionAccounts.data?.filter(a => Object.keys(a.account.status)[0] === 'finalized').length === 0 && (
                            <p className="text-xs text-gray-500">No finalized auctions yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All Industries Overview */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 text-blue-500 mr-2" />
                      All Registered Industries
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Company</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Compliance</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">CT Balance</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bond</th>
                          </tr>
                        </thead>
                        <tbody>
                          {industryAccounts.data?.map(ind => (
                            <tr key={ind.publicKey.toString()} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-900">{ind.account.companyName}</p>
                                <p className="text-xs text-gray-500 font-mono">{ind.account.authority.toString().slice(0, 8)}...</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  ind.account.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {ind.account.verified ? '✓ Verified' : '⏳ Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize bg-${getComplianceColor(ind.account.complianceStatus)}-100 text-${getComplianceColor(ind.account.complianceStatus)}-700`}>
                                  {Object.keys(ind.account.complianceStatus)[0]}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-gray-900">
                                {formatNumber(ind.account.ctBalance)} CT
                              </td>
                              <td className="py-3 px-4 font-semibold text-gray-900">
                                {formatNumber(ind.account.bondAmount)} SOL
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white/50 backdrop-blur-lg border-t border-gray-100 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-gray-600">Powered by Solana Blockchain</span>
              </div>
              <div className="flex items-center space-x-6">
                <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition">Documentation</a>
                <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition">Support</a>
                <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition">About</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
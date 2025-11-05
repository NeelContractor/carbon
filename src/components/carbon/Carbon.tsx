"use client"

import { useState } from 'react'
import { Leaf, TreeDeciduous, Sprout, Wind, Globe, TrendingUp, Award, ShoppingCart, Clock, Users, Zap, ChevronRight, BadgeCheck, Settings, BarChart3, FileText, Wallet, Plus } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useCarbonProgram } from './carbon-data-access'
import { WalletButton } from '../solana/solana-provider'

export default function Carbon() {
  const { publicKey } = useWallet()
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
  const [batchNumber, setBatchNumber] = useState('')
  const [totalTokens, setTotalTokens] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('')
  const [bidTokenAmount, setBidTokenAmount] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<any>(null)

  const {
    auctionAccounts,
    bidAccounts,
    industryAccounts,
    emissionReportAccounts,
    registerIndustryHandler,
    depositBondHandler,
    withdrawBondHandler,
    submitEmissionReportHandler,
    createAuctionHandler,
    placeBidHandler,
    burnCtForComplianceHandler,
  } = useCarbonProgram()

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
    if (!publicKey || !batchNumber || !totalTokens || !startPrice || !reservePrice || !auctionDuration) return
    try {
      await createAuctionHandler.mutateAsync({
        adminPubkey: publicKey,
        BATCH_NUMBER: parseInt(batchNumber),
        TOTAL_TOKENS: new BN(parseFloat(totalTokens) * 1e9),
        START_PRICE: new BN(parseFloat(startPrice) * 1e9),
        RESERVE_PRICE: new BN(parseFloat(reservePrice) * 1e9),
        AUCTION_DURATION: new BN(parseInt(auctionDuration))
      })
      setBatchNumber('')
      setTotalTokens('')
      setStartPrice('')
      setReservePrice('')
      setAuctionDuration('')
    } catch (error) {
      console.error(error)
    }
  }

  const handlePlaceBid = async (auction: any) => {
    if (!publicKey || !bidTokenAmount) return
    try {
      await placeBidHandler.mutateAsync({
        industryAuthorityPubkey: publicKey,
        BATCH_NUMBER: auction.account.batchNumber,
        tokenAmount: new BN(parseFloat(bidTokenAmount) * 1e9),
        bidTimestamp: new BN(Date.now())
      })
      setBidTokenAmount('')
      setSelectedAuction(null)
    } catch (error) {
      console.error(error)
    }
  }

  const handleBurnTokens = async () => {
    if (!publicKey || !burnAmount || !emissionAmount) return
    // Note: You'll need to pass the ctMintPubkey from somewhere
    try {
      await burnCtForComplianceHandler.mutateAsync({
        industryAuthorityPubkey: publicKey,
        ctMintPubkey: new PublicKey('YOUR_CT_MINT_ADDRESS'), // Replace with actual mint
        burnAmount: new BN(parseFloat(burnAmount) * 1e9),
        emissionAmount: new BN(parseFloat(emissionAmount) * 1e9)
      })
      setBurnAmount('')
      setEmissionAmount('')
    } catch (error) {
      console.error(error)
    }
  }

  const formatNumber = (num: any) => {
    if (!num) return '0'
    return (num.toNumber() / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const getComplianceColor = (status: any) => {
    if (!status) return 'gray'
    const statusStr = Object.keys(status)[0]
    switch(statusStr) {
      case 'compliant': return 'green'
      case 'nonCompliant': return 'red'
      case 'pending': return 'yellow'
      case 'warning': return 'orange'
      default: return 'gray'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-green-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <TreeDeciduous className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    CarbonChain
                  </h1>
                  <p className="text-xs text-green-600">Decentralized Carbon Credits</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div>
                    <WalletButton />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white/60 backdrop-blur-md border-b border-green-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'auctions', label: 'Auctions', icon: TrendingUp },
                { id: 'mybids', label: 'My Bids', icon: ShoppingCart },
                { id: 'compliance', label: 'Compliance', icon: BadgeCheck },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'register', label: 'Register', icon: Plus }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200'
                      : 'text-green-700 hover:bg-green-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-xl transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                      <Leaf className="w-6 h-6 text-white" />
                    </div>
                    {userIndustry && (
                      <span className={`text-xs font-semibold px-3 py-1 bg-${getComplianceColor(userIndustry.account.complianceStatus)}-100 text-${getComplianceColor(userIndustry.account.complianceStatus)}-700 rounded-full`}>
                        {userIndustry.account.verified ? 'Verified' : 'Pending'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">CT Balance</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {userIndustry ? formatNumber(userIndustry.account.ctBalance) : '--'}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Carbon Tokens Available</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-xl transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Total Purchased</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {userIndustry ? formatNumber(userIndustry.account.totalPurchased) : '--'}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">All time purchases</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-xl transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                      <Wind className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Total Burned</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {userIndustry ? formatNumber(userIndustry.account.totalBurned) : '--'}
                  </p>
                  <p className="text-xs text-orange-600 mt-2">For compliance</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-xl transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Bond Amount</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {userIndustry ? formatNumber(userIndustry.account.bondAmount) : '--'} SOL
                  </p>
                  <p className="text-xs text-blue-600 mt-2">Security deposit</p>
                </div>
              </div>

              {/* Active Auctions Preview */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                    Active Auctions
                  </h2>
                  <button
                    onClick={() => setActiveTab('auctions')}
                    className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {auctionAccounts.data && auctionAccounts.data.length > 0 ? (
                  <div className="space-y-4">
                    {auctionAccounts.data.slice(0, 2).map(auction => {
                      const timeLeft = Math.max(0, auction.account.endTime.toNumber() - Date.now() / 1000)
                      const hours = Math.floor(timeLeft / 3600)
                      const minutes = Math.floor((timeLeft % 3600) / 60)
                      
                      return (
                        <div key={auction.publicKey.toString()} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 hover:shadow-md transition">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-bold text-gray-900">BATCH-{auction.account.batchNumber}</span>
                                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">
                                  {formatNumber(auction.account.tokensRemaining)} CT
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs">Current Price</p>
                                  <p className="font-bold text-green-600">{formatNumber(auction.account.currentPrice)} SOL</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Time Left</p>
                                  <p className="font-bold text-orange-600 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {hours}h {minutes}m
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Participants</p>
                                  <p className="font-bold text-blue-600 flex items-center">
                                    <Users className="w-3 h-3 mr-1" />
                                    {auction.account.participantCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedAuction(auction)
                                setActiveTab('auctions')
                              }}
                              className="ml-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg"
                            >
                              Place Bid
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active auctions at the moment</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auctions View */}
          {activeTab === 'auctions' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Globe className="w-6 h-6 text-green-600 mr-3" />
                  Live Carbon Token Auctions
                </h2>
                {auctionAccounts.data && auctionAccounts.data.length > 0 ? (
                  <div className="space-y-4">
                    {auctionAccounts.data.map(auction => {
                      const timeLeft = Math.max(0, auction.account.endTime.toNumber() - Date.now() / 1000)
                      const hours = Math.floor(timeLeft / 3600)
                      const minutes = Math.floor((timeLeft % 3600) / 60)
                      const isSelected = selectedAuction?.publicKey.toString() === auction.publicKey.toString()
                      
                      return (
                        <div key={auction.publicKey.toString()} className="bg-gradient-to-br from-white to-green-50 rounded-xl p-6 border border-green-200 hover:shadow-xl transition">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-2">BATCH-{auction.account.batchNumber}</h3>
                              <div className="flex items-center space-x-3">
                                <span className="px-4 py-1.5 bg-green-200 text-green-800 rounded-full text-sm font-bold">
                                  {formatNumber(auction.account.tokensRemaining)} CT Available
                                </span>
                                <span className="px-4 py-1.5 bg-orange-200 text-orange-800 rounded-full text-sm font-bold flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {hours}h {minutes}m
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">Dutch Auction</p>
                              <p className="text-xs text-gray-400">Price decreases over time</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/50 rounded-xl p-4 border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Current Price</p>
                              <p className="text-2xl font-bold text-green-600">{formatNumber(auction.account.currentPrice)} SOL</p>
                            </div>
                            <div className="bg-white/50 rounded-xl p-4 border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Reserve Price</p>
                              <p className="text-2xl font-bold text-gray-900">{formatNumber(auction.account.reservePrice)} SOL</p>
                            </div>
                            <div className="bg-white/50 rounded-xl p-4 border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Participants</p>
                              <p className="text-2xl font-bold text-blue-600">{auction.account.participantCount}</p>
                            </div>
                            <div className="bg-white/50 rounded-xl p-4 border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Total Raised</p>
                              <p className="text-2xl font-bold text-purple-600">{formatNumber(auction.account.totalRaised)} SOL</p>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <input
                              type="number"
                              placeholder="Token amount"
                              value={isSelected ? bidTokenAmount : ''}
                              onChange={(e) => {
                                setSelectedAuction(auction)
                                setBidTokenAmount(e.target.value)
                              }}
                              className="flex-1 px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                              disabled={!publicKey || !userIndustry}
                            />
                            <button 
                              onClick={() => handlePlaceBid(auction)}
                              disabled={!publicKey || !userIndustry || !bidTokenAmount}
                              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Place Bid
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Auctions</h3>
                    <p className="text-gray-500 mb-6">Check back later for new carbon token auctions</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Bids View */}
          {activeTab === 'mybids' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <ShoppingCart className="w-6 h-6 text-green-600 mr-3" />
                  My Active Bids
                </h2>
                {userBids && userBids.length > 0 ? (
                  <div className="space-y-4">
                    {userBids.map((bid) => {
                      const statusColor = Object.keys(bid.account.status)[0] === 'pending' ? 'yellow' : Object.keys(bid.account.status)[0] === 'accepted' ? 'green' : 'gray'
                      
                      return (
                        <div key={bid.publicKey.toString()} className="bg-gradient-to-r from-white to-blue-50 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-3">Bid #{bid.publicKey.toString().slice(0, 8)}</h3>
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Token Amount</p>
                                  <p className="text-lg font-bold text-gray-900">{formatNumber(bid.account.tokenAmount)} CT</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Price Per Token</p>
                                  <p className="text-lg font-bold text-green-600">{formatNumber(bid.account.pricePerToken)} SOL</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                                  <p className="text-lg font-bold text-purple-600">{formatNumber(bid.account.totalCost)} SOL</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Status</p>
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-${statusColor}-100 text-${statusColor}-700`}>
                                    {Object.keys(bid.account.status)[0]}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Bids</h3>
                    <p className="text-gray-500 mb-6">You haven't placed any bids yet</p>
                    <button
                      onClick={() => setActiveTab('auctions')}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold"
                    >
                      Browse Auctions
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compliance View */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <BadgeCheck className="w-6 h-6 text-green-600 mr-3" />
                  Compliance Dashboard
                </h2>
                
                {userIndustry ? (
                  <>
                    <div className={`bg-gradient-to-br from-${getComplianceColor(userIndustry.account.complianceStatus)}-50 to-${getComplianceColor(userIndustry.account.complianceStatus)}-100 rounded-xl p-8 border-2 border-${getComplianceColor(userIndustry.account.complianceStatus)}-200 mb-6`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-3xl font-bold text-${getComplianceColor(userIndustry.account.complianceStatus)}-600 mb-2`}>
                            {Object.keys(userIndustry.account.complianceStatus)[0].toUpperCase()}
                          </h3>
                          <p className="text-gray-600">Current compliance status</p>
                        </div>
                        <div className={`w-20 h-20 bg-gradient-to-br from-${getComplianceColor(userIndustry.account.complianceStatus)}-400 to-${getComplianceColor(userIndustry.account.complianceStatus)}-500 rounded-full flex items-center justify-center`}>
                          <BadgeCheck className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl p-6 border border-green-100">
                        <h3 className="font-bold text-gray-900 mb-4">Burn Carbon Tokens</h3>
                        <input
                          type="number"
                          placeholder="Amount to burn"
                          value={burnAmount}
                          onChange={(e) => setBurnAmount(e.target.value)}
                          className="w-full px-4 py-3 border border-green-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="number"
                          placeholder="CO2 emissions (tons)"
                          value={emissionAmount}
                          onChange={(e) => setEmissionAmount(e.target.value)}
                          className="w-full px-4 py-3 border border-green-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button 
                          onClick={handleBurnTokens}
                          disabled={!burnAmount || !emissionAmount}
                          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Burn Tokens for Compliance
                        </button>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-green-100">
                        <h3 className="font-bold text-gray-900 mb-4">Account Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-600">CT Balance</span>
                            <span className="font-bold">{formatNumber(userIndustry.account.ctBalance)} CT</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-600">Tokens Burned</span>
                            <span className="font-bold text-orange-600">{formatNumber(userIndustry.account.totalBurned)} CT</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg">
                            <span className="text-gray-600">Total Purchased</span>
                            <span className="font-bold text-green-600">{formatNumber(userIndustry.account.totalPurchased)} CT</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-green-100">
                        <h3 className="font-bold text-gray-900 mb-4">Deposit Bond</h3>
                        <input
                          type="number"
                          placeholder="Amount in SOL"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full px-4 py-3 border border-green-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button 
                          onClick={handleDepositBond}
                          disabled={!depositAmount || !userIndustry.account.verified}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Deposit Bond
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Current: {formatNumber(userIndustry.account.bondAmount)} SOL</p>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-green-100">
                        <h3 className="font-bold text-gray-900 mb-4">Withdraw Bond</h3>
                        <input
                          type="number"
                          placeholder="Amount in SOL"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full px-4 py-3 border border-green-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button 
                          onClick={handleWithdrawBond}
                          disabled={!withdrawAmount || Object.keys(userIndustry.account.complianceStatus)[0] !== 'compliant'}
                          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Withdraw Bond
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Must be compliant to withdraw</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <BadgeCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h3>
                    <p className="text-gray-500 mb-6">Register your industry account to access compliance features</p>
                    <button
                      onClick={() => setActiveTab('register')}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold"
                    >
                      Register Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reports View */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileText className="w-6 h-6 text-green-600 mr-3" />
                  Emission Reports
                </h2>
                
                {userIndustry ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200 mb-6">
                      <h3 className="font-bold text-gray-900 mb-4">Submit New Report</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          placeholder="CO2 Emitted (tons)"
                          value={co2Emitted}
                          onChange={(e) => setCo2Emitted(e.target.value)}
                          className="px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Report Period (e.g., 2024-Q4)"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                          className="px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                      </div>
                      <button 
                        onClick={handleSubmitReport}
                        disabled={!co2Emitted || !reportPeriod}
                        className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl hover:from-blue-600 hover:to-green-600 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Report
                      </button>
                    </div>

                    {userReports && userReports.length > 0 ? (
                      <div className="space-y-3">
                        {userReports.map((report) => (
                          <div key={report.publicKey.toString()} className="flex items-center justify-between p-4 bg-white rounded-xl border border-green-100 hover:shadow-md transition">
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
                              report.account.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {report.account.verified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No emission reports submitted yet</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h3>
                    <p className="text-gray-500 mb-6">Register your industry account to submit emission reports</p>
                    <button
                      onClick={() => setActiveTab('register')}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold"
                    >
                      Register Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Register View */}
          {activeTab === 'register' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Plus className="w-6 h-6 text-green-600 mr-3" />
                  Register Industry Account
                </h2>
                
                {!userIndustry ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Create Your Industry Account</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                          <input
                            type="text"
                            placeholder="Enter your company name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Bond Amount (SOL)</label>
                          <input
                            type="number"
                            placeholder="Minimum 1 SOL"
                            value={bondAmount}
                            onChange={(e) => setBondAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-2">A security deposit of at least 1 SOL is required</p>
                        </div>
                        <button 
                          onClick={handleRegisterIndustry}
                          disabled={!publicKey || !companyName || !bondAmount || parseFloat(bondAmount) < 1}
                          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {registerIndustryHandler.isPending ? 'Registering...' : 'Register Industry'}
                        </button>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-green-200">
                        <h4 className="font-bold text-gray-900 mb-3">What happens next?</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start">
                            <BadgeCheck className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                            <span>Your account will be created and pending verification</span>
                          </li>
                          <li className="flex items-start">
                            <Award className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                            <span>Admin will verify your industry account</span>
                          </li>
                          <li className="flex items-start">
                            <Leaf className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                            <span>Once verified, you can participate in carbon token auctions</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Section - Create Auction */}
              {publicKey && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100 shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Settings className="w-6 h-6 text-orange-600 mr-3" />
                    Admin: Create Auction
                  </h2>
                  <div className="max-w-2xl">
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                      <h3 className="font-bold text-gray-900 mb-4">Create New Carbon Token Auction</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          placeholder="Batch Number"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          className="px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Total Tokens"
                          value={totalTokens}
                          onChange={(e) => setTotalTokens(e.target.value)}
                          className="px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Start Price (SOL)"
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          className="px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Reserve Price (SOL)"
                          value={reservePrice}
                          onChange={(e) => setReservePrice(e.target.value)}
                          className="px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Duration (seconds)"
                          value={auctionDuration}
                          onChange={(e) => setAuctionDuration(e.target.value)}
                          className="px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white col-span-2"
                        />
                      </div>
                      <button 
                        onClick={handleCreateAuction}
                        disabled={!batchNumber || !totalTokens || !startPrice || !reservePrice || !auctionDuration}
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
        </main>

        {/* Footer */}
        <footer className="bg-white/60 backdrop-blur-md border-t border-green-100 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Powered by Solana Blockchain</span>
              </div>
              <div className="flex items-center space-x-6">
                <a href="#" className="text-sm text-gray-600 hover:text-green-600 transition">Documentation</a>
                <a href="#" className="text-sm text-gray-600 hover:text-green-600 transition">Support</a>
                <a href="#" className="text-sm text-gray-600 hover:text-green-600 transition">About</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
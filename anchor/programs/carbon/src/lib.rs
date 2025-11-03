#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Mint, Token, TokenAccount, Burn, Transfer}};

declare_id!("4WEXh5GfWzfAyxmhAdVC5VFLxhj9hsv5zo7t6CeQMf5B");

#[program]
pub mod carbon {
    use anchor_spl::token::MintTo;

    use super::*;

    pub fn initialize(_ctx: Context<InitializeMint>) -> Result<()> {
        Ok(())
    }

    pub fn register_industry(ctx: Context<RegisterIndustry>, comany_name: String, bond_amount: u64) -> Result<()> {
        let industry = &mut ctx.accounts.industry_account;

        require!(bond_amount >= 1_000_000_000, CarbonError::InsufficientBond);

        industry.authority = ctx.accounts.authority.key();
        industry.company_name = comany_name;
        industry.bond_amount = bond_amount;
        industry.verified = false;
        industry.ct_balance = 0;
        industry.total_purchased = 0;
        industry.total_burned = 0;
        industry.compliance_status = ComplianceStatus::Pending;
        industry.created_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn verify_industry(ctx: Context<VerifyIndustry>) -> Result<()> {
        let industry = &mut ctx.accounts.industry_account;

        require!(!industry.verified, CarbonError::AlreadyVerified);
        industry.verified = true;
        industry.compliance_status = ComplianceStatus::Compliant;

        Ok(())
    }

    pub fn deposit_bond(ctx: Context<DepositBond>, amount: u64) -> Result<()> {
        let industry = &mut ctx.accounts.industry_account;

        require!(industry.verified, CarbonError::NotVerified);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.bond_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info()
                },
            ),
            amount,
        )?;

        industry.bond_amount += amount;

        Ok(())
    }

    pub fn burn_ct_for_compliance(ctx: Context<BurnCT>, amount: u64, emission_amount: u64) -> Result<()> {
        let industry = &mut ctx.accounts.industry_account;

        require!(industry.verified, CarbonError::NotVerified);
        require!(industry.ct_balance >= amount, CarbonError::InsufficientCT);

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.ct_mint.to_account_info(),
                    from: ctx.accounts.industry_ct_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info()
                },
            ),
            amount,
        )?;

        industry.ct_balance -= amount;
        industry.total_burned += amount;

        if amount >= emission_amount {
            industry.compliance_status = ComplianceStatus::Compliant;
        } else {
            industry.compliance_status = ComplianceStatus::NonCompliant;
        }

        Ok(())
    }

    pub fn submit_emission_report(ctx: Context<SubmitEmissionReport>, co2_emitted: u64, report_period: String, _timestamp: u64) -> Result<()> {
        let report = &mut ctx.accounts.emission_report;

        report.industry = ctx.accounts.industry_account.key();
        report.co2_emitted = co2_emitted;
        report.report_period = report_period;
        report.submitted_at = Clock::get()?.unix_timestamp;
        report.verified = false;

        Ok(())
    }

    pub fn withdraw_bond(ctx: Context<WithdrawBond>, amount: u64) -> Result<()> {
        let industry = &mut ctx.accounts.industry_account;

        require!(industry.compliance_status == ComplianceStatus::Compliant, CarbonError::NotCompliant);
        require!(industry.bond_amount >= amount, CarbonError::InsufficientBond);

        let seeds: &[&[u8]] = &[
            b"bond_vault_authority",
            &[ctx.bumps.vault_authority],
        ];
        let signer_seeds: &[&[&[u8]]] = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(), 
                Transfer {
                    from: ctx.accounts.bond_vault.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                }, 
                signer_seeds
            ), 
            amount
        )?;

        industry.bond_amount -= amount;
        Ok(())
    }

    pub fn create_auction(ctx: Context<CreateAuction>, batch_number: u32, total_tokens: u64, start_price: u64, reserve_price: u64, duration_seconds: i64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(start_price > reserve_price, CarbonError::InvalidPricing);
        require!(duration_seconds > 0, CarbonError::InvalidDuration);
        require!(total_tokens > 0, CarbonError::InvalidTokenAmount);

        auction.authority = ctx.accounts.authority.key();
        auction.batch_number = batch_number;
        auction.total_tokens = total_tokens;
        auction.tokens_remaining = total_tokens;
        auction.start_price = start_price;
        auction.current_price = start_price;
        auction.reserve_price = reserve_price;
        auction.start_time = clock.unix_timestamp;
        auction.end_time = clock.unix_timestamp + duration_seconds;
        auction.status = AuctionStatus::Active;
        auction.total_raised = 0;
        auction.participant_count = 0;
        auction.tokens_sold = 0;

        Ok(())
    }

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        token_amount: u64,
        _timestamp: u64
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid;
        let industry = &mut ctx.accounts.industry_account;
        let clock = Clock::get()?;

        require!(industry.verified, CarbonError::NotVerified);
        require!(auction.status == AuctionStatus::Active, CarbonError::AuctionNotActive);
        require!(clock.unix_timestamp < auction.end_time, CarbonError::AuctionEnded);
        require!(token_amount <= auction.tokens_remaining, CarbonError::InsufficientTokens);
        require!(token_amount > 0, CarbonError::InvalidTokenAmount);

        // Calculate current price based on linear decay
        let current_price = calculate_current_price(
            auction.start_price,
            auction.reserve_price,
            auction.start_time,
            auction.end_time,
            clock.unix_timestamp,
        )?;

        auction.current_price = current_price;

        let total_cost = token_amount
            .checked_mul(current_price)
            .ok_or(CarbonError::MathOverflow)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bidder_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            total_cost,
        )?;

        bid.auction = auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.industry = industry.key();
        bid.token_amount = token_amount;
        bid.price_per_token = current_price;
        bid.total_cost = total_cost;
        bid.timestamp = clock.unix_timestamp;
        bid.status = BidStatus::Pending;

        auction.tokens_remaining -= token_amount;
        auction.total_raised += total_cost;
        auction.participant_count += 1;

        if auction.tokens_remaining == 0 {
            auction.status = AuctionStatus::Completed;
        }

        Ok(())
    }

    pub fn finalize_auction(ctx: Context<FinalizeAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            auction.status == AuctionStatus::Active || auction.status == AuctionStatus::Completed,
            CarbonError::InvalidAuctionStatus
        );
        require!(
            clock.unix_timestamp >= auction.end_time || auction.tokens_remaining == 0,
            CarbonError::AuctionNotEnded
        );

        // Calculate clearing price
        let clearing_price = if auction.tokens_remaining == 0 {
            auction.current_price
        } else {
            auction.reserve_price
        };

        auction.status = AuctionStatus::Finalized;
        auction.current_price = clearing_price;

        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid;
        let industry = &mut ctx.accounts.industry_account;

        require!(auction.status == AuctionStatus::Finalized, CarbonError::AuctionNotFinalized);
        require!(bid.status == BidStatus::Pending, CarbonError::BidAlreadyProcessed);

        let clearing_price = auction.current_price;
        let final_cost = bid.token_amount
            .checked_mul(clearing_price)
            .ok_or(CarbonError::MathOverflow)?;
        
        let refund_amount = bid.total_cost
            .checked_sub(final_cost)
            .ok_or(CarbonError::MathOverflow)?;

        let auction_key = auction.key();
        if refund_amount > 0 {
            let seeds = &[
                b"escrow_authority",
                auction_key.as_ref(),
                &[ctx.bumps.escrow_authority],
            ];
            let signer = &[&seeds[..]];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.bidder_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    signer,
                ),
                refund_amount,
            )?;
        }

        let mint_seeds: &[&[u8]] = &[
            b"mint_authority",
            &[ctx.bumps.mint_authority],
        ];
        let mint_signer: &[&[&[u8]]] = &[&mint_seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ct_mint.to_account_info(),
                    to: ctx.accounts.industry_ct_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                mint_signer,
            ),
            bid.token_amount,
        )?;

        industry.ct_balance += bid.token_amount;
        industry.total_purchased += bid.token_amount;

        bid.status = BidStatus::Accepted;

        Ok(())
    }

    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;

        require!(auction.status == AuctionStatus::Active, CarbonError::InvalidAuctionStatus);
        require!(auction.participant_count == 0, CarbonError::HasParticipants);

        auction.status = AuctionStatus::Cancelled;

        Ok(())
    }

    pub fn withdraw_proceeds(ctx: Context<WithdrawProceeds>) -> Result<()> {
        let auction = &ctx.accounts.auction;

        require!(auction.status == AuctionStatus::Finalized, CarbonError::AuctionNotFinalized);

        let auction_key = auction.key();
        let seeds = &[
            b"escrow_authority",
            auction_key.as_ref(),
            &[ctx.bumps.escrow_authority],
        ];
        let signer = &[&seeds[..]];

        let escrow_balance = ctx.accounts.escrow_usdc.amount;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_usdc.to_account_info(),
                    to: ctx.accounts.treasury_usdc.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                signer,
            ),
            escrow_balance,
        )?;

        Ok(())
    }
}

fn calculate_current_price(start_price: u64, reserve_price: u64, start_time: i64, end_time: i64, current_time: i64) -> Result<u64> {
    if current_time >= end_time {
        return Ok(reserve_price);
    }
    if current_time <= start_time {
        return Ok(start_price);
    }

    let duration = end_time - start_time;
    let elapsed = current_time - start_time;
    let price_range = start_price - reserve_price;

    let decay = (price_range as u128)
        .checked_mul(elapsed as u128)
        .ok_or(CarbonError::MathOverflow)?
        .checked_div(duration as u128)
        .ok_or(CarbonError::MathOverflow)?;

    let current_price = start_price
        .checked_sub(decay as u64).ok_or(CarbonError::MathOverflow)?;
    Ok(current_price.max(reserve_price))
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = mint_authority
    )]
    pub ct_mint: Account<'info, Mint>,

    /// CHECK: PDA authority for minting
    #[account(
        seeds = [b"mint_auhtority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterIndustry<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + IndustryAccount::INIT_SPACE,
        seeds = [b"industry", authority.key().as_ref()],
        bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyIndustry<'info> {
    /// CHECK: Admin Authority
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"industry", industry_account.authority.as_ref()],
        bump = industry_account.bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,
}

#[derive(Accounts)]
pub struct DepositBond<'info> {
    #[account(
        mut,
        seeds = [b"industry", authority.key().as_ref()],
        bump = industry_account.bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bond_vault: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnCT<'info> {
    #[account(
        mut,
        seeds = [b"industry", authority.key().as_ref()],
        bump = industry_account.bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,

    #[account(mut)]
    pub ct_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub industry_ct_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(timestamp: u64)]
pub struct SubmitEmissionReport<'info> {
    #[account(
        mut,
        seeds = [b"industry", authority.key().as_ref()],
        bump = industry_account.bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + EmissionReport::INIT_SPACE,
        seeds = [b"emission_report", industry_account.key().as_ref(), timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub emission_report: Account<'info, EmissionReport>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct WithdrawBond<'info> {
    #[account(
        mut,
        seeds = [b"industry", authority.key().as_ref()],
        bump = industry_account.bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,

    #[account(mut)]
    pub bond_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"bond_vault_authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(batch_number: u32)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Auction::INIT_SPACE,
        seeds = [b"auction", batch_number.to_le_bytes().as_ref()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(timestamp: u64)]
pub struct PlaceBid<'info> {
    #[account(
        mut,
        seeds = [b"auction", &auction.batch_number.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = 8 + Bid::INIT_SPACE,
        seeds = [
            b"bid",
            auction.key().as_ref(),
            bidder.key().as_ref(),
            timestamp.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"industry", bidder.key().as_ref()],
        bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,

    #[account(mut)]
    pub bidder_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction", &auction.batch_number.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Admin authority
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(
        seeds = [b"auction", &auction.batch_number.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(mut)]
    pub bid: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"industry", bid.bidder.as_ref()],
        bump,
    )]
    pub industry_account: Account<'info, IndustryAccount>,

    #[account(mut)]
    pub ct_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = bidder,
        associated_token::mint = ct_mint,
        associated_token::authority = bidder,
    )]
    pub industry_ct_account: Account<'info, TokenAccount>,

    /// CHECK: Mint authority PDA
    #[account(
        seeds = [b"mint_authority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bidder_usdc: Account<'info, TokenAccount>,

    /// CHECK: Escrow authority PDA
    #[account(
        seeds = [b"escrow_authority", auction.key().as_ref()],
        bump,
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction", &auction.batch_number.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Admin authority
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawProceeds<'info> {
    #[account(
        seeds = [b"auction", &auction.batch_number.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(mut)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_usdc: Account<'info, TokenAccount>,

    /// CHECK: Escrow authority PDA
    #[account(
        seeds = [b"escrow_authority", auction.key().as_ref()],
        bump,
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    /// CHECK: Admin authority
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct IndustryAccount {
    pub authority: Pubkey,
    #[max_len(100)]
    pub company_name: String,
    pub bond_amount: u64,
    pub verified: bool,
    pub ct_balance: u64,
    pub total_purchased: u64,
    pub total_burned: u64,
    pub compliance_status: ComplianceStatus,
    pub created_at: i64,
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct EmissionReport {
    pub industry: Pubkey,
    pub co2_emitted: u64,
    #[max_len(20)]
    pub report_period: String,
    pub submitted_at: i64,
    pub verified: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Auction {
    pub authority: Pubkey,
    pub batch_number: u32,
    pub total_tokens: u64,
    pub tokens_remaining: u64,
    pub start_price: u64,
    pub current_price: u64,
    pub reserve_price: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub status: AuctionStatus,
    pub total_raised: u64,
    pub participant_count: u32,
    pub tokens_sold: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Bid {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub industry: Pubkey,
    pub token_amount: u64,
    pub price_per_token: u64,
    pub total_cost: u64,
    pub timestamp: i64,
    pub status: BidStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ComplianceStatus {
    Pending,
    Compliant,
    NonCompliant,
    Warning,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AuctionStatus {
    Active,
    Completed,
    Finalized,
    Cancelled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum BidStatus {
    Pending,
    Accepted,
    Refunded,
}

#[error_code]
pub enum CarbonError {
    #[msg("Insufficient bond amount. Minimum 1000 USDC required.")]
    InsufficientBond,
    #[msg("Industry is not verified yet.")]
    NotVerified,
    #[msg("Industry is already verified.")]
    AlreadyVerified,
    #[msg("Insufficient CCT balance.")]
    InsufficientCT,
    #[msg("Industry is not compiant. Cannot withdraw bond.")]
    NotCompliant,
    #[msg("Invalid pricing: start price must be greater than reserve price.")]
    InvalidPricing,
    #[msg("Invalid duration: must be greater than 0.")]
    InvalidDuration,
    #[msg("Invalid token amount.")]
    InvalidTokenAmount,
    #[msg("Auction is not active.")]
    AuctionNotActive,
    #[msg("Auction has already ended.")]
    AuctionEnded,
    #[msg("Insufficient tokens remaining.")]
    InsufficientTokens,
    #[msg("Math overflow occurred.")]
    MathOverflow,
    #[msg("Invalid auction status for this operation.")]
    InvalidAuctionStatus,
    #[msg("Auction has not ended yet.")]
    AuctionNotEnded,
    #[msg("Auction has not been finalized yet.")]
    AuctionNotFinalized,
    #[msg("Bid hash already beed processed.")]
    BidAlreadyProcessed,
    #[msg("Cannot cancel auction with participants.")]
    HasParticipants,
}
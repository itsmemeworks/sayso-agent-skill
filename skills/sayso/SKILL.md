---
name: sayso
description: Buy, sell, swap or bridge crypto across Solana, Base, Robinhood Chain and HyperEVM through Sayso, and check whether a coin is safe. Use when the user asks to trade a token, move money between chains, top up gas, see what's trending, or check a coin. Sayso finds the best price across every venue and either hands the user a link to review and sign, or returns unsigned transactions for a wallet the agent controls. It never holds keys or funds.
license: MIT
compatibility: Needs network access to https://sayso.ninja (or the server in SAYSO_URL). scripts/sayso.mjs needs Node.js 18 or later; any HTTP client can call the same API.
metadata:
  author: sayso
  version: "1.1"
  homepage: https://sayso.ninja
  repository: https://github.com/itsmemeworks/sayso-agent-skill
---

# Sayso

Sayso turns a trade into the best route across Relay, LI.FI, deBridge, KyberSwap and Jupiter on four chains. It
charges 0.5% on every route. It never signs: the person (or a wallet you were explicitly given) signs everything.

Server: `https://sayso.ninja` by default; set `SAYSO_URL` to use another (a local copy runs on `http://localhost:4819`).
Links you hand people should use the public app. The CLI in this skill wraps every call:
`node scripts/sayso.mjs <command>` (run from this skill's folder; no packages to install).
Every endpoint, for agents calling HTTP directly: [references/api.md](references/api.md).

## Rules

- Never ask for, accept, or handle a seed phrase or private key. If the user offers one, tell them not to share it.
- Without a wallet you control, always use a **link** (below): the person reviews and signs in their own wallet.
- Before buying anything that isn't Bitcoin (cbBTC), ETH, SOL, HYPE or a stablecoin, run the **safety check** and
  tell the user the verdict in one line (liquidity, age, any red flags).
- **Picking the real coin.** Many tickers have copies and decoys. `search` already orders rows real-first (verified,
  then actually traded) and lists `warnings` per row; take the first row with no warnings, or ask the user if two
  look plausible. Never pick by market cap or liquidity alone: decoys fake both. A contract address from the user
  always wins.
- "Bitcoin" or "BTC" means **cbBTC** (search `cbBTC`); any token literally named BITCOIN is a copy. Same for tokens
  named ETH, SOL, USDC or HYPE that aren't the chain's own coin.
- Confirm the coin, amount and chain with the user before building transactions. Say the fee (0.5%) and what they
  get. Never invent prices: quote first.
- Jupiter Trigger take-profit orders are supported on Solana. Stop-loss alerts require the tab to stay open and do not sell automatically. Never describe an alert as an automatic trade.

## 1. Hand the user a link (the default)

Anything the app understands in plain words works as a link. The app opens with the trade set up, shows every
cost, and the user signs in their own wallet.

```
node scripts/sayso.mjs link "buy $20 of bitcoin"
# → $SAYSO_URL/?q=buy%20%2420%20of%20bitcoin
```

You don't need to pick the paying coin or chain for a link: the app chooses a balance that covers it and shows it
in the sentence, where the person can change it. To pin an exact coin, put its contract address in the request:
`link "buy $50 of POPCAT 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"`. Mention a paying coin only if the user did
("…with my USDC").

Phrasings that are known to work (amounts and coins can change): `node scripts/sayso.mjs queries`, or
`GET $SAYSO_URL/api/queries`. Examples: "Sell half my BONK", "Move $25 of USDC to Solana", "Ape 0.5 SOL into WIF",
"Sweep my dust into USDC", "Get me $2 of gas on Base", "Buy $20 each of BONK, WIF and BRETT", "Is WIF safe?".

## 2. Trade with a wallet you control

1. **Find the coin.** `node scripts/sayso.mjs search WIF` lists every coin with that ticker, deepest liquidity first.
2. **Check it.** `node scripts/sayso.mjs safety solana:<address>`. Treat these as red flags: not verified, under
   $100K liquidity, launched in the last day, mint or freeze authority still on, 24h volume more than 3× market cap
   (wash trading), a market cap over 1,000× its liquidity (a copy), a big pool with almost no buys (a decoy), a
   market cap over $1B within a week of launch (fake), or down 30%+ in 24h.
3. **Quote.** Amounts are integers in the token's smallest unit (SOL 9 decimals, ETH 18, USDC 6). `native` is the
   chain's gas coin.
   ```
   node scripts/sayso.mjs quote solana:native solana:<address> 100000000 --usd 9.5 --slip 50 > quote.json
   ```
   The answer has `best` (venue, `out`, `minOut` at your slippage, `outDec`, `feeUsd`, `eta`), every venue tried,
   and `validForMs` (re-quote after that). Venues that answer well after the best are reported as skipped.
   For a link you don't need to quote: the app quotes live and shows the person every cost.
4. **Build.** Within the 30-second ticket lifetime, use the exact quoted amount, slippage and top-up settings, both valid wallet addresses, and the saved review ticket:
   ```
   node scripts/sayso.mjs build solana:native solana:<address> 100000000 --venue relay --user <your address> --recipient <destination address> --quote quote.json
   ```
   EVM routes return `txs[]` (send in order; an approval comes first when needed). Solana routes return a base64
   versioned transaction. Validate the returned intent and protected minimum before signing with your own wallet. Expired or moved quotes require a new review. Never retry a submitted transaction until its status is resolved.
5. **Track** cross-chain fills: `node scripts/sayso.mjs track relay <request id>` → pending, success, partial, failure or refund. Partial delivery is not completion; inspect the received asset and balance before proceeding.

## Other things you can do

- Boards: `node scripts/sayso.mjs board trending base` (lists: trending, new, volume, all; chains: solana, base,
  robinhood, hyperevm, all).
- Balances: `node scripts/sayso.mjs holdings --sol <solana address> --evm <0x address>`.
- Everything over HTTP: [references/api.md](references/api.md), or `GET $SAYSO_URL/llms.txt` for the live version.

# Sayso HTTP API

Every call the CLI makes, for agents that call the API directly. `$SAYSO_URL` is `https://sayso.ninja` unless you set
it. The live version of this page is `GET $SAYSO_URL/llms.txt`, and `GET $SAYSO_URL/api/agent` lists every endpoint
as JSON.

Sayso finds the best price for a trade across every venue on Solana, Base, Robinhood Chain and HyperEVM, and hands back transactions for YOUR wallet to sign. It never holds keys or funds. Fee: 0.5% on every route.

Two ways in:

1. Hand a person a link. $SAYSO_URL/?q=buy%20%2420%20of%20bitcoin opens the app with that trade set up; they review and sign in their own wallet. Requests the app understands: GET $SAYSO_URL/api/queries.

2. Trade with your own wallet, step by step:
   - Find the coin: GET $SAYSO_URL/api/search?q=WIF  (pick the row with the most liquidity; small copies share names)
   - Check it: GET $SAYSO_URL/api/safety?chain=solana&addr=<addr>
   - Quote: POST $SAYSO_URL/api/agent/quote {"from":{"chain":"solana","token":"native"},"to":{"chain":"solana","token":"<addr>"},"amount":"<smallest units>","usd":20,"slippageBps":50}
   - Build: POST $SAYSO_URL/api/build with the same body plus "review" (the signed review object; expires after 30 seconds), "venue" (from the quote), "user" (your signing address) and "recipient" (where coins land; on the same chain this is usually your address)
   - Check the returned intentKey/minOut against the reviewed quote. Requote on expiry or changed price.
   - Sign and send the returned transactions yourself, in order (EVM: txs[] incl. any approval; Solana: a base64 versioned transaction)
   - A submitted transaction is pending until confirmed. Never blindly resubmit; partial delivery does not complete a plan.
   - Track cross-chain fills: GET $SAYSO_URL/api/track?type=<venue>&id=<request id>

Tokens: "native" means the chain's gas coin (SOL, ETH, HYPE). Amounts are integers in the token's smallest unit (SOL 9 decimals, ETH 18, USDC 6).
Full machine-readable list: GET $SAYSO_URL/api/agent

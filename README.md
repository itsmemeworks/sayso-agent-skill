# Sayso agent skill

Let your AI agent trade crypto through [Sayso](https://sayso.ninja): buy, sell, swap or bridge on **Solana, Base, Robinhood Chain and HyperEVM** at the best price across every venue (Relay, LI.FI, deBridge, KyberSwap, Jupiter), with a safety check on any coin before it buys.

It's an [Agent Skills](https://agentskills.io) skill: a plain folder in the open standard, so it works in any agent that supports skills.

**Non-custodial.** Sayso never holds keys or funds, and this skill never signs anything. Your agent either hands you a link that opens the trade in Sayso for you to review and sign, or, if you've given it a wallet of its own, gets unsigned transactions for that wallet to sign.

## Install

The skill is the `skills/sayso` folder, in the standard Agent Skills format. **Copy that folder into your agent's skills folder** and the agent picks it up: it works in any [client that supports Agent Skills](https://agentskills.io/clients).

```bash
git clone https://github.com/itsmemeworks/sayso-agent-skill
cp -R sayso-agent-skill/skills/sayso <your agent's skills folder>/
```

Shortcuts for some clients:

- **Claude Code**: `/plugin marketplace add itsmemeworks/sayso-agent-skill`, then `/plugin install sayso@sayso` (or copy the folder into `~/.claude/skills/`)
- **Claude.ai and the Claude apps**: zip the `skills/sayso` folder and upload it as a custom skill in Claude's settings

**No skills support?** Paste this into the agent instead:

```
Use Sayso to trade crypto for me. Read https://sayso.ninja/llms.txt first,
then send me a Sayso link to review and sign each trade.
```

## What your agent can do

Ask in plain words, for example:

- "Buy $20 of bitcoin"
- "Is WIF safe?"
- "Sell half my BONK"
- "Move $25 of USDC to Solana"
- "What's trending on Base?"
- "Get me $2 of gas on Robinhood Chain"

By default the agent sends you a link such as `https://sayso.ninja/?q=buy%20%2420%20of%20bitcoin`, which opens with the trade set up, every cost shown, and nothing sent until you sign in your own wallet.

## CLI

The skill ships a small command-line client, [`skills/sayso/scripts/sayso.mjs`](skills/sayso/scripts/sayso.mjs). It needs Node.js 18 or later and nothing else.

```bash
cd skills/sayso
node scripts/sayso.mjs link "buy $20 of bitcoin"       # a link to review and sign
node scripts/sayso.mjs search WIF                       # coins called WIF on every chain, real ones first
node scripts/sayso.mjs safety solana:<address>          # liquidity, age, holders and red flags
node scripts/sayso.mjs quote solana:native solana:<address> 100000000 > quote.json
node scripts/sayso.mjs build solana:native solana:<address> 100000000 --venue <venue> --user <your address> --quote quote.json
```

Run it with no arguments for every command. Building returns unsigned transactions within a 30-second review window; the wallet you control signs and sends them. The full HTTP API is in [`references/api.md`](skills/sayso/references/api.md).

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `SAYSO_URL` | `https://sayso.ninja` | The Sayso server to use, e.g. `http://localhost:4819` for a local copy |

## Fees

Every route carries Sayso's 0.5% fee, shown in each quote. Networks and venues charge their usual costs, also shown before anything is signed.

## What's in this repository

```
skills/sayso/
├── SKILL.md            instructions the agent loads: rules, links, trading with its own wallet
├── scripts/sayso.mjs   the CLI (no dependencies)
└── references/api.md   every HTTP endpoint, for agents calling the API directly
.claude-plugin/         optional: lets Claude Code install it with /plugin
```

## Contributing

Issues and pull requests are welcome. Keep `SKILL.md` within the [Agent Skills specification](https://agentskills.io/specification) (the `Validate` workflow checks it) and short enough for an agent to load in full.

## License

[MIT](LICENSE)

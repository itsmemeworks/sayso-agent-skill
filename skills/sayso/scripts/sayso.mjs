#!/usr/bin/env node
// Sayso from the command line, for people and AI agents. Talks to a Sayso server (SAYSO_URL, default
// https://sayso.ninja). It never signs anything: `build` prints transactions for your own wallet to sign.
// Self-contained (Node 18+, no packages), so it ships inside the Agent Skills folder as scripts/sayso.mjs.
//
//   node scripts/sayso.mjs link "buy $20 of bitcoin"              a link that opens the trade ready to review
//   node scripts/sayso.mjs search WIF                              coins called WIF on every chain, deepest first
//   node scripts/sayso.mjs safety solana <address>                 the safety card for one coin
//   node scripts/sayso.mjs board trending base                     a live board (trending | new | volume | all)
//   node scripts/sayso.mjs holdings --sol <addr> --evm <0x…>       balances on every chain
//   node scripts/sayso.mjs quote solana:native solana:<addr> 100000000 [--usd 9.5] [--slip 50]
//   node scripts/sayso.mjs build solana:native solana:<addr> 100000000 --venue relay --user <addr> --quote <saved-quote.json> [--recipient <addr>]
//   node scripts/sayso.mjs track relay <request id>
//   node scripts/sayso.mjs queries                                 every request the app understands
import { readFileSync } from 'node:fs';
// the same address checks as lib/shared.mjs, inlined so this file runs on its own
const CHAINS = ['solana', 'base', 'robinhood', 'hyperevm'];
const isEvm = v => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);
function isSolana(v) {
  if (typeof v !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n; for (const c of v) n = n * 58n + BigInt(alphabet.indexOf(c));
  let bytes = 0; while (n) { bytes++; n >>= 8n; }
  return bytes + (v.match(/^1*/)[0].length) === 32;
}
const addressOn = (chain, v) => CHAINS.includes(chain) && (chain === 'solana' ? isSolana(v) : isEvm(v));
const BASE = (process.env.SAYSO_URL || 'https://sayso.ninja').replace(/\/$/, '');
const [cmd, ...rest] = process.argv.slice(2);
const flags = {}, args = [];
for (let i = 0; i < rest.length; i++) rest[i].startsWith('--') ? (flags[rest[i].slice(2)] = rest[++i]) : args.push(rest[i]);
const get = async p => { const r = await fetch(BASE + p); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j; };
const post = async (p, b) => { const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j; };
const side = s => { const [chain, token] = String(s || '').split(':'); if (!chain || !token) throw new Error(`Use chain:token, e.g. solana:native or base:0x… (got "${s}")`); return { chain, token }; };
const route = () => ({ from: side(args[0]), to: side(args[1]), amount: String(args[2] || ''), usd: +flags.usd || undefined, slippageBps: +flags.slip || 50 });
const show = x => console.log(JSON.stringify(x, null, 2));

const run = {
  link: () => console.log(`${BASE}/?q=${encodeURIComponent(args.join(' '))}`),
  search: async () => {
    const age = r => r.created ? Math.round((Date.now() - r.created) / 864e5) : null;
    const warn = r => [!r.verified && (r.liq || 0) > 1e5 && (r.buys24 ?? 0) < 25 && 'big pool, almost no trades: likely a decoy', !r.verified && (r.mc || 0) > 1e9 && age(r) != null && age(r) < 7 && 'huge market cap for its age: likely fake', r.mc && r.liq && r.mc / r.liq > 1000 && r.liq < 1e6 && 'market cap far above liquidity: likely a copy'].filter(Boolean);
    const rows = (await get('/api/search?q=' + encodeURIComponent(args.join(' ')))).map(r => ({ sym: r.sym, chain: r.chain, addr: r.addr, verified: r.verified ? r.verified.by || true : false, price: r.price, mc: r.mc, liq: r.liq, buys24: r.buys24, ageDays: age(r), warnings: warn(r) }));
    show(rows.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.warnings.length - b.warnings.length || (b.buys24 || 0) - (a.buys24 || 0) || (b.liq || 0) - (a.liq || 0)));
  },
  safety: async () => { const [c, a] = args[1] ? args : String(args[0] || '').split(':'); show(await get(`/api/safety?chain=${encodeURIComponent(c)}&addr=${encodeURIComponent(a)}`)); },
  board: async () => { const j = await get(`/api/discover?list=${args[0] || 'trending'}&net=${args[1] || 'all'}`); show({ failed: j.failed, note: j.failed && j.failed.length ? 'these chains did not answer yet; try again in a few seconds' : undefined, rows: j.rows.slice(0, +flags.n || 10).map(r => ({ sym: r.sym, name: r.name, chain: r.chain, addr: r.addr, price: r.price, mc: r.mc, liq: r.liq, vol24: r.vol24, buys24: r.buys24, ch: r.ch, launched: r.created ? new Date(r.created).toISOString() : null })) }); },
  holdings: async () => show(await post('/api/holdings', { sol: flags.sol, evm: flags.evm })),
  quote: async () => show(await post('/api/agent/quote', route())),
  build: async () => {
    if(!flags.venue||!flags.user||!flags.quote)throw new Error('build needs --venue, --user and --quote <saved-quote.json>');
    const q=route(),recipient=flags.recipient||(addressOn(q.to.chain,flags.user)?flags.user:undefined);
    if(!recipient||!addressOn(q.to.chain,recipient))throw new Error('Pass --recipient with a valid address on the destination chain');
    const saved=JSON.parse(readFileSync(flags.quote,'utf8')),review=saved.review||saved.best?.review;
    if(!review?.ticket)throw new Error('The saved quote has no review ticket. Quote again.');
    show(await post('/api/build',{...q,venue:flags.venue,user:flags.user,recipient,review}));
  },
  track: async () => show(await get(`/api/track?type=${args[0]}&id=${encodeURIComponent(args[1])}`)),
  queries: async () => (await get('/api/queries')).queries.forEach(q => console.log(`${q.group.padEnd(9)} ${q.say}`)),
};
// the usage lines at the top of this file are the help
const usage = () => `Sayso CLI · server ${BASE}\n\n` + readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//   ')).map(l => l.slice(5)).join('\n');
if (!run[cmd]) { console.log(usage()); process.exit(cmd ? 1 : 0); }
Promise.resolve(run[cmd]()).catch(e => { console.error('sayso:', e.message); process.exit(1); });

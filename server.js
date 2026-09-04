require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const ALLOWLIST_FILE = path.join(ROOT, 'allowlist.json');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','X-Admin-Key'] }));
app.use(express.json({ limit: '100kb' }));
app.use(express.text({ type: ['text/csv','application/csv'], limit: '2mb' }));

const checkerLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { ok:false, error:'RATE_LIMITED', message:'Too many checks. Try again shortly.' } });
app.use('/api/eligibility', checkerLimiter);

function normalizeAddress(value) {
  const a = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(a) ? a.toLowerCase() : null;
}
function readAllowlist() {
  try { return JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf8')); }
  catch { return { version: 1, updatedAt: null, addresses: [] }; }
}
function writeAllowlist(addresses) {
  const data = { version: 1, updatedAt: new Date().toISOString(), addresses: [...new Set(addresses)].sort() };
  fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify(data, null, 2));
  return data;
}
function envAddresses() {
  return String(process.env.ALLOWLIST_ADDRESSES || '').split(',').map(normalizeAddress).filter(Boolean);
}
function isAdmin(req) {
  const expected = process.env.ADMIN_KEY;
  return expected && req.get('X-Admin-Key') === expected;
}

app.get('/api/health', (req,res) => res.json({ ok:true, service:'hood-cheggy-api', time:new Date().toISOString() }));

app.get('/api/stats', (req,res) => {
  const list = readAllowlist();
  res.json({ ok:true, collectionSize:1000, verifiedWlAddresses:new Set([...list.addresses, ...envAddresses()]).size, checker:'address-only', walletConnection:false, claimEnabled:false });
});

app.get('/api/collection', (req,res) => res.json({ ok:true, name:'Hood Cheggy', supply:1000, style:'Chunky Pixel', mint:'not connected to public checker', affiliation:'Independent project; not affiliated with Robinhood.' }));

app.post('/api/eligibility', async (req,res) => {
  const address = normalizeAddress(req.body?.address);
  if (!address) return res.status(400).json({ ok:false, eligible:false, error:'INVALID_ADDRESS', message:'Enter a valid EVM wallet address.' });
  const list = readAllowlist();
  const eligible = new Set([...list.addresses, ...envAddresses()]).has(address);
  // Public response intentionally reveals only eligibility, never the reason/evidence.
  res.json({ ok:true, eligible, address, checkedAt:new Date().toISOString() });
});

app.post('/api/admin/import', (req,res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  const raw = typeof req.body === 'string' ? req.body : (req.body?.csv || req.body?.addresses || '');
  const tokens = String(raw).split(/[\s,;\n\r]+/).map(normalizeAddress).filter(Boolean);
  if (!tokens.length) return res.status(400).json({ ok:false, error:'NO_VALID_ADDRESSES' });
  const current = readAllowlist().addresses || [];
  const data = writeAllowlist([...current, ...tokens]);
  res.json({ ok:true, imported:tokens.length, total:data.addresses.length, updatedAt:data.updatedAt });
});

app.get('/api/admin/export', (req,res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  const list = readAllowlist().addresses || [];
  res.type('text/plain').send(list.join('\n'));
});

// Server-side OpenSea enrichment. This is optional and never makes an address WL-eligible by itself.
app.get('/api/opensea/wallet/:address', async (req,res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ ok:false, error:'INVALID_ADDRESS' });
  if (!process.env.OPENSEA_API_KEY) return res.status(503).json({ ok:false, error:'OPENSEA_NOT_CONFIGURED' });
  try {
    const url = `https://api.opensea.io/api/v2/account/${address}/collections`;
    const r = await fetch(url, { headers:{ 'x-api-key':process.env.OPENSEA_API_KEY } });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ ok:false, error:'OPENSEA_ERROR', detail:text.slice(0,500) });
    res.type('application/json').send(text);
  } catch (e) { res.status(502).json({ ok:false, error:'OPENSEA_FETCH_FAILED' }); }
});

// Authorized Robinhood verification adapter. The public checker does NOT ask users for Robinhood credentials.
app.post('/api/robinhood/verify', async (req,res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  if (!process.env.ROBINHOOD_VERIFIER_URL) return res.status(503).json({ ok:false, error:'ROBINHOOD_VERIFIER_NOT_CONFIGURED' });
  try {
    const r = await fetch(process.env.ROBINHOOD_VERIFIER_URL, { method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${process.env.ROBINHOOD_VERIFIER_TOKEN || ''}`}, body:JSON.stringify(req.body || {}) });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch { res.status(502).json({ ok:false, error:'ROBINHOOD_VERIFIER_FAILED' }); }
});

app.use(express.static(ROOT, { index:'index.html' }));
app.get('*', (req,res) => res.sendFile(path.join(ROOT,'index.html')));

app.listen(PORT, () => console.log(`Hood Cheggy running on http://localhost:${PORT}`));

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Robinhood Chain mainnet: chainId 4663.
// For production, prefer an indexed provider (Alchemy/Blockscout) via secret env vars.
// This function intentionally returns only the eligibility decision, not private account data.
const RPC_URL = Deno.env.get("ROBINHOOD_RPC_URL") || "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_URL = Deno.env.get("BLOCKSCOUT_URL") || "https://robinhoodchain.blockscout.com/api/v2";

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:CORS});

function validAddress(a: string) { return /^0x[a-fA-F0-9]{40}$/.test(a); }

async function rpc(method:string, params:any[]) {
  const r = await fetch(RPC_URL, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "RPC error");
  return d.result;
}

async function hasConfirmedTransaction(address:string) {
  // Primary, lightweight check: outgoing transaction count.
  // nonce > 0 means at least one mined transaction has originated from this EOA.
  const countHex = await rpc("eth_getTransactionCount",[address,"latest"]);
  const count = parseInt(countHex,16);
  return {eligible: count > 0, transactionCount: count};
}

async function health() {
  const block = await rpc("eth_blockNumber",[]);
  return {ok:true, chainId:4663, latestBlock:parseInt(block,16), service:"hood-cheggy-eligibility"};
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:CORS});
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.get("mode")==="health") return json(await health());

    const body = await req.json().catch(()=>({}));
    const address = String(body.address||"").trim();
    if (!validAddress(address)) return json({eligible:false,error:"Invalid EVM address."},400);

    const result = await hasConfirmedTransaction(address);
    return json({
      eligible: result.eligible,
      rule: "At least 1 confirmed outgoing transaction on Robinhood Chain",
      chainId: 4663
    });
  } catch (e) {
    return json({error:"Verification service temporarily unavailable."},503);
  }
});

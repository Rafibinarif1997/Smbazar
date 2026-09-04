# Hood Cheggy — Same Design + Supabase Eligibility

The original website HTML/design is preserved. The only intended functional change is the eligibility backend.

Flow:
public wallet address -> Supabase Edge Function -> verified on-chain activity -> WL ELIGIBLE / NOT ELIGIBLE.

No wallet connect, no CSV, no claim, no signature, no private key.

Configure `SUPABASE_FUNCTION_URL` and `SUPABASE_ANON_KEY` in `index.html`, then deploy the included Edge Function.

Important: this verifies public on-chain activity on Robinhood Chain. It cannot prove a custodial Robinhood brokerage trade from a wallet address alone.

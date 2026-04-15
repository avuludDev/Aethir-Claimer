# AethirClaimer

A script to automate Aethir actions for a list of wallets:
- checks proxy availability and rotates IP when needed;
- collects account data;
- runs `claim` and/or `withdraw` (depending on settings);
- writes logs and per-wallet status;
- runs in a loop with pauses between iterations.

## How it works

1. Loads private keys from `wallets.txt` and proxies from `proxies.txt`.
2. Optionally prompts for a password and decrypts keys.
3. For each wallet:
   - checks gas;
   - authenticates and collects data;
   - performs `claim`, then `withdraw` (if enabled in config);
   - on errors, switches proxies up to `MAX_PROXY_RETRIES`.
4. After all wallets finish, waits `scriptSleep` hours and runs again (or exits if `scriptSleep = 0`).

## Setup

- Node.js 18+ (recommended).
- Fill in:
  - `wallets.txt` — one private key per line;
  - `proxies.txt` — one proxy per line, format `http://login:pass@ip:port` (optional).
- Adjust parameters in `const/config.const.js`.

## Run

```bash
npm start
```

The script runs via `node main.js`. On startup it may ask for a password to decrypt private keys.

## Key settings

- `CLAIM` / `WITHDRAW` — enable claim and withdraw modes.
- `MIN_CLAIM` / `MIN_WITHDRAW` — minimum amounts for operations.
- `TYPE_CLAIM`, `RANGE_PERCENT`, `CLAIM_PRIORITY` — claim logic parameters.
- `MAX_PROXY_RETRIES`, `overRunProxy`, `mixProxy` — behavior when proxies fail.
- `maxGwei`, `sleepOnHighGas` — wait for acceptable gas.
- `sleepFrom`, `sleepTo` — delay between wallets.
- `scriptSleep` — pause between full cycles (hours).

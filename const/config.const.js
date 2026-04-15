// Gas settings
export const maxGwei = 50; // Max gas price cap on Ethereum (Gwei)
export const sleepOnHighGas = 100; // Seconds to wait before re-checking Gwei
export const mixWallets = true; // true: shuffle wallets; false: keep order
// Delay settings
export const sleepFrom = 90; // Min delay (seconds)
export const sleepTo = 120; // Max delay (seconds)
// Script repeat
export const scriptSleep = 72; // Hours between full script runs; 0 = run once and exit

// Proxy
export const overRunProxy = true; // true: on IP failure try another proxy; false: skip wallet
export const mixProxy = true; // true: shuffle proxies; false: keep order

// Mobile proxy
export const proxyURL = ""; // Proxy URL: http://login:pass@ip:port

export const changeURL = ""; // URL to trigger proxy IP rotation

///////////////////////////////// C L A I M    D A T A ///////////////////////////////////////

export const CLAIM = true; // true: claim | false: dry-run / inspect only

export const WITHDRAW = true; // true: withdraw | false: dry-run / inspect only

export const RANGE_PERCENT = {
  // Claim amount as % of balance
  from: 100,
  to: 100,
};

export const TYPE_CLAIM = "2"; // 1: 30 days = 25% of range minus 5 ATH | 2: 120 days = 100% of range minus 5 ATH

export const MIN_CLAIM = 100; // Minimum claim amount (30 is the lowest possible)

export const CLAIM_PRIORITY = true; // true: if balance >= MIN_CLAIM ATH but range amount is lower, claim MIN_CLAIM ATH | false: skip if range below minimum

export const MIN_WITHDRAW = 100; // Minimum withdraw amount

export const RETRY_ATTEMPTS = 10; // Retries per wallet on errors

export const MAX_PROXY_RETRIES = 20; // Max proxy switches on failures

// Where the AI estimator lives.
//
// This is a URL, not a credential. It is safe in a public repo: the Worker at
// the other end verifies your Firebase sign-in before it will spend anything,
// so knowing the address gets a stranger a 401 and nothing else. The Anthropic
// key never leaves Cloudflare — see worker/src/index.js.
//
// Paste the URL `npx wrangler deploy` prints, with no trailing slash:
//   https://rack-ai.<your-subdomain>.workers.dev
//
// You can also set it from the phone without redeploying the app:
//   Fuel → gear → AI estimator → paste → Test. That override lives in
//   localStorage and wins over whatever is written here.
export const AI_PROXY_URL = 'https://rack-ai.lyttlebeast.workers.dev';

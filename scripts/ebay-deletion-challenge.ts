/**
 * Compute eBay deletion challengeResponse locally without printing the token.
 *
 * Usage:
 *   npx tsx scripts/ebay-deletion-challenge.ts <challenge_code>
 *
 * Requires EBAY_DELETION_VERIFICATION_TOKEN and EBAY_DELETION_ENDPOINT_URL
 * (or NEXT_PUBLIC_APP_URL) in the environment.
 */

import { buildChallengeResponse, getDeletionEndpointUrl } from "../services/ebay/account-deletion";

const challengeCode = process.argv[2];

if (!challengeCode) {
  console.error("Usage: npx tsx scripts/ebay-deletion-challenge.ts <challenge_code>");
  process.exit(1);
}

try {
  const endpoint = getDeletionEndpointUrl();
  const challengeResponse = buildChallengeResponse(challengeCode);
  console.log(
    JSON.stringify(
      {
        endpointConfigured: true,
        endpointHost: new URL(endpoint).host,
        endpointPath: new URL(endpoint).pathname,
        challengeResponse,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error(
    err instanceof Error ? err.message : "Failed to compute challengeResponse",
  );
  process.exit(1);
}

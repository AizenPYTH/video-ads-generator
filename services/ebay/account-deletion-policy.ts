/**
 * Documentation — eBay Marketplace Account Deletion data handling
 *
 * DELETED (irreversible):
 * - ebay_accounts (connection + encrypted access/refresh tokens)
 * - ebay_tokens
 * - ebay_policies (cached selling policies)
 * - ebay_locations (cached merchant locations)
 * - ebay_publication_attempts for that account
 * - user_settings default eBay policy / location IDs
 *
 * ANONYMIZED:
 * - listing_publications.ebay_account_id set to NULL (history kept)
 * - ads.metadata ebay_user_id / ebay_username / ebay_account_id removed
 * - eiasToken stored only as hash in ebay_account_deletion_notifications
 *
 * RETAINED (Smart Seller business / legal):
 * - Ads content (title, description, price, images) owned by the app user
 * - listing_publications rows (ebay_listing_id retained for dispute/audit)
 * - Subscription / Stripe / usage counters (not eBay PII)
 * - Deletion notification audit log (pseudonymized)
 *
 * Retention of the audit log: indefinite for compliance evidence unless
 * a separate retention policy is defined.
 */

export const EBAY_DELETION_DATA_POLICY = {
  deleted: [
    "ebay_accounts",
    "ebay_tokens",
    "ebay_policies",
    "ebay_locations",
    "ebay_publication_attempts",
    "user_settings.ebay_policy_defaults",
  ],
  anonymized: [
    "listing_publications.ebay_account_id",
    "ads.metadata.ebay_user_id",
    "ads.metadata.ebay_username",
  ],
  retained: [
    "ads content",
    "listing_publications history",
    "billing",
    "ebay_account_deletion_notifications audit",
  ],
} as const;

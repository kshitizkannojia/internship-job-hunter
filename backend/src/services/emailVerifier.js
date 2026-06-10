/**
 * ZeroBounce Email Verification
 *
 * Checks deliverability for cold email targets.
 * Free tier: 100 free verifications/month
 * API docs: https://www.zerobounce.net/docs/
 */

/**
 * Verify a specific email address — checks deliverability.
 * Returns { status, result, score }.
 *
 * status: "valid" | "invalid" | "catch-all" | "unknown" | "spamtrap" | "abuse" | "do_not_mail"
 */
export async function verifyEmail(email) {
  if (!email) return null;

  const zeroBounceKey = process.env.ZEROBOUNCE_API_KEY;
  if (!zeroBounceKey) {
    console.warn('ZeroBounce API key not set — skipping email verification');
    return null;
  }

  try {
    const res = await fetch(`https://api.zerobounce.net/v2/validate?api_key=${zeroBounceKey}&email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;

    const data = await res.json();
    
    // ZeroBounce status values: "valid", "invalid", "catch-all", "unknown", "spamtrap", "abuse", "do_not_mail"
    // Map to simple deliverability result ('deliverable' or 'undeliverable')
    const result = data.status === 'valid' ? 'deliverable' : 'undeliverable';
    
    return {
      status: data.status,
      result: result,
      score: data.sub_status ? 50 : 100,
    };
  } catch (err) {
    console.error(`ZeroBounce verify error for ${email}:`, err.message);
    return null;
  }
}

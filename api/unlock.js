// api/unlock.js — Verifies Stripe payment server-side, returns full decode result

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, token } = req.body;

  if (!sessionId || !token) {
    return res.status(400).json({ error: 'Missing sessionId or token' });
  }

  // Verify the Stripe session server-side
  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`
      }
    });

    if (!stripeRes.ok) {
      return res.status(402).json({ error: 'Could not verify payment' });
    }

    const session = await stripeRes.json();

    // Must be paid and completed
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    // Decode the full result from the token
    let fullResult;
    try {
      fullResult = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Return the complete unlocked result
    fullResult.paywalled = false;
    return res.status(200).json(fullResult);

  } catch (err) {
    console.error('Unlock error:', err);
    return res.status(500).json({ error: 'Server error during unlock' });
  }
}

// api/decode.js — Vercel Serverless Function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, images, relType, goalType, paid } = req.body;

  // Validate: need either text or images
  const hasText = conversation && conversation.trim().length >= 60;
  const hasImages = images && images.length > 0;
  if (!hasText && !hasImages) {
    return res.status(400).json({ error: 'No conversation data provided' });
  }

  const relLabels = {
    dating: 'dating/situationship', ex: 'ex or former partner',
    crush: 'crush (possibly one-sided)', friends: 'friendship',
    coworker: 'coworker or professional connection', longterm: 'long-term partner'
  };

  const goalLabels = {
    truth: 'they just want an honest read of where things stand',
    together: 'they want to be in a real relationship with this person',
    move_on: 'they want to move on and need clarity to do so',
    repair: 'they want to repair the connection',
    protect: 'they want to protect themselves emotionally'
  };

  const systemPrompt = `You are an expert relationship analyst with deep training in attachment theory, communication psychology, and behavioral pattern recognition. You are known for being accurate, brutally honest, and highly specific — never generic. You reference actual things from the conversation as evidence.`;

  const analysisInstructions = `
Relationship context: ${relLabels[relType] || 'dating/situationship'}
Their goal: ${goalLabels[goalType] || 'they just want an honest read'}

Analyze with clinical precision. Look for:
- Who initiates more and how that shifts over time
- Response time patterns (gaps, delayed replies, instant replies)
- Energy mirroring — does one person match the other's enthusiasm?
- Avoidant vs anxious attachment signals
- Emotional availability and depth of engagement  
- Power imbalance — who has more leverage
- Specific word choices: "haha", "lol", one-word replies, questions asked back
- Double texts, left on read, response length changes
- What's NOT said that should be said

Respond ONLY with a valid JSON object. No markdown, no preamble. Schema:

{
  "verdictCategory": "one of: Mutual Interest | Situationship | One-Sided | Fading Out | It's Complicated | Healthy | Toxic Pattern | Mixed Signals",
  "verdictColor": "hex color matching the mood (red=bad, green=good, purple=complex, orange=mixed)",
  "verdictEmoji": "single emoji",
  "verdictHeadline": "punchy 6-10 word verdict specific to THIS conversation",
  "verdictBody": "2-3 sentences of honest nuanced summary, specific to this conversation",
  "youInterest": "number 0-100",
  "themInterest": "number 0-100",
  "interestSubtext": "one sharp sentence explaining the gap or balance",
  "commStyle": "2-3 word label e.g. Emotionally Avoidant | Hot and Cold | Consistently Warm",
  "commStyleSub": "1 sentence with specific evidence from the conversation",
  "emotionalAvail": "2-3 word label e.g. Low Walls Up | Selectively Open | Genuinely Present",
  "emotionalAvailSub": "1 sentence with specific evidence",
  "powerDynamic": "e.g. You Have Less Power | Fairly Balanced | They Are Chasing You",
  "powerDynamicSub": "1 sentence with specific evidence",
  "trajectory": "e.g. Cooling Off | Slowly Building | Stagnant | Accelerating",
  "trajectorySub": "1 sentence with specific evidence",
  "flags": [{"type": "red or yellow or green", "label": "3-6 word flag"}],
  "brutalTruths": [{"emoji": "single emoji", "text": "specific evidence-based truth, use <strong> tags on key phrases"}],
  "nextMoves": [{"title": "short title", "detail": "specific actionable advice tailored to their goal and this exact situation"}]
}

Rules:
- brutalTruths: exactly 4 items
- nextMoves: exactly 3 items
- flags: 3-6 items, mix of red/yellow/green
- Reference actual things said in the conversation
- Be direct. Be a trusted friend who tells the truth.
- If it's actually healthy, say so. Don't manufacture drama.`;

  // Build message content — text or images
  let userContent;

  if (hasImages) {
    userContent = [
      {
        type: 'text',
        text: `Here are ${images.length} screenshot(s) of a conversation to analyze.\n\n${analysisInstructions}`
      },
      ...images.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType || 'image/jpeg',
          data: img.base64
        }
      }))
    ];
  } else {
    userContent = `Here is the conversation to analyze:\n\n"""\n${conversation.slice(0, 6000)}\n"""\n\n${analysisInstructions}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'AI error', detail: err });
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Gate nextMoves behind payment
    if (!paid) {
      result.nextMoves = null;
      result.paywalled = true;
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

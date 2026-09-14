const https = require('https');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function cleanJson(rawText) {
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return JSON.parse(text);
}

function callGemini(promptText, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reject(new Error('No GEMINI_API_KEY configured'));
    }

    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 600,
        responseMimeType: 'application/json'
      }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.candidates && json.candidates[0] && json.candidates[0].content) {
            const rawText = json.candidates[0].content.parts[0].text;
            const parsed = cleanJson(rawText);
            resolve(parsed);
          } else {
            reject(new Error(json.error ? json.error.message : 'Invalid Gemini response structure'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Gemini output: ' + err.message + ' Raw: ' + body.substring(0, 150)));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out'));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function generateAiRoast({ completedCount, totalBlocks, incompleteBlockNames, streakCount, personality, hour }) {
  const prompt = `
You are the "Harsh AI Coach" for an email copywriter's daily routine tracker.
The user has 6 mandatory blocks to complete every day:
1. Research 3 clients
2. Write 3 email samples
3. Editing pass
4. Send outreach (pitching)
5. Content — script + edit
6. Trade IQ (PROTECTED move)

Current user state:
- Completed blocks: ${completedCount} / ${totalBlocks}
- Unfinished blocks: ${incompleteBlockNames.join(', ') || 'None (All Complete!)'}
- Current streak: ${streakCount} days
- Personality style: "${personality}" (options: "sergeant" = loud drill sergeant, "mom" = disappointed Asian parent comparing to cousin Timmy, "wallstreet" = ruthless wolf of wall street, "ramsay" = Gordon Ramsay kitchen fury).
- Time of day: ${hour}:00

If completedCount is 0, you must be FURIOUS and LOUD. All caps shouting! Roasting their procrastination, their excuses, and warning them that their dream is dying while they scroll.
If completedCount is 6, praise their discipline with tough love and remind them tomorrow resets at zero.
If in between, yell at them to finish the remaining blocks.

Respond in valid JSON format with these exact keys:
{
  "angerLevel": 4,
  "headline": "ALL-CAPS SCREAMING TITLE",
  "roast": "Brutal 2-3 sentence roast.",
  "audioShout": "Short shout under 12 words",
  "actionPrompt": "Exact single action to do right now"
}
`;

  return await callGemini(prompt, 9000);
}

async function shredExcuseWithAi(excuse, personality) {
  const prompt = `
You are the Harsh AI Coach with personality "${personality}".
The user just submitted an excuse for why they haven't finished their daily copywriting work:
"${excuse}"

Demolish and dismantle this excuse completely with tough love, harsh humor, and unarguable logic. 

Respond in valid JSON format with these exact keys:
{
  "shredded": "2-3 brutal sentences destroying their specific excuse",
  "rageQuote": "Short all-caps savage motivational quote under 10 words"
}
`;

  return await callGemini(prompt, 9000);
}

module.exports = {
  generateAiRoast,
  shredExcuseWithAi,
  isGeminiConfigured: () => Boolean(process.env.GEMINI_API_KEY)
};

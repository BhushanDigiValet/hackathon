const apiKey = process.env.ANTHROPIC_API_KEY || require('dotenv').config().parsed.ANTHROPIC_API_KEY;
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'hello' }],
  }),
})
.then(r => r.json().then(data => ({status: r.status, data})))
.then(console.log)
.catch(console.error);

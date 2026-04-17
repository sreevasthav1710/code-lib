const PISTON_EXECUTE_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';
const PISTON_API_KEY = process.env.PISTON_API_KEY;

function toPistonPayload(body = {}) {
  return {
    language: body.language || 'c',
    version: body.version || '*',
    files: [
      {
        name: body.filename || 'main.c',
        content: body.source_code || body.code || '',
      },
    ],
    stdin: body.stdin || '',
    compile_timeout: body.compile_timeout || 10000,
    run_timeout: body.run_timeout || 3000,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = toPistonPayload(req.body);

    if (!payload.files[0].content.trim()) {
      res.status(400).json({ error: 'source_code is required' });
      return;
    }

    const upstream = await fetch(PISTON_EXECUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PISTON_API_KEY ? { Authorization: `Bearer ${PISTON_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const body = contentType.includes('application/json')
      ? await upstream.json()
      : { text: await upstream.text() };

    res.status(upstream.status).json({
      upstream: {
        provider: 'piston',
        status: upstream.status,
        contentType,
      },
      ...body,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

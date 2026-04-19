// Wandbox proxy (free, no API key required)
const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const DEFAULT_COMPILER = process.env.WANDBOX_COMPILER || 'gcc-head-c';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const code = body.source_code || body.code || '';
    if (!code.trim()) {
      res.status(400).json({ error: 'source_code is required' });
      return;
    }

    const payload = {
      compiler: body.compiler || DEFAULT_COMPILER,
      code,
      stdin: body.stdin || '',
      'compiler-option-raw': '',
      'runtime-option-raw': '',
      save: false,
    };

    const upstream = await fetch(WANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(async () => ({ text: await upstream.text() }));

    res.status(upstream.status).json({
      upstream: { provider: 'wandbox', status: upstream.status },
      compile: { output: data.compiler_message || data.compiler_error || '' },
      run: {
        stdout: data.program_output || '',
        stderr: data.program_error || '',
        output: data.program_message || '',
        code: data.status !== undefined ? Number(data.status) : null,
        signal: data.signal || null,
      },
      raw: data,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

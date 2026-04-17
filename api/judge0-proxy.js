/*
  Vercel serverless proxy for Judge0 API.

  Environment variables to set in Vercel:
  - JUDGE0_HOST (optional, default uses judge0 CE host)
  - JUDGE0_API_KEY (optional) - if your Judge0 instance requires an API key
  - JUDGE0_API_KEY_HEADER (optional) - header name to send the API key in (default: "X-RapidAPI-Key")

  This proxy forwards POST requests to create submissions and GET requests to fetch results by token.
*/

const DEFAULT_HOST = process.env.JUDGE0_HOST || 'https://judge0-ce.p.rapidapi.com';
const API_KEY = process.env.JUDGE0_API_KEY;
const API_KEY_HEADER = process.env.JUDGE0_API_KEY_HEADER || 'X-RapidAPI-Key';
const RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';

function addJudge0Headers(headers){
  if(API_KEY){
    headers[API_KEY_HEADER] = API_KEY;
    if(API_KEY_HEADER.toLowerCase() === 'x-rapidapi-key'){
      headers['X-RapidAPI-Host'] = RAPIDAPI_HOST;
    }
  }
  return headers;
}

export default async function handler(req, res){
  const host = DEFAULT_HOST;
  try{
    if(req.method === 'POST'){
      const body = req.body;
      // Request the submission with wait=true so the upstream returns the result immediately.
      const target = `${host}/submissions?base64_encoded=false&wait=true`;
      const headers = addJudge0Headers({ 'Content-Type': 'application/json' });
      const r = await fetch(target, { method: 'POST', headers, body: JSON.stringify(body) });

      const ct = (r.headers.get('content-type') || '').toLowerCase();
      // include some upstream debug info when helpful
      const upstream = { status: r.status };
      try{
        for (const [k, v] of r.headers.entries()){
          // only surface a few headers
          if(['content-type','x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-reset'].includes(k)) upstream[k]=v;
        }
      }catch(e){}

      if(ct.includes('application/json')){
        const j = await r.json();
        const fallbackError = r.ok ? undefined : `Judge0 upstream returned HTTP ${r.status}. Check that your RapidAPI key is subscribed to ${RAPIDAPI_HOST}.`;
        res.status(r.status).json({ upstream, error: fallbackError, ...j });
      } else {
        const txt = await r.text();
        const fallbackError = r.ok ? undefined : `Judge0 upstream returned HTTP ${r.status}. Check that your RapidAPI key is subscribed to ${RAPIDAPI_HOST}.`;
        res.status(r.status).json({ upstream, error: fallbackError, text: txt });
      }

      return;
    }

    if(req.method === 'GET'){
      const token = req.query.token || (req.url && req.url.split('?token=')[1]);
      if(!token){ res.status(400).json({ error: 'token required' }); return; }
      const target = `${host}/submissions/${token}?base64_encoded=false`;
      const headers = addJudge0Headers({});
      const r = await fetch(target, { method: 'GET', headers });

      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if(ct.includes('application/json')){
        const j = await r.json();
        res.status(r.status).json(j);
      } else {
        const txt = await r.text();
        res.status(r.status).json({ text: txt });
      }

      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  }catch(err){
    res.status(500).json({ error: String(err) });
  }
}

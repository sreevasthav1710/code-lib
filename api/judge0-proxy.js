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

export default async function handler(req, res){
  const host = DEFAULT_HOST;
  try{
    if(req.method === 'POST'){
      const body = req.body;
      const target = `${host}/submissions?base64_encoded=false&wait=false`;
      const headers = { 'Content-Type': 'application/json' };
      if(API_KEY) headers[API_KEY_HEADER] = API_KEY;
      const r = await fetch(target, { method: 'POST', headers, body: JSON.stringify(body) });
      const j = await r.json();
      res.status(r.status).json(j);
      return;
    }

    if(req.method === 'GET'){
      const token = req.query.token || req.url.split('?token=')[1];
      if(!token){ res.status(400).json({ error: 'token required' }); return; }
      const target = `${host}/submissions/${token}?base64_encoded=false`;
      const headers = {};
      if(API_KEY) headers[API_KEY_HEADER] = API_KEY;
      const r = await fetch(target, { method: 'GET', headers });
      const j = await r.json();
      res.status(r.status).json(j);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  }catch(err){
    res.status(500).json({ error: String(err) });
  }
}

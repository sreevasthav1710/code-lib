// Simple local proxy for Judge0 to use during development
// Usage: set env vars JUDGE0_HOST and (optionally) JUDGE0_API_KEY and JUDGE0_API_KEY_HEADER
// Then run: node local-proxy.js

const express = require('express');
const bodyParser = require('body-parser');
const fetch = global.fetch || require('node-fetch');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;
const JUDGE0_HOST = process.env.JUDGE0_HOST || 'https://judge0-ce.p.rapidapi.com';
const API_KEY = process.env.JUDGE0_API_KEY;
const API_KEY_HEADER = process.env.JUDGE0_API_KEY_HEADER || 'X-RapidAPI-Key';

app.use(function(req, res, next){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/judge0-proxy', async (req, res) => {
  try {
    const target = `${JUDGE0_HOST}/submissions?base64_encoded=false&wait=false`;
    const headers = { 'Content-Type': 'application/json' };
    if(API_KEY) headers[API_KEY_HEADER] = API_KEY;
    const r = await fetch(target, { method: 'POST', headers, body: JSON.stringify(req.body) });
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if(ct.includes('application/json')){
      const j = await r.json();
      res.status(r.status).json(j);
    } else {
      const t = await r.text();
      res.status(r.status).json({ text: t });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/judge0-proxy', async (req, res) => {
  try {
    const token = req.query.token;
    if(!token) return res.status(400).json({ error: 'token required' });
    const target = `${JUDGE0_HOST}/submissions/${token}?base64_encoded=false`;
    const headers = {};
    if(API_KEY) headers[API_KEY_HEADER] = API_KEY;
    const r = await fetch(target, { method: 'GET', headers });
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if(ct.includes('application/json')){
      const j = await r.json();
      res.status(r.status).json(j);
    } else {
      const t = await r.text();
      res.status(r.status).json({ text: t });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Local Judge0 proxy listening on http://localhost:${PORT}`));

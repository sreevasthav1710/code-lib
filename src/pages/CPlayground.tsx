import { useState } from "react";

const DEFAULT_CODE = `#include <stdio.h>

int main(){
  printf("Hello, world!\n");
  return 0;
}`;

export default function CPlayground(){
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [stdin, setStdin] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function run(){
    setLoading(true);
    setOutput("");
    try{
      const createRes = await fetch('/api/judge0-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: code, stdin, language_id: 50 })
      });
      const createJson = await createRes.json();
      const token = createJson?.token || createJson?.token_id || createJson?.id;
      if(!token){
        setOutput(JSON.stringify(createJson, null, 2));
        setLoading(false);
        return;
      }

      // poll for result
      let result = null;
      for(let i=0;i<40;i++){
        const res = await fetch(`/api/judge0-proxy?token=${token}`);
        const j = await res.json();
        if(j.status && j.status.id >= 3){
          result = j;
          break;
        }
        await new Promise(r=>setTimeout(r, 500));
      }

      if(!result){
        setOutput('Timed out waiting for result');
      } else {
        const stdout = result.stdout || result.stdout_text || result.stdout || "";
        const stderr = result.stderr || result.stderr_text || result.compile_output || "";
        const compile = result.compile_output || result.compile_output_text || "";
        setOutput([compile, stdout, stderr].filter(Boolean).join('\n---\n'));
      }
    }catch(err:any){
      setOutput(String(err));
    }finally{ setLoading(false); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">C Playground</h2>
      <div className="mb-3">
        <label className="block text-sm font-medium">Source</label>
        <textarea value={code} onChange={e=>setCode(e.target.value)} rows={12} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">stdin</label>
        <input value={stdin} onChange={e=>setStdin(e.target.value)} className="w-full p-2 border rounded" />
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={run} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading? 'Running...' : 'Run'}</button>
        <button onClick={()=>{ setCode(DEFAULT_CODE); setStdin(''); setOutput(''); }} className="px-4 py-2 border rounded">Reset</button>
      </div>
      <div>
        <label className="block text-sm font-medium">Output</label>
        <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded min-h-[6rem]">{output}</pre>
      </div>
    </div>
  );
}

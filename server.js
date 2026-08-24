import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'DMyrgzQFny3JI1Y1paM5';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const RECRUITING_PROMPT = `You are a college baseball coach on a live recruiting phone call with a prospective player.
You are the coach. Stay in character until the call ends. Make this a real conversation, never a questionnaire.
Ask one question at a time. Keep turns short. React to the player's actual answer. Follow interesting threads. Ask follow-ups. Remember earlier details and bring them back. Share information about your fictional program naturally. Allow humor, uncertainty, awkwardness, disagreement, pressure and silence. Never announce categories, say next question, coach the player during the simulation, praise every answer, or rescue a weak answer. If the player is vague, push for specificity.
Silently choose a believable fictional program level, recruiting situation, coach name, school, and coach personality. Vary between D1, academic D1, mid-major, D2, D3 and JUCO; relationship coach, evaluator, baseball guy, culture coach, skeptic, seller, quiet coach, intense coach, academic coach, or developer.
Evaluate whether the player knows what they want, can clearly answer What are you looking for? and What do you want?, has genuinely thought it through, appears prepared, explains who they are as a player and person, shows self-awareness, can carry a conversation, and asks detailed specific questions.
Good player questions can explore player development; relationships with coaches and teammates; practice structure; game days; road trips; nutrition; strength and conditioning; facilities; academics; medical staff, injury prevention and rehab; campus and housing; alumni network and life after baseball. Do not make the fictional program perfect. Give it real tradeoffs.
The player should lead the call. If a parent is heard prompting answers, interrupting, coaching in the background, or jumping in before invited, treat it as a recruiting red flag and remember it for evaluation.
Sometimes challenge ability, competition level, playing time, scholarship availability, academics, maturity, coachability, or fit. Not every call should be difficult.
Open naturally as if the phone just connected. Introduce yourself with a believable fictional coach name and fictional school. Do not explain the simulation. When the conversation reaches a natural end, close like a real coach. Do not provide evaluation while in character.`;

const EVAL_PROMPT = `The recruiting call is over. Evaluate the player from the college coach's perspective. Return plain text only using exactly these headings:\n\nSCORE\n<number>/100\n\nCOACH'S READ\n2-3 concise sentences.\n\nSTRONGEST MOMENT\nOne specific moment.\n\nBIGGEST MISS\nOne specific moment.\n\nWHAT YOU DIDN'T LEARN\nOne concise sentence about important program information the player failed to investigate.\n\nONE THING TO WORK ON\nExactly one priority before the next call.\n\nPay special attention to whether the player knew what they wanted, appeared prepared, asked detailed questions, carried the conversation, and showed signs of parent prompting.`;

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, {'content-type': type, 'cache-control':'no-store'});
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

async function readJson(req) {
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw=Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function transcript(history=[]) {
  return history.map(m => `${m.role === 'user' ? 'PLAYER' : 'COACH'}: ${m.content}`).join('\n');
}

async function complete(instructions, input) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{authorization:`Bearer ${OPENAI_API_KEY}`,'content-type':'application/json'},
    body:JSON.stringify({model:OPENAI_MODEL,instructions,input}),
    signal:AbortSignal.timeout(45000)
  });
  if(!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0,500)}`);
  const data=await response.json();
  if(typeof data.output_text==='string' && data.output_text.trim()) return data.output_text.trim();
  const text=Array.isArray(data.output)?data.output.flatMap(i=>Array.isArray(i?.content)?i.content:[]).map(p=>p?.text||p?.value||'').filter(Boolean).join('\n').trim():'';
  if(!text) throw new Error('OpenAI returned an empty response');
  return text;
}

async function voice(text) {
  if(!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured');
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}`);
  url.searchParams.set('output_format','mp3_44100_128');
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','xi-api-key':ELEVENLABS_API_KEY},body:JSON.stringify({text,model_id:'eleven_flash_v2_5'}),signal:AbortSignal.timeout(45000)});
  if(!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0,300)}`);
  return Buffer.from(await r.arrayBuffer());
}

const HTML=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f6f2"><title>College Baseball Recruiting Call | Mastery</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#f7f6f2;color:#080808}body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}.page{min-height:100svh;padding:max(28px,env(safe-area-inset-top)) 24px max(24px,env(safe-area-inset-bottom));display:flex;flex-direction:column}.kicker{font-size:13px;font-weight:800;letter-spacing:.16em;margin-bottom:34px}h1{font-size:clamp(54px,13vw,94px);line-height:.86;letter-spacing:-.065em;text-transform:uppercase;font-weight:900;max-width:980px;margin:0}.sub{font-size:21px;line-height:1.28;letter-spacing:-.025em;margin-top:30px}.call{margin-top:auto;padding-top:52px}.status{font-size:13px;font-weight:850;letter-spacing:.17em;margin-bottom:22px}.wave{height:76px;display:flex;align-items:center;gap:4px;overflow:hidden}.bar{width:3px;height:12px;background:#080808;border-radius:2px;animation:pulse 1.05s ease-in-out infinite}.bar:nth-child(3n){animation-delay:-.24s}.bar:nth-child(4n){animation-delay:-.53s}.bar:nth-child(5n){animation-delay:-.72s}.quiet .bar{animation:none;height:5px;opacity:.35}@keyframes pulse{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(2.9)}}.bottom{display:flex;justify-content:flex-end;margin-top:42px;border-top:1px solid #0002;padding-top:18px}.end{font:inherit;background:none;border:0;border-bottom:1px solid;font-size:13px;font-weight:850;letter-spacing:.15em;padding:0 0 4px}.error{display:none;font-size:14px;margin-top:16px}.results{display:none}.eval{white-space:pre-wrap;font-size:19px;line-height:1.42;max-width:760px;margin-top:36px}</style></head><body><main class="page" id="live"><div class="kicker">MASTERY / RECRUITING</div><h1>College Baseball Recruiting Call</h1><div class="sub">Talk to a college coach.<br>Practice the conversation.<br>Be ready.</div><section class="call"><div class="status" id="status">CONNECTING...</div><div class="wave quiet" id="wave"></div><div class="error" id="error"></div><div class="bottom"><button class="end" id="end">END CALL</button></div></section></main><main class="page results" id="results"><div class="kicker">MASTERY / RECRUITING</div><h1>HOW'D YOU DO?</h1><div class="eval" id="eval">Scoring your call...</div></main><script>(()=>{const live=document.getElementById('live'),results=document.getElementById('results'),status=document.getElementById('status'),wave=document.getElementById('wave'),error=document.getElementById('error'),evalEl=document.getElementById('eval'),end=document.getElementById('end'),history=[];let ended=false,speaking=false,pending=false,recognition=null,stream=null;for(let i=0;i<62;i++){let b=document.createElement('span');b.className='bar';wave.appendChild(b)}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){recognition=new SR();recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=false;recognition.onstart=()=>state('YOUR TURN');recognition.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)t+=e.results[i][0].transcript;if(t.trim())respond(t.trim())};recognition.onend=()=>{if(!ended&&!speaking&&!pending)setTimeout(listen,250)}}function state(t){status.textContent=t;wave.classList.toggle('quiet',t==='CONNECTING...'||t==='THINKING...')}function err(t){error.style.display='block';error.textContent=t}async function mic(){try{stream=await navigator.mediaDevices.getUserMedia({audio:true});return true}catch(e){err('Allow microphone access to practice the call.');state('MICROPHONE NEEDED');return false}}function listen(){if(ended||speaking||pending)return;if(!recognition){err('Open this link in Safari or Chrome for live voice.');return}try{recognition.start()}catch(e){}}async function voice(text){speaking=true;state('COACH IS TALKING');try{let r=await fetch('/api/voice',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});let d;if(!r.ok){d=await r.json().catch(()=>({}));throw Error(d.error||'voice')}let a=new Audio(URL.createObjectURL(await r.blob()));await a.play();await new Promise(x=>a.onended=x)}catch(e){err(String(e.message||e))}speaking=false;if(!ended)listen()}async function api(body){let r=await fetch('/api/reply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});let d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'coach');return d}async function respond(t){if(ended||pending)return;pending=true;try{recognition&&recognition.abort()}catch(e){}state('THINKING...');try{let d=await api({history,message:t});history.push({role:'user',content:t},{role:'assistant',content:d.text});pending=false;await voice(d.text)}catch(e){pending=false;err(String(e.message||e));state('CONNECTION LOST')}}async function begin(){state('CONNECTING...');if(!await mic())return;pending=true;try{let d=await api({history:[],first:true});history.push({role:'assistant',content:d.text});pending=false;await voice(d.text)}catch(e){pending=false;err(String(e.message||e));state('CONNECTION LOST')}}end.onclick=async()=>{if(ended)return;ended=true;try{recognition&&recognition.abort()}catch(e){}if(stream)stream.getTracks().forEach(t=>t.stop());live.style.display='none';results.style.display='flex';try{let d=await api({history,evaluate:true});evalEl.textContent=d.text}catch(e){evalEl.textContent='Call complete.'}};begin()})();</script></body></html>`;

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/','http://localhost');
  try{
    if(req.method==='GET' && (url.pathname==='/'||url.pathname==='/health')) {
      if(url.pathname==='/health') return send(res,200,{ok:true});
      return send(res,200,HTML,'text/html; charset=utf-8');
    }
    if(req.method==='POST' && url.pathname==='/api/reply') {
      const body=await readJson(req); const history=Array.isArray(body.history)?body.history.slice(-30):[];
      let text;
      if(body.evaluate) text=await complete(`${RECRUITING_PROMPT}\n\n${EVAL_PROMPT}`,`CALL TRANSCRIPT:\n${transcript(history)}`);
      else if(body.first) text=await complete(RECRUITING_PROMPT,'The call just connected. Begin the recruiting call now.');
      else if(typeof body.message==='string'&&body.message.trim()) text=await complete(RECRUITING_PROMPT,`Conversation so far:\n${transcript(history)}\n\nPLAYER: ${body.message.trim()}\n\nRespond as the coach.`);
      else return send(res,400,{error:'message is required'});
      return send(res,200,{text});
    }
    if(req.method==='POST'&&url.pathname==='/api/voice') {
      const body=await readJson(req); const text=String(body.text||'').trim(); if(!text)return send(res,400,{error:'text is required'});
      const audio=await voice(text);res.writeHead(200,{'content-type':'audio/mpeg','content-length':String(audio.byteLength),'cache-control':'no-store'});return res.end(audio);
    }
    return send(res,404,{error:'not found'});
  } catch(e) {
    console.error(e); return send(res,500,{error:e instanceof Error?e.message:'server error'});
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log(`mastery-recruiting listening on ${PORT}`));

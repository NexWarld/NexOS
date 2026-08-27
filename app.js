// ===== STATE =====
const wallpapers=[
  'linear-gradient(135deg,#0d1117 0%,#161b22 30%,#21262d 60%,#58a6ff 100%)',
  'linear-gradient(135deg,#0c0c1d 0%,#1a1035 40%,#2d1b69 70%,#6c5ce7 100%)',
  'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
  'linear-gradient(135deg,#141e30 0%,#243b55 50%,#3a6186 100%)',
  'linear-gradient(135deg,#0a192f 0%,#112240 30%,#233554 60%,#3fb950 100%)',
  'linear-gradient(135deg,#1b1b2f 0%,#162447 50%,#1f4068 100%)',
  'linear-gradient(135deg,#0d1117 0%,#6c5ce7 50%,#00cec9 100%)',
  'linear-gradient(135deg,#0d1117 0%,#3a1c71 50%,#d8457a 100%)',
];
const songs=[
  {t:'Neon Dreams',a:'Synthwave',d:214},{t:'Digital Rain',a:'Lo-Fi',d:187},{t:'Cyberpunk Nights',a:'RetroWave',d:245},{t:'Silicon Sunrise',a:'Chillhop',d:198},{t:'Quantum Drift',a:'Ambient',d:260},{t:'Binary Sunset',a:'Vaporwave',d:175},{t:'Neural Network',a:'Electronic',d:230},
];
let apps={},activeWindows={},nextZ=100,theme='dark',wallIdx=0;
let musicPlaying=false,musicCur=0,musicTimer=null,musicTime=0,musicRep=false,musicShuf=false;
let _notes=[],_events={},mem={history:[],launches:{}};
let currentDesktop=0,desktops=[{windows:[]},{windows:[]},{windows:[]},{windows:[]}];
let userName='User',userAvatar=null,setupDone=false;
let audioCtx=null,audioSource=null,customAudioFiles=[];
let snipping=false,snipStartX,snipStartY;

const cfg={
  files:{icon:'&#128193;',title:'File Explorer',w:800,h:500},
  terminal:{icon:'&#9000;',title:'Terminal',w:680,h:440},
  music:{icon:'&#127925;',title:'Music Player',w:420,h:560},
  calculator:{icon:'&#128290;',title:'Calculator',w:340,h:460},
  notes:{icon:'&#128221;',title:'Notes',w:620,h:440},
  calendar:{icon:'&#128197;',title:'Calendar',w:380,h:480},
  settings:{icon:'&#9881;',title:'Settings',w:460,h:460},
  paint:{icon:'&#127912;',title:'Paint',w:760,h:500},
  code:{icon:'&#128187;',title:'Code Editor',w:760,h:480},
  timer:{icon:'&#9202;',title:'Clock & Timer',w:360,h:380},
  workflow:{icon:'&#9889;',title:'Workflow Automation',w:520,h:440},
  agent:{icon:'&#129504;',title:'AI Agent Center',w:540,h:460},
  taskmgr:{icon:'&#128200;',title:'Task Manager',w:600,h:440},
  imageview:{icon:'&#128247;',title:'Image Viewer',w:640,h:480},
  browser:{icon:'&#127760;',title:'Web Browser',w:800,h:520},
  office:{icon:'&#128196;',title:'Office Viewer',w:700,h:500},
};

function save(){
  try{localStorage.setItem('aos_t',theme);localStorage.setItem('aos_w',wallIdx);localStorage.setItem('aos_n',JSON.stringify(_notes));localStorage.setItem('aos_e',JSON.stringify(_events));localStorage.setItem('aos_m',JSON.stringify(mem));localStorage.setItem('aos_user',userName);localStorage.setItem('aos_setup','1')}catch(e){}
}
function load(){
  try{theme=localStorage.getItem('aos_t')||'dark';wallIdx=parseInt(localStorage.getItem('aos_w'))||0;_notes=JSON.parse(localStorage.getItem('aos_n')||'[]');_events=JSON.parse(localStorage.getItem('aos_e')||'{}');mem=JSON.parse(localStorage.getItem('aos_m')||'{"history":[],"launches":{}}');userName=localStorage.getItem('aos_user')||'User';setupDone=localStorage.getItem('aos_setup')==='1'}catch(e){reset()}
  if(!_notes.length)_notes=[{id:1,title:'Welcome',content:'Welcome to AI OS!\n\nThis is your smart notebook.'}];
}
function reset(){theme='dark';wallIdx=0;_notes=[{id:1,title:'Welcome',content:'Welcome!'}];_events={};mem={history:[],launches:{}};userName='User';setupDone=false}
function applyTheme(){document.documentElement.setAttribute('data-theme',theme)}
function applyWallpaper(){document.getElementById('desktop').style.background=wallpapers[wallIdx]}
function fmt(s){const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+String(sec).padStart(2,'0')}
function notify(t,m,i,d){
  const c=document.getElementById('toasts');const el=document.createElement('div');el.className='toast';
  el.innerHTML=`<span class="toast-i">${i||'&#128276;'}</span><div class="toast-b"><div class="toast-t">${t}</div><div class="toast-m">${m}</div></div><button class="toast-x" onclick="this.parentElement.classList.add('out');setTimeout(()=>this.parentElement.remove(),250)">&times;</button>`;
  c.appendChild(el);setTimeout(()=>{if(el.parentElement){el.classList.add('out');setTimeout(()=>el.remove(),250)}},(d||4000));
  const nc=document.getElementById('nc-list');if(nc){const ni=document.createElement('div');ni.className='nc-item';ni.innerHTML=`<span>${i||'&#128276;'}</span><span><strong>${t}</strong><br>${m}</span>`;nc.insertBefore(ni,nc.firstChild)}
}

// ===== VIRTUAL DESKTOPS =====
function renderVDIndicator(){
  const el=document.getElementById('vd-indicator');
  el.innerHTML=desktops.map((_,i)=>`<div class="vd-dot ${i===currentDesktop?'active':''}" onclick="switchDesktop(${i})"></div>`).join('');
}
function switchDesktop(idx){
  currentDesktop=idx;renderVDIndicator();
  Object.entries(activeWindows).forEach(([id,win])=>{
    const onThis=desktops[currentDesktop].windows.includes(id);
    if(onThis){win.style.display='';if(win.classList.contains('minimized'))win.classList.remove('minimized')}
    else win.style.display='none';
  });
  updateTaskbar();save();
}
function assignWindowToDesktop(id){
  desktops.forEach(d=>d.windows=d.windows.filter(w=>w!==id));
  desktops[currentDesktop].windows.push(id);
}
function moveWindowToDesktop(id,target){
  desktops.forEach(d=>d.windows=d.windows.filter(w=>w!==id));
  desktops[target].windows.push(id);
  const win=activeWindows[id];if(win)win.style.display='none';
  notify('Desktop',`${cfg[id].title} moved to Desktop ${target+1}`,'&#128260;');
}

// ===== LOGIN WIZARD =====
let wizStep=1;
function nextWiz(){
  if(wizStep===1){document.getElementById('wiz-step1').style.display='none';document.getElementById('wiz-step2').style.display='';wizStep=2}
  else if(wizStep===2){userName=document.getElementById('wiz-name').value||'User';save();document.getElementById('wiz-step2').style.display='none';document.getElementById('wiz-step3').style.display='';wizStep=3}
}
function finishWiz(){setupDone=true;save();document.getElementById('wizard').classList.add('hide');setTimeout(()=>document.getElementById('wizard').style.display='none',500)}
document.getElementById('wiz-avatar-file').addEventListener('change',function(){const f=this.files[0];if(f){const r=new FileReader();r.onload=e=>{document.getElementById('wiz-avatar').innerHTML=`<img src="${e.target.result}" />`;userAvatar=e.target.result};r.readAsDataURL(f)}});

// ===== TASKBAR =====
function updateTaskbar(){
  const tc=document.getElementById('tb-center');let html='';
  Object.entries(activeWindows).forEach(([id,win])=>{
    if(!desktops[currentDesktop].windows.includes(id)&&!win.classList.contains('minimized'))return;
    const c=cfg[id];
    html+=`<button class="tb-task ${win.classList.contains('minimized')?'minimized':''} ${win.classList.contains('focused')&&desktops[currentDesktop].windows.includes(id)?'active':''}" onclick="focusApp('${id}')" oncontextmenu="showJumpList(event,'${id}')" title="${c.title}"><span>${c.icon}</span><span class="tb-preview">${c.title}</span></button>`;
  });
  tc.innerHTML=html;
}

function showJumpList(e,id){
  e.preventDefault();const jl=document.getElementById('jump-list');const rect=e.target.getBoundingClientRect();
  const items=[{label:cfg[id].title,icon:cfg[id].icon,act:()=>focusApp(id)},{label:'Close window',icon:'&#10005;',act:()=>closeApp(id)},{label:'Move to Desktop 2',icon:'&#128260;',act:()=>moveWindowToDesktop(id,1)},{label:'Move to Desktop 3',icon:'&#128260;',act:()=>moveWindowToDesktop(id,2)}];
  jl.innerHTML=`<div class="jl-title">${cfg[id].title}</div>${items.map(i=>`<div class="jl-item"><span>${i.icon}</span>${i.label}</div>`).join('')}`;
  jl.querySelectorAll('.jl-item').forEach((el,idx)=>{el.addEventListener('click',()=>{items[idx].act();jl.classList.remove('show')})});
  jl.style.left=Math.min(rect.left,window.innerWidth-200)+'px';jl.style.bottom=(window.innerHeight-rect.top+8)+'px';jl.classList.add('show');
}
document.addEventListener('click',e=>{if(!e.target.closest('#jump-list'))document.getElementById('jump-list').classList.remove('show')});

function updateClock(){
  const n=new Date();
  document.getElementById('tc-time').textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  document.getElementById('tc-date').textContent=n.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
}

let calFlyYear,calFlyMonth;
function renderCalendarFlyout(){
  const n=new Date();calFlyYear=calFlyYear||n.getFullYear();calFlyMonth=calFlyMonth!==undefined?calFlyMonth:n.getMonth();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
  document.getElementById('cf-title').textContent=months[calFlyMonth]+' '+calFlyYear;
  const fd=new Date(calFlyYear,calFlyMonth,1).getDay(),dim=new Date(calFlyYear,calFlyMonth+1,0).getDate(),pd=new Date(calFlyYear,calFlyMonth,0).getDate();
  let h=days.map(d=>`<div class="cf-day-name">${d}</div>`).join('');
  for(let i=fd-1;i>=0;i--)h+=`<div class="cf-day other">${pd-i}</div>`;
  for(let d=1;d<=dim;d++){let c=d===n.getDate()&&calFlyMonth===n.getMonth()&&calFlyYear===n.getFullYear()?' today':'';h+=`<div class="cf-day${c}">${d}</div>`}
  const rem=42-(fd+dim);for(let d=1;d<=Math.min(rem,14);d++)h+=`<div class="cf-day other">${d}</div>`;
  document.getElementById('cf-grid').innerHTML=h;
}
document.getElementById('cf-prev').addEventListener('click',()=>{calFlyMonth--;if(calFlyMonth<0){calFlyMonth=11;calFlyYear--}renderCalendarFlyout()});
document.getElementById('cf-next').addEventListener('click',()=>{calFlyMonth++;if(calFlyMonth>11){calFlyMonth=0;calFlyYear++}renderCalendarFlyout()});

function toggleStart(){document.getElementById('start').classList.toggle('show');if(document.getElementById('start').classList.contains('show'))document.getElementById('start-search').focus()}
function closeStart(){document.getElementById('start').classList.remove('show')}
function toggleAIPanel(){document.getElementById('ai-panel').classList.toggle('open');if(document.getElementById('ai-panel').classList.contains('open'))document.getElementById('ai-input').focus()}
function selectDI(el){document.querySelectorAll('.d-icon.selected').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}

function showCtx(x,y,items){
  const m=document.getElementById('ctx');m.innerHTML=items.map(i=>i.s?'<div class="ctx-s"></div>':`<div class="ctx-i"><span>${i.icon||''}</span>${i.label}${i.key?`<span class="hotkey">${i.key}</span>`:''}</div>`).join('');
  m.style.display='block';m.style.left=Math.min(x,window.innerWidth-220)+'px';m.style.top=Math.min(y,window.innerHeight-60-items.length*34)+'px';
  let idx=0;m.querySelectorAll('.ctx-i').forEach(el=>{const it=items.filter(i=>!i.s)[idx++];if(it&&it.act)el.addEventListener('click',()=>{it.act();m.style.display='none'})});
}
function hideCtx(){document.getElementById('ctx').style.display='none'}

document.addEventListener('click',e=>{
  if(!e.target.closest('#ctx'))hideCtx();
  if(!e.target.closest('#start')&&!e.target.closest('.tb-start[title="Start"]'))closeStart();
  if(!e.target.closest('#cal-flyout')&&!e.target.closest('.tb-clock'))document.getElementById('cal-flyout').classList.remove('show');
});

document.getElementById('desktop').addEventListener('contextmenu',e=>{
  e.preventDefault();
  const vdItems=desktops.map((_,i)=>({label:`Desktop ${i+1}${i===currentDesktop?' (current)':''}`,icon:'&#128260;',act:()=>switchDesktop(i)}));
  showCtx(e.clientX,e.clientY,[
    {label:'View',icon:'&#128065;',act:()=>{}},{label:'Sort by',icon:'&#128260;',act:()=>{}},{label:'Refresh',icon:'&#128260;',act:()=>{applyWallpaper()}},{s:true},
    {label:'New Folder',icon:'&#128193;',act:()=>notify('Desktop','New folder created','&#128193;')},{label:'New Text Document',icon:'&#128196;',act:()=>notify('Desktop','New file created','&#128196;')},{s:true},
    {label:'Screenshot',icon:'&#128248;',act:startSnipping},{s:true},...vdItems,{s:true},
    {label:'Display Settings',icon:'&#128421;',act:()=>openApp('settings')},{label:'Personalize',icon:'&#127912;',act:()=>{wallIdx=(wallIdx+1)%wallpapers.length;applyWallpaper();save()}},
  ]);
});

// ===== SNIPPING TOOL =====
function startSnipping(){
  snipping=true;document.getElementById('snipping-overlay').style.display='block';
}
document.getElementById('snipping-overlay').addEventListener('mousedown',e=>{
  if(!snipping)return;snipStartX=e.clientX;snipStartY=e.clientY;
  const r=document.getElementById('snipping-rect');r.style.display='block';r.style.left=snipStartX+'px';r.style.top=snipStartY+'px';r.style.width='0';r.style.height='0';
});
document.addEventListener('mousemove',e=>{
  if(!snipping||!snipStartX)return;const r=document.getElementById('snipping-rect');
  const w=e.clientX-snipStartX,h=e.clientY-snipStartY;
  r.style.left=Math.min(snipStartX,e.clientX)+'px';r.style.top=Math.min(snipStartY,e.clientY)+'px';
  r.style.width=Math.abs(w)+'px';r.style.height=Math.abs(h)+'px';
});
document.getElementById('snipping-overlay').addEventListener('mouseup',e=>{
  if(!snipping||!snipStartX)return;snipping=false;snipStartX=null;
  document.getElementById('snipping-overlay').style.display='none';document.getElementById('snipping-rect').style.display='none';
  const c=document.getElementById('desktop');const w=Math.abs(e.clientX-snipStartX||100),h=Math.abs(e.clientY-snipStartY||100);
  const sx=Math.min(snipStartX||0,e.clientX),sy=Math.min(snipStartY||0,e.clientY);
  notify('Screenshot','Screenshot captured! Open Image Viewer to see.','&#128248;');
  const snipRes=document.getElementById('snip-result'),snipImg=document.getElementById('snip-img');
  snipImg.style.width=Math.min(280,w)+'px';snipImg.style.height=Math.min(180,h)+'px';
  snipRes.style.display='';snipImg.src=`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect fill="%2358a6ff" width="${w}" height="${h}"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="14">Screenshot ${w}x${h}</text></svg>`;
  setTimeout(()=>{if(snipRes.style.display!=='none')snipRes.style.display='none'},8000);
});
function copySnip(){notify('Screenshot','Copied!','&#128203;');document.getElementById('snip-result').style.display='none'}

// Alt+Tab
let altTabIdx=0;
function showAltTab(){const g=document.getElementById('at-grid');const ids=desktops[currentDesktop].windows.filter(id=>activeWindows[id]);if(!ids.length){document.getElementById('alttab').classList.remove('show');return}
  g.innerHTML=ids.map((id,i)=>`<div class="at-item ${i===altTabIdx?'sel':''}" data-id="${id}"><span class="ai">${cfg[id].icon}</span><span class="at-name">${cfg[id].title}</span></div>`).join('');
  document.getElementById('alttab').classList.add('show');
}

document.addEventListener('keydown',e=>{
  if(e.key==='Alt'){e.preventDefault();altTabIdx=0;showAltTab()}
  if(e.key==='Tab'&&e.altKey&&document.getElementById('alttab').classList.contains('show')){e.preventDefault();const ids=desktops[currentDesktop].windows.filter(id=>activeWindows[id]);altTabIdx=(altTabIdx+1)%Math.max(1,ids.length);showAltTab()}
  if(e.key==='Escape'){document.getElementById('alttab').classList.remove('show');closeStart();hideCtx();document.getElementById('cal-flyout').classList.remove('show');document.getElementById('widgets').classList.remove('show');document.getElementById('notif-center').classList.remove('show')}
  if(e.ctrlKey&&e.key==='1'){e.preventDefault();switchDesktop(0)}if(e.ctrlKey&&e.key==='2'){e.preventDefault();switchDesktop(1)}
  if(e.ctrlKey&&e.key==='3'){e.preventDefault();switchDesktop(2)}if(e.ctrlKey&&e.key==='4'){e.preventDefault();switchDesktop(3)}
});
document.addEventListener('keyup',e=>{
  if(e.key==='Alt'&&document.getElementById('alttab').classList.contains('show')){
    document.getElementById('alttab').classList.remove('show');const sel=document.querySelector('#at-grid .at-item.sel');if(sel)focusApp(sel.dataset.id);
  }
  if(e.key==='Meta'||e.key==='OS'){e.preventDefault();document.getElementById('start').classList.toggle('show')}
  if(e.ctrlKey&&e.key==='l'){e.preventDefault();notify('Lock','Screen locked','&#128274;')}
  if(e.altKey&&e.key==='t'){e.preventDefault();openApp('terminal')}
  if(e.altKey&&e.key==='f'){e.preventDefault();openApp('files')}
  if(e.altKey&&e.key==='a'){e.preventDefault();toggleAIPanel()}
});

// ===== WINDOW MANAGER =====
function addResizeHandles(win){
  const edges=[{cls:'resize-n',cursor:'ns-resize',top:true},{cls:'resize-s',cursor:'ns-resize',bottom:true},{cls:'resize-e',cursor:'ew-resize',right:true},{cls:'resize-w',cursor:'ew-resize',left:true},{cls:'resize-ne',cursor:'nesw-resize',top:true,right:true},{cls:'resize-nw',cursor:'nwse-resize',top:true,left:true},{cls:'resize-se',cursor:'nwse-resize',bottom:true,right:true},{cls:'resize-sw',cursor:'nesw-resize',bottom:true,left:true}];
  edges.forEach(ed=>{const h=document.createElement('div');h.className=ed.cls;let rs=false,sx,sy,sw,sh,sl,st;
    h.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault();rs=true;sx=e.clientX;sy=e.clientY;sw=win.offsetWidth;sh=win.offsetHeight;sl=win.offsetLeft;st=win.offsetTop});
    h.addEventListener('touchstart',e=>{e.stopPropagation();const t=e.touches[0];rs=true;sx=t.clientX;sy=t.clientY;sw=win.offsetWidth;sh=win.offsetHeight;sl=win.offsetLeft;st=win.offsetTop});
    document.addEventListener('mousemove',e=>{if(!rs||win.classList.contains('maximized'))return;const dx=e.clientX-sx,dy=e.clientY-sy;if(ed.right)win.style.width=Math.max(300,sw+dx)+'px';if(ed.bottom)win.style.height=Math.max(200,sh+dy)+'px';if(ed.left){win.style.width=Math.max(300,sw-dx)+'px';win.style.left=(sl+dx)+'px'}if(ed.top){win.style.height=Math.max(200,sh-dy)+'px';win.style.top=(st+dy)+'px'}});
    document.addEventListener('touchmove',e=>{if(!rs||win.classList.contains('maximized'))return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(ed.right)win.style.width=Math.max(300,sw+dx)+'px';if(ed.bottom)win.style.height=Math.max(200,sh+dy)+'px';if(ed.left){win.style.width=Math.max(300,sw-dx)+'px';win.style.left=(sl+dx)+'px'}if(ed.top){win.style.height=Math.max(200,sh-dy)+'px';win.style.top=(st+dy)+'px'}});
    document.addEventListener('mouseup',()=>{rs=false});document.addEventListener('touchend',()=>{rs=false});win.appendChild(h);
  });
}

function makeDraggable(win){
  const tb=win.querySelector('.win-tb');let drag=false,ox,oy,startX,startY;
  tb.addEventListener('mousedown',e=>{if(e.target.closest('.win-btn'))return;if(win.classList.contains('maximized'))return;drag=true;const r=win.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top});
  tb.addEventListener('touchstart',e=>{if(e.target.closest('.win-btn'))return;if(win.classList.contains('maximized'))return;drag=true;const t=e.touches[0],r=win.getBoundingClientRect();ox=t.clientX-r.left;oy=t.clientY-r.top});
  document.addEventListener('mousemove',e=>{if(!drag)return;const nx=e.clientX-ox,ny=Math.max(0,e.clientY-oy);win.style.left=nx+'px';win.style.top=ny+'px';if(nx<30){document.getElementById('snap-hint').style.cssText='display:block;left:0;top:0;width:50%;height:100%'}else if(nx+win.offsetWidth>window.innerWidth-30){document.getElementById('snap-hint').style.cssText='display:block;left:50%;top:0;width:50%;height:100%'}else if(ny<20){document.getElementById('snap-hint').style.cssText='display:block;left:0;top:0;width:100%;height:100%'}else document.getElementById('snap-hint').style.display='none'});
  document.addEventListener('touchmove',e=>{if(!drag)return;const t=e.touches[0],nx=t.clientX-ox,ny=Math.max(0,t.clientY-oy);win.style.left=nx+'px';win.style.top=ny+'px'});
  document.addEventListener('mouseup',()=>{if(!drag)return;drag=false;document.getElementById('snap-hint').style.display='none';if(win.offsetLeft<30){win.style.left='0';win.style.top='0';win.style.width='50%';win.style.height='100%'}else if(win.offsetLeft+win.offsetWidth>window.innerWidth-30){win.style.left='50%';win.style.top='0';win.style.width='50%';win.style.height='100%'}else if(win.offsetTop<20){win.classList.add('maximized')}});
  document.addEventListener('touchend',()=>{drag=false;document.getElementById('snap-hint').style.display='none'});
}

function createWindow(id){
  const c=cfg[id],x=80+Object.keys(activeWindows).length*25,y=60+Object.keys(activeWindows).length*25;
  const w=document.createElement('div');w.className='window focused';w.id='win-'+id;
  w.style.left=x+'px';w.style.top=y+'px';w.style.width=c.w+'px';w.style.height=c.h+'px';w.style.zIndex=++nextZ;
  w.innerHTML=`<div class="win-tb"><span class="win-icon">${c.icon}</span><span class="win-title">${c.title}</span><div class="win-ctrl"><button class="win-btn minimize">&#x2013;</button><button class="win-btn maximize">&#9744;</button><button class="win-btn close">&#10005;</button></div></div><div class="win-body" id="body-${id}"></div>`;
  document.getElementById('windows-container').appendChild(w);
  w.addEventListener('mousedown',()=>{document.querySelectorAll('.window.focused').forEach(el=>{if(el!==w)el.classList.remove('focused')});w.classList.add('focused');w.style.zIndex=++nextZ;updateTaskbar()});
  w.querySelector('.close').addEventListener('click',()=>closeApp(id));
  w.querySelector('.minimize').addEventListener('click',()=>{w.classList.add('minimized');updateTaskbar()});
  w.querySelector('.maximize').addEventListener('click',()=>{w.classList.toggle('maximized')});
  makeDraggable(w);addResizeHandles(w);
  activeWindows[id]=w;assignWindowToDesktop(id);updateTaskbar();
  mem.launches[id]=(mem.launches[id]||0)+1;save();
  return w;
}
function closeApp(id){
  const w=activeWindows[id];if(!w)return;
  if(id==='music'&&musicTimer){clearInterval(musicTimer);musicPlaying=false}
  w.remove();delete activeWindows[id];desktops.forEach(d=>d.windows=d.windows.filter(x=>x!==id));updateTaskbar();
}
function openApp(id){
  if(activeWindows[id]){focusApp(id);return}
  const w=createWindow(id);apps[id](w.querySelector('.win-body'));
}
function focusApp(id){
  const w=activeWindows[id];if(!w)return;
  if(w.style.display==='none'){switchDesktop(desktops.findIndex(d=>d.windows.includes(id)))}
  if(w.classList.contains('minimized'))w.classList.remove('minimized');
  w.style.zIndex=++nextZ;document.querySelectorAll('.window.focused').forEach(el=>el.classList.remove('focused'));
  w.classList.add('focused');updateTaskbar();
}

// ===== AI =====
function processAI(q){
  const ql=q.toLowerCase().trim();
  const appMap={'file explorer':'files','files':'files','file manager':'files','finder':'files','terminal':'terminal','console':'terminal','cmd':'terminal','shell':'terminal','code editor':'code','code':'code','vscode':'code','editor':'code','ide':'code','paint':'paint','draw':'paint','drawing':'paint','canvas':'paint','music':'music','music player':'music','song':'music','spotify':'music','audio':'music','calculator':'calculator','calc':'calculator','notes':'notes','note':'notes','notepad':'notes','calendar':'calendar','cal':'calendar','schedule':'calendar','timer':'timer','clock':'timer','alarm':'timer','stopwatch':'timer','workflow':'workflow','automation':'workflow','automate':'workflow','routine':'workflow','agent':'agent','agents':'agent','ai agent':'agent','settings':'settings','preferences':'settings','config':'settings','task manager':'taskmgr','taskmgr':'taskmgr','process':'taskmgr','image viewer':'imageview','photos':'imageview','picture':'imageview','browser':'browser','web browser':'browser','internet':'browser','chrome':'browser','office':'office','word':'office','excel':'office','document':'office'};
  for(const[phrase,appId]of Object.entries(appMap)){if(ql.includes(phrase)){openApp(appId);return `Opening ${cfg[appId].title}.`}}
  if(/play music|start music|play song|listen to music|play some music/i.test(q)){openApp('music');return 'Music player opened.'}
  if(/stop music|pause music/i.test(q)){if(musicPlaying&&activeWindows['music']){const b=document.querySelector('#win-music #bpl');if(b)b.click();return 'Paused.'}return 'No music playing.'}
  if(/next song|skip|next track/i.test(q)){if(activeWindows['music']){musicCur=(musicCur+1)%(songs.length+customAudioFiles.length);musicTime=0;apps['music'](document.getElementById('body-music'));return 'Skipped.'}return 'Open music player first.'}
  if(/screenshot|snip|capture/i.test(q)){startSnipping();return 'Snipping tool activated. Click and drag to capture.'}
  if(/switch (to )?desktop \d|workspace \d/i.test(q)){const m=q.match(/\d/);if(m){switchDesktop(parseInt(m[0])-1);return `Switched to Desktop ${m[0]}.`}}
  if(/what time|current time|what.*the time|tell.*time/i.test(q)){const n=new Date();return `The time is ${n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}. ${n.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})}.`}
  if(/what.*date|date today|what day/i.test(q))return new Date().toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  if(/weather|temperature|forecast|how hot|how cold/i.test(q)){const t=[21,24,27,30,18,23,26][Math.floor(Math.random()*7)],c=['Sunny','Partly cloudy','Overcast','Light rain','Clear skies'][Math.floor(Math.random()*5)];return `${c}, ${t}\u00B0C. Humidity: ${50+Math.floor(Math.random()*30)}%. Wind: ${5+Math.floor(Math.random()*15)} km/h.`}
  if(/calculate|compute|solve|what is.*\d.*[+\-*\/].*\d/i.test(q)){try{const e=q.replace(/[^0-9+\-*/.()^% ]/g,'').trim();if(!e)return 'Could not find expression.';const r=eval(e);return `Result: ${e} = ${r}`}catch(e){return 'Could not compute.'}}
  if(/joke|tell me a joke|funny|make me laugh/i.test(q)){const j=['Why do programmers prefer dark mode? Because light attracts bugs!','What do you call a computer that sings? A Dell!','Why did the OS go to therapy? Too many kernel panics.'];return j[Math.floor(Math.random()*j.length)]}
  if(/quote|inspire|motivation/i.test(q)){const qq=['"The best way to predict the future is to invent it." \u2014 Alan Kay','"Simplicity is the ultimate sophistication." \u2014 Leonardo da Vinci'];return qq[Math.floor(Math.random()*qq.length)]}
  if(/create (a |new )?note|write (a |new )?note|add note/i.test(q)){openApp('notes');const m=q.match(/(?:note|about)\s+(.+)/i);const newId=Math.max(0,..._notes.map(n=>n.id))+1;_notes.push({id:newId,title:m?m[1]:'New Note',content:''});save();if(activeWindows['notes'])apps['notes'](document.getElementById('body-notes'));return m?`Note created: "${m[1]}"`:'Note created.'}
  if(/search|find|look for/i.test(q)){const m=q.match(/(?:search|find|look for)\s+(.+)/i);if(!m)return 'What to search?';const t=m[1].toLowerCase();let r=`Search: "${m[1]}"\n`;let f=false;_notes.forEach(n=>{if(n.title.toLowerCase().includes(t)||n.content.toLowerCase().includes(t)){r+=`- Note: "${n.title}"\n`;f=true}});return f?r:'No results.'}
  if(/hello|hi|hey|good morning|good afternoon|good evening/i.test(q))return `Hello ${userName}! How can I help?`
  if(/thank|thanks/i.test(q))return 'You\'re welcome!'
  if(/how are you|how.*doing/i.test(q))return 'All systems operational!'
  if(/who are you|what are you/i.test(q))return 'I\'m the AI OS assistant. I can open apps, calculate, search notes, tell jokes, capture screenshots, and more.'
  if(/what can you do|help|capabilities/i.test(q))return 'I can:\n- Open apps ("open terminal")\n- Play music\n- Manage notes\n- Calculate ("15 * 37")\n- Weather, time, date\n- Search notes\n- Take screenshots\n- Switch desktops\n- Tell jokes\n- And more!'
  if(/system info|about system|version/i.test(q))return `AI OS v4.0 | Kernel: Quantum 6.2 | Apps: 15 | Desktops: 4 | Open windows: ${Object.keys(activeWindows).length}`;
  return `I heard: "${q}". You can ask me to open apps, play music, create notes, calculate, show weather, or search. Type "help" for more.`;
}

function addAIMsg(txt,role){const c=document.getElementById('ai-chat');const d=document.createElement('div');d.className='ai-msg '+role;d.textContent=txt;c.appendChild(d);c.scrollTop=c.scrollHeight}
function showTyping(){const c=document.getElementById('ai-chat');const d=document.createElement('div');d.className='ai-msg ai';d.id='ai-typing';d.innerHTML='<div class="ai-typing"><span></span><span></span><span></span></div>';c.appendChild(d);c.scrollTop=c.scrollHeight}
function hideTyping(){const e=document.getElementById('ai-typing');if(e)e.remove()}
function sendAI(text){
  const inp=document.getElementById('ai-input');const msg=text||inp.value.trim();if(!msg)return;if(!text)inp.value='';
  addAIMsg(msg,'user');showTyping();setTimeout(()=>{hideTyping();const r=processAI(msg);addAIMsg(r,'ai');speak(r)},500+Math.random()*700);
}
document.getElementById('ai-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendAI()});

// Voice
let rec=null,listening=false;
function toggleVoice(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){notify('Voice','Not supported','&#9888;');return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!rec){rec=new SR();rec.continuous=false;rec.interimResults=false;rec.lang='en-US';rec.onresult=e=>{const t=e.results[0][0].transcript;document.getElementById('ai-input').value=t;notify('Voice','Heard: '+t,'&#127908');sendAI(t);stopVoice()};rec.onerror=e=>{stopVoice();notify('Voice','Error: '+e.error,'&#9888;')};rec.onend=()=>stopVoice()}
  if(listening)stopVoice();else startVoice();
}
function startVoice(){listening=true;rec.start();document.getElementById('ai-voice-btn').classList.add('listening')}
function stopVoice(){listening=false;try{rec.stop()}catch(e){}document.getElementById('ai-voice-btn').classList.remove('listening')}
function speak(text){if(!('speechSynthesis' in window))return;const u=new SpeechSynthesisUtterance(text.replace(/[#*_~`\u2014\u2013]/g,'').substring(0,200));speechSynthesis.speak(u)}

document.getElementById('start-search').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;const q=e.target.value.trim();if(!q)return;closeStart();
  for(const[id,c]of Object.entries(cfg)){if(id.includes(q.toLowerCase())||c.title.toLowerCase().includes(q.toLowerCase())){openApp(id);return}}
  document.getElementById('ai-input').value=q;toggleAIPanel();sendAI(q);
});

// ===== APPS =====

apps.taskmgr=function(ctr){
  let tab='processes',processData=[],historyData=[];
  function genData(){processData=[{name:'AI OS Kernel',cpu:2+Math.random()*5,mem:120+Math.random()*80,pid:1,status:'Running'},{name:'Window Manager',cpu:1+Math.random()*3,mem:40+Math.random()*30,pid:100,status:'Running'},{name:'File Explorer',cpu:0.5+Math.random()*2,mem:35+Math.random()*20,pid:200,status:'Running'},{name:'Terminal',cpu:0.2+Math.random()*1,mem:15+Math.random()*15,pid:300,status:'Running'},{name:'AI Assistant',cpu:3+Math.random()*8,mem:90+Math.random()*60,pid:400,status:'Running'},...Object.keys(activeWindows).map((id,i)=>({name:cfg[id].title,pid:500+i,cpu:Math.random()*5,mem:20+Math.random()*40,status:'Running'}))]}
  if(!historyData.length){for(let i=0;i<30;i++)historyData.push({cpu:5+Math.random()*40,mem:30+Math.random()*30,net:.5+Math.random()*2})}
  function render(){
    genData();const totalCPU=processData.reduce((s,p)=>s+p.cpu,0),totalMem=processData.reduce((s,p)=>s+p.mem,0);
    ctr.innerHTML=`<div class="tm"><div class="tm-tabs"><div class="tm-tab ${tab==='processes'?'active':''}" data-t="processes">Processes</div><div class="tm-tab ${tab==='performance'?'active':''}" data-t="performance">Performance</div></div><div class="tm-content">${tab==='processes'?`
      <table class="tm-table"><thead><tr><th>Name</th><th>PID</th><th>Status</th><th>CPU</th><th>Memory</th></tr></thead><tbody>${processData.map(p=>`<tr><td>${p.name}</td><td>${p.pid}</td><td style="color:${p.status==='Running'?'var(--accent2)':'var(--txt2)'}">${p.status}</td><td>${p.cpu.toFixed(1)}%</td><td>${p.mem.toFixed(0)} MB</td></tr>`).join('')}</tbody></table>
      <div style="padding:8px;font-size:11px;color:var(--txt2)">${processData.length} processes &middot; CPU: ${totalCPU.toFixed(1)}% &middot; Memory: ${totalMem.toFixed(0)} MB</div>`:`
      <div style="padding:8px;display:flex;flex-direction:column;gap:10px">
        <div><strong>CPU</strong> ${historyData[historyData.length-1].cpu.toFixed(1)}% <div class="tm-graph"><canvas id="cpuGraph" width="560" height="120"></canvas></div></div>
        <div><strong>Memory</strong> ${historyData[historyData.length-1].mem.toFixed(1)}% <div class="tm-graph"><canvas id="memGraph" width="560" height="120"></canvas></div></div>
        <div style="font-size:11px;color:var(--txt2)">Uptime: ${Math.floor(Math.random()*48)}h ${Math.floor(Math.random()*60)}m | Kernel: Quantum 6.2</div></div>`}</div></div>`;
    if(tab==='performance'){
      const cg=ctr.querySelector('#cpuGraph'),mg=ctr.querySelector('#memGraph');if(cg&&mg){drawGraph(cg.getContext('2d'),historyData.map(d=>d.cpu),'#58a6ff');drawGraph(mg.getContext('2d'),historyData.map(d=>d.mem),'#3fb950')}
    }
    ctr.querySelectorAll('.tm-tab').forEach(el=>el.addEventListener('click',()=>{tab=el.dataset.t;render()}));
  }
  function drawGraph(ctx,data,color){const w=ctx.canvas.width,h=ctx.canvas.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();const max=Math.max(...data,1);data.forEach((v,i)=>{const x=(i/(data.length-1))*w,y=h-(v/max)*h;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.stroke();ctx.fillStyle=color+'22';ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill()}
  render();setInterval(()=>{historyData.shift();historyData.push({cpu:5+Math.random()*40,mem:30+Math.random()*30,net:.5+Math.random()*2});if(tab==='performance')render()},2000);
};

apps.imageview=function(ctr){
  let zoom=1,imageSrc=null;
  ctr.innerHTML=`<div class="iv"><div class="iv-toolbar"><button id="iv-open">&#128194; Open</button><button id="iv-zoom-in">+</button><button id="iv-zoom-out">-</button><span style="font-size:11px;margin-left:auto;color:var(--txt2)" id="iv-zoom-label">${Math.round(zoom*100)}%</span></div><div class="iv-canvas" id="iv-canvas"><div style="color:var(--txt2);font-size:14px">Open an image file to view it here.<br><br><button onclick="document.getElementById(\'iv-file\').click()">Choose Image</button><input type="file" accept="image/*" id="iv-file" hidden /></div></div></div>`;
  function loadImg(src){imageSrc=src;const canvas=ctr.querySelector('#iv-canvas');canvas.innerHTML=`<img src="${src}" style="transform:scale(${zoom})" />`}
  ctr.querySelector('#iv-open').addEventListener('click',()=>ctr.querySelector('#iv-file').click());
  ctr.querySelector('#iv-file').addEventListener('change',function(){const f=this.files[0];if(f){const r=new FileReader();r.onload=e=>loadImg(e.target.result);r.readAsDataURL(f)}});
  ctr.querySelector('#iv-zoom-in').addEventListener('click',()=>{zoom=Math.min(5,zoom+.25);ctr.querySelector('#iv-zoom-label').textContent=Math.round(zoom*100)+'%';const img=ctr.querySelector('#iv-canvas img');if(img)img.style.transform=`scale(${zoom})`});
  ctr.querySelector('#iv-zoom-out').addEventListener('click',()=>{zoom=Math.max(.25,zoom-.25);ctr.querySelector('#iv-zoom-label').textContent=Math.round(zoom*100)+'%';const img=ctr.querySelector('#iv-canvas img');if(img)img.style.transform=`scale(${zoom})`});
  ctr.querySelector('#iv-canvas').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.25,Math.min(5,zoom+(e.deltaY<0?.1:-.1)));ctr.querySelector('#iv-zoom-label').textContent=Math.round(zoom*100)+'%';const img=ctr.querySelector('#iv-canvas img');if(img)img.style.transform=`scale(${zoom})`});
};

apps.browser=function(ctr){
  let url='https://www.google.com/webhp?igu=1';
  const bookmarks=['google.com','github.com','wikipedia.org','stackoverflow.com','news.ycombinator.com'];
  function render(){
    ctr.innerHTML=`<div class="browser"><div class="br-toolbar"><button id="br-back">&#8617;</button><button id="br-fwd">&#8618;</button><button id="br-reload">&#128260;</button><div class="br-url"><input value="${url}" id="br-url" /></div><button id="br-go" class="primary">Go</button></div><iframe class="br-frame" id="br-frame" src="${url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe><div class="br-bookmarks">${bookmarks.map(b=>`<span class="br-bm">${b}</span>`).join('')}</div></div>`;
    ctr.querySelector('#br-go').addEventListener('click',()=>go());ctr.querySelector('#br-url').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
    ctr.querySelector('#br-back').addEventListener('click',()=>{const f=ctr.querySelector('#br-frame');if(f&&f.contentWindow)f.contentWindow.history.back();else notify('Browser','Cannot navigate back','&#9888;')});
    ctr.querySelector('#br-reload').addEventListener('click',()=>render());
    ctr.querySelectorAll('.br-bm').forEach(b=>b.addEventListener('click',()=>{url='https://'+b.textContent;render()}));
    function go(){let u=ctr.querySelector('#br-url').value.trim();if(!u.startsWith('http'))u='https://'+u;url=u;render()}
  }
  render();
};

apps.office=function(ctr){
  let mode='word',docContent='# Document Title\n\nThis is a sample document. Upload a .txt or .csv file to view content.\n\n## Section 1\nContent goes here.\n\n## Section 2\nMore content.',csvData=[];
  ctr.innerHTML=`<div class="office-viewer"><div class="ov-toolbar"><button class="${mode==='word'?'primary':''}" id="ov-word">&#128196; Text</button><button class="${mode==='csv'?'primary':''}" id="ov-csv">&#128202; Spreadsheet</button><button id="ov-open" style="margin-left:auto">&#128194; Open File</button><input type="file" accept=".txt,.csv,.md,.json" id="ov-file" hidden /></div><div class="ov-content" id="ov-content">${renderDoc()}</div></div>`;
  function renderDoc(){if(mode==='word')return docContent.split('\n').map(l=>{if(l.startsWith('# '))return`<h1>${l.slice(2)}</h1>`;if(l.startsWith('## '))return`<h2>${l.slice(3)}</h2>`;if(l.startsWith('### '))return`<h3>${l.slice(4)}</h3>`;return`<p>${l||'&nbsp;'}</p>`}).join('');if(mode==='csv'){if(!csvData.length)return'<p>Upload a CSV file to view as spreadsheet.</p>';const maxCols=Math.max(...csvData.map(r=>r.length));return`<div class="ov-spread"><table>${csvData.map((r,i)=>`<tr>${i===0?r.map(c=>`<th>${c}</th>`).join(''):r.map(c=>`<td>${c}</td>`).join('')}${r.length<maxCols?Array(maxCols-r.length).fill('<td></td>').join(''):''}</tr>`).join('')}</table></div>`}}
  ctr.querySelector('#ov-word').addEventListener('click',()=>{mode='word';ctr.querySelector('#ov-content').innerHTML=renderDoc();ctr.querySelector('#ov-word').classList.add('primary');ctr.querySelector('#ov-csv').classList.remove('primary')});
  ctr.querySelector('#ov-csv').addEventListener('click',()=>{mode='csv';ctr.querySelector('#ov-content').innerHTML=renderDoc();ctr.querySelector('#ov-csv').classList.add('primary');ctr.querySelector('#ov-word').classList.remove('primary')});
  ctr.querySelector('#ov-open').addEventListener('click',()=>ctr.querySelector('#ov-file').click());
  ctr.querySelector('#ov-file').addEventListener('change',function(){const f=this.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{const t=e.target.result;if(f.name.endsWith('.csv')){csvData=t.split('\n').filter(l=>l.trim()).map(l=>l.split(',').map(c=>c.replace(/^"|"$/g,'').trim()));mode='csv'}else{docContent=t;mode='word'}ctr.querySelector('#ov-content').innerHTML=renderDoc();ctr.querySelector('#ov-word').classList.toggle('primary',mode==='word');ctr.querySelector('#ov-csv').classList.toggle('primary',mode==='csv')};r.readAsText(f)});
};

apps.files=function(ctr){
  let p='root';const fs={
    root:[{n:'Documents',t:'folder',i:'&#128193;',path:'docs'},{n:'Pictures',t:'folder',i:'&#128444;',path:'pics'},{n:'Music',t:'folder',i:'&#127925;',path:'music'},{n:'Videos',t:'folder',i:'&#127910;',path:'vids'},{n:'Projects',t:'folder',i:'&#128187;',path:'proj'},{n:'Downloads',t:'folder',i:'&#128229;',path:'dl'},{n:'Desktop',t:'folder',i:'&#128421;',path:'desk'},{n:'README.md',t:'file',i:'&#128196;'},{n:'.gitconfig',t:'file',i:'&#9881;'}],
    docs:[{n:'Project_Plan.docx',t:'file',i:'&#128196;'},{n:'Meeting_Notes.txt',t:'file',i:'&#128196;'},{n:'Budget_Q3.xlsx',t:'file',i:'&#128202;'},{n:'AI_Research.pdf',t:'file',i:'&#128214;'}],
    pics:[{n:'Screenshot_01.png',t:'file',i:'&#128247;'},{n:'Design_Mockup.png',t:'file',i:'&#127912;'},{n:'Profile_Photo.jpg',t:'file',i:'&#128247;'}],
    music:[{n:'Neon_Dreams.mp3',t:'file',i:'&#127925;'},{n:'Digital_Rain.mp3',t:'file',i:'&#127925;'}],
    vids:[{n:'Demo.mp4',t:'file',i:'&#127910;'}],proj:[{n:'ai-os',t:'folder',i:'&#128193;'},{n:'main.js',t:'file',i:'&#128187;'},{n:'package.json',t:'file',i:'&#128196;'}],dl:[],desk:[{n:'todo.txt',t:'file',i:'&#128196;'}],
  };
  let dragItem=null;
  function render(){
    const files=fs[p]||[],paths=p==='root'?[]:[p];
    ctr.innerHTML=`<div class="fe"><div class="fe-sidebar"><div class="fe-section-title">Quick access</div><div class="fe-si ${p==='root'?'active':''}" data-p="root">&#128451; This PC</div><div class="fe-si ${p==='desk'?'active':''}" data-p="desk">&#128421; Desktop</div><div class="fe-si ${p==='dl'?'active':''}" data-p="dl">&#128229; Downloads</div><div class="fe-section-title">Folders</div><div class="fe-si ${p==='docs'?'active':''}" data-p="docs">&#128196; Documents</div><div class="fe-si ${p==='pics'?'active':''}" data-p="pics">&#128444; Pictures</div><div class="fe-si ${p==='music'?'active':''}" data-p="music">&#127925; Music</div><div class="fe-si ${p==='vids'?'active':''}" data-p="vids">&#127910; Videos</div><div class="fe-si ${p==='proj'?'active':''}" data-p="proj">&#128187; Projects</div></div><div class="fe-main"><div class="fe-ribbon"><button id="feb" title="Back">&#8617;</button><button id="fer" title="Refresh">&#128260;</button><div class="fe-addr"><span class="fe-crumb" data-p="root">This PC</span>${paths.map(x=>`<span class="fe-sep">&rsaquo;</span><span class="fe-crumb" data-p="${x}">${x.charAt(0).toUpperCase()+x.slice(1)}</span>`).join('')}</div></div><div class="fe-content">${files.map((f,i)=>`<div class="fe-item" data-type="${f.t}" data-path="${f.path||''}" data-name="${f.n}" data-idx="${i}" draggable="true"><span class="fi">${f.i}</span><span class="fn">${f.n}</span></div>`).join('')}${!files.length?'<div style="padding:24px;color:var(--txt2);grid-column:1/-1;text-align:center">Empty folder</div>':''}</div></div></div>`;
    ctr.querySelector('#feb').addEventListener('click',()=>{p='root';render()});ctr.querySelector('#fer').addEventListener('click',render);
    ctr.querySelectorAll('.fe-si').forEach(el=>el.addEventListener('click',()=>{p=el.dataset.p;render()}));
    ctr.querySelectorAll('.fe-crumb').forEach(el=>el.addEventListener('click',()=>{p=el.dataset.p;render()}));
    ctr.querySelector('.fe-content').addEventListener('dblclick',e=>{const it=e.target.closest('.fe-item');if(!it)return;if(it.dataset.type==='folder'){p=it.dataset.path;render()}else{const ext=it.dataset.name.split('.').pop().toLowerCase();if(['png','jpg','jpeg','gif','svg','webp'].includes(ext))openApp('imageview');else if(['txt','md','csv','json'].includes(ext))openApp('office');else notify('File','Opening '+it.dataset.name,'&#128196;')}});
    ctr.querySelector('.fe-content').addEventListener('click',e=>{const it=e.target.closest('.fe-item');if(!it)return;ctr.querySelectorAll('.fe-item.selected').forEach(x=>x.classList.remove('selected'));it.classList.add('selected')});
    ctr.querySelectorAll('.fe-item').forEach(item=>{
      item.addEventListener('dragstart',e=>{dragItem={idx:parseInt(item.dataset.idx),name:item.dataset.name,type:item.dataset.type,from:p};item.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
      item.addEventListener('dragend',()=>{item.classList.remove('dragging')});
      item.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';item.classList.add('drag-over')});
      item.addEventListener('dragleave',()=>{item.classList.remove('drag-over')});
      item.addEventListener('drop',e=>{e.preventDefault();item.classList.remove('drag-over');if(!dragItem||dragItem.from!==p||dragItem.type!=='folder')return;const targetPath=item.dataset.path;if(!targetPath||dragItem.from===targetPath)return;const file=fs[dragItem.from].splice(dragItem.idx,1)[0];if(fs[targetPath]){fs[targetPath].push(file);notify('File',`Moved "${file.n}" to ${targetPath}`,'&#128194;');render()}});
    });
    ctr.querySelector('.fe-content').addEventListener('dragover',e=>{e.preventDefault()});
    ctr.querySelector('.fe-content').addEventListener('drop',e=>{e.preventDefault();ctr.querySelectorAll('.fe-item').forEach(x=>x.classList.remove('drag-over'))});
    ctr.querySelector('.fe-content').addEventListener('contextmenu',e=>{e.preventDefault();const it=e.target.closest('.fe-item');if(it)showCtx(e.clientX,e.clientY,[{label:'Open',icon:'&#128194;',act:()=>{if(it.dataset.type==='folder'){p=it.dataset.path;render()}}},{label:'Rename',icon:'&#9998;',act:()=>notify('File','Rename not available','&#9888;')},{label:'Delete',icon:'&#128465;',act:()=>notify('File','Delete not available','&#9888;')},{s:true},{label:'Properties',icon:'&#9881;',act:()=>notify('Properties',`Name: ${it.dataset.name}\nType: ${it.dataset.type}\nLocation: ${p}`,'&#128196;')}]);else showCtx(e.clientX,e.clientY,[{label:'New Folder',icon:'&#128193;',act:()=>{fs[p].push({n:'New Folder',t:'folder',i:'&#128193;',path:p+Math.random().toString(36).slice(2,6)});render()}},{label:'New Text File',icon:'&#128196;',act:()=>{fs[p].push({n:'New File.txt',t:'file',i:'&#128196;'});render()}},{s:true},{label:'Paste',icon:'&#128203;',act:()=>notify('Paste','Nothing to paste','&#9888;')},{s:true},{label:'Properties',icon:'&#9881;',act:()=>notify('Properties',`Location: ${p}`,'&#128196;')}])});
  }
  render();
};

apps.terminal=function(ctr){
  let hist=[],hi=-1;
  ctr.innerHTML=`<div class="term" id="to"></div><div style="display:flex;align-items:center;padding:4px 10px;background:#0d1117;border-top:1px solid var(--border)"><span style="color:#58a6ff;font-family:monospace;font-size:13px;margin-right:6px">$</span><input id="ti" autofocus style="background:transparent;border:none;color:#c9d1d9;font-family:monospace;font-size:13px;outline:none;flex:1" /></div>`;
  const out=ctr.querySelector('#to'),inp=ctr.querySelector('#ti');
  function al(cls,txt){const d=document.createElement('div');d.className='tl '+cls;d.textContent=txt;out.appendChild(d)}
  al('to','AI OS Terminal v4.0 [Quantum Kernel 6.2]');al('ts','Type "help" for commands. Tab completion and natural language supported.');
  const cmds={help:()=>'Commands: help clear date time whoami echo ls pwd neofetch calc ai history uptime open search desktop switch kill ps top cat',clear:()=>{out.innerHTML='';return''},date:()=>new Date().toDateString(),time:()=>new Date().toLocaleTimeString(),whoami:()=>userName,pwd:()=>'/home/'+userName.toLowerCase(),uptime:()=>`up ${Math.floor(Math.random()*48)}h ${Math.floor(Math.random()*60)}m`,history:()=>hist.map((c,i)=>`  ${i+1}  ${c}`).join('\n')||'(empty)',neofetch:()=>`  \u250C\u2500\u2500\u2500  OS: AI OS v4.0\n  \u2502     Kernel: Quantum 6.2\n  \u2502     User: ${userName}\n  \u2502     Shell: aish 4.0\n  \u2502     Desktops: ${desktops.length}\n  \u2514\u2500\u2500\u2500  Apps: ${Object.keys(cfg).length}`,echo:a=>a.join(' '),ls:()=>'Documents  Pictures  Music  Videos  Projects  Downloads',calc:a=>{try{return eval(a.join(' '))}catch(e){return'Error: '+e.message}},ai:a=>processAI(a.join(' ')),search:a=>{const t=a.join(' ').toLowerCase();let r='';let f=false;_notes.forEach(n=>{if(n.title.toLowerCase().includes(t)||n.content.toLowerCase().includes(t)){r+='- Note: '+n.title+'\n';f=true}});return f?r:'No results.'},open:a=>{openApp(a[0]);return'Opening '+a[0]+'...'},desktop:a=>{if(a[0]){switchDesktop(parseInt(a[0])-1);return'Switched to Desktop '+a[0]}return'Current desktop: '+(currentDesktop+1)},kill:a=>{if(a[0]){const id=a[0];closeApp(id);return'Closed: '+id}return'Usage: kill [app]'},ps:()=>Object.keys(activeWindows).map(id=>`  ${id} - ${cfg[id].title}`).join('\n')||'(no running apps)',top:()=>{openApp('taskmgr');return'Opening Task Manager...'},cat:a=>{if(a[0]){let content='';_notes.forEach(n=>{if(n.title.toLowerCase().includes(a[0].toLowerCase()))content=n.content});return content||'File not found'}return'Usage: cat [filename]'}};
  inp.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'){e.preventDefault();if(hi<hist.length-1){hi++;inp.value=hist[hist.length-1-hi]}}
    else if(e.key==='ArrowDown'){e.preventDefault();if(hi>0){hi--;inp.value=hist[hist.length-1-hi]}else{hi=-1;inp.value=''}}
    else if(e.key==='Tab'){e.preventDefault();const v=inp.value.split(/\s+/),partial=v[v.length-1].toLowerCase();const matches=Object.keys(cmds).filter(c=>c.startsWith(partial));if(matches.length===1){v[v.length-1]=matches[0];inp.value=v.join(' ')+' '}else if(matches.length>1){al('to','  '+matches.join('  '))}}
    else if(e.key==='Enter'){const cmd=inp.value.trim();inp.value='';if(!cmd)return;hist.push(cmd);hi=-1;al('','$ '+cmd);const parts=cmd.split(/\s+/),name=parts[0].toLowerCase(),args=parts.slice(1);if(cmds[name]){const r=cmds[name](args);if(r)al('to',r)}else{al('ts',processAI(cmd))}out.scrollTop=out.scrollHeight}
  });
  ctr.addEventListener('click',()=>inp.focus());
};

apps.music=function(ctr){
  function render(){const allSongs=[...songs,...customAudioFiles];const s=allSongs[musicCur]||songs[0];
    ctr.innerHTML=`<div class="player">
      <div class="player-art ${musicPlaying?'on':''}">&#127925;</div>
      <div class="player-title">${s.t||s.name||'Unknown'}</div><div class="player-artist">${s.a||'Uploaded'}</div>
      <div class="player-visualizer" id="pviz"><canvas id="pviz-canvas"></canvas></div>
      <div class="player-bar"><input type="range" min="0" max="${s.d||214}" value="${musicTime}" id="pb" /></div>
      <div class="player-time"><span id="pt">${fmt(musicTime)}</span><span>${fmt(s.d||214)}</span></div>
      <div class="player-ctrl"><button class="pbtn ${musicShuf?'on':''}" id="bsh">&#128256;</button><button class="pbtn" id="bpv">&#9198;</button><button class="pbtn play" id="bpl">${musicPlaying?'&#9208;':'&#9654;'}</button><button class="pbtn" id="bnx">&#9197;</button><button class="pbtn ${musicRep?'on':''}" id="brp">&#128257;</button></div>
      <div class="music-dropzone" id="music-drop">&#128229; Drop audio files here or click to upload<input type="file" accept="audio/*" id="music-file" hidden multiple /></div>
      <div class="player-list">${allSongs.map((x,i)=>`<div class="pli ${i===musicCur?'cur':''}" data-idx="${i}">&#9835; ${x.t||x.name||'Track '+i} <span style="margin-left:auto;font-size:10px;color:var(--txt2)">${x.a||''}</span></div>`).join('')}</div></div>`;
    function play(){if(musicPlaying)return;musicPlaying=true;ctr.querySelector('#bpl').innerHTML='&#9208;';ctr.querySelector('.player-art').classList.add('on');startVisualizer();musicTimer=setInterval(()=>{musicTime++;const all=[...songs,...customAudioFiles];if(musicTime>=all[musicCur]?.d)nxt();upd()},1000)}
    function pause(){musicPlaying=false;ctr.querySelector('#bpl').innerHTML='&#9654;';ctr.querySelector('.player-art').classList.remove('on');clearInterval(musicTimer)}
    function nxt(){const all=[...songs,...customAudioFiles];if(musicShuf)musicCur=Math.floor(Math.random()*all.length);else if(!musicRep)musicCur=(musicCur+1)%all.length;musicTime=0;render();if(musicPlaying)play()}
    function prv(){if(musicTime>3){musicTime=0;upd()}else{musicCur=(musicCur-1+([...songs,...customAudioFiles].length))%[...songs,...customAudioFiles].length;musicTime=0;render();if(musicPlaying){clearInterval(musicTimer);play()}}}
    function upd(){if(ctr.querySelector('#pt'))ctr.querySelector('#pt').textContent=fmt(musicTime);if(ctr.querySelector('#pb'))ctr.querySelector('#pb').value=musicTime}
    ctr.querySelector('#bpl').addEventListener('click',()=>musicPlaying?pause():play());ctr.querySelector('#bnx').addEventListener('click',nxt);ctr.querySelector('#bpv').addEventListener('click',prv);
    ctr.querySelector('#bsh').addEventListener('click',()=>{musicShuf=!musicShuf;musicRep=false;render()});ctr.querySelector('#brp').addEventListener('click',()=>{musicRep=!musicRep;musicShuf=false;render()});
    ctr.querySelector('#pb').addEventListener('input',e=>{musicTime=parseInt(e.target.value);upd()});
    ctr.querySelector('.player-list').addEventListener('click',e=>{const it=e.target.closest('.pli');if(!it)return;const idx=parseInt(it.dataset.idx);if(idx!==musicCur){musicCur=idx;musicTime=0;render();if(musicPlaying){clearInterval(musicTimer);play()}}});
    const drop=ctr.querySelector('#music-drop'),fileInp=ctr.querySelector('#music-file');
    drop.addEventListener('click',()=>fileInp.click());
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');handleFiles(e.dataTransfer.files)});
    fileInp.addEventListener('change',function(){handleFiles(this.files)});
    function handleFiles(files){Array.from(files).forEach(f=>{if(f.type.startsWith('audio/')){const url=URL.createObjectURL(f);customAudioFiles.push({t:f.name.replace(/\.[^.]+$/,''),a:'Uploaded',d:200,url,file:f});notify('Music','Added: '+f.name,'&#127925;')}});render()}
    upd();
  }
  render();
};
function startVisualizer(){
  const canvas=document.querySelector('#pviz-canvas');if(!canvas)return;const ctx=canvas.getContext('2d');const w=canvas.parentElement.offsetWidth||300;const h=60;canvas.width=w;canvas.height=h;
  function draw(){ctx.clearRect(0,0,w,h);ctx.fillStyle='#58a6ff22';for(let i=0;i<32;i++){const bh=10+Math.sin(Date.now()/200+i)*(musicPlaying?20:3);ctx.fillRect(i*(w/32),h-bh,w/32-2,bh)}if(musicPlaying)requestAnimationFrame(draw)}
  draw();
}

apps.calculator=function(ctr){
  let disp='0',first=null,op=null,wait=false,hist='';
  const btns=[['C','fn'],['\u00B1','fn'],['%','fn'],['\u00F7','op'],['7',''],['8',''],['9',''],['\u00D7','op'],['4',''],['5',''],['6',''],['\u2212','op'],['1',''],['2',''],['3',''],['+','op'],['0',''],['.',''],['\u232B','fn'],['=','eq']];
  ctr.innerHTML=`<div class="calc"><div class="calc-hist"></div><div class="calc-display">0</div><div class="calc-grid">${btns.map(([l,c])=>`<button class="calc-btn ${c}">${l}</button>`).join('')}</div></div>`;
  const d=ctr.querySelector('.calc-display'),h=ctr.querySelector('.calc-hist');
  function upd(){d.textContent=disp}function dig(v){if(wait){disp=v;wait=false}else{disp=disp==='0'?v:disp+v}upd()}
  function dec(){if(wait){disp='0.';wait=false}else if(!disp.includes('.'))disp+='.';upd()}
  function cl(a,b,o){switch(o){case'+':return a+b;case'\u2212':return a-b;case'\u00D7':return a*b;case'\u00F7':return b===0?0:a/b}return b}
  function hdl(o){const v=parseFloat(disp);if(first===null)first=v;else if(op){const r=cl(first,v,op);disp=String(r);first=r;h.textContent=first+' '+o}op=o;wait=true;upd()}
  ctr.querySelectorAll('.calc-btn').forEach(b=>b.addEventListener('click',()=>{const v=b.textContent;if(/\d/.test(v))dig(v);else if(v==='.')dec();else if(v==='C'){disp='0';first=null;op=null;wait=false;h.textContent='';upd()}else if(v==='\u00B1'){disp=String(-parseFloat(disp));upd()}else if(v==='%'){disp=String(parseFloat(disp)/100);upd()}else if(v==='\u232B'){disp=disp.length>1?disp.slice(0,-1):'0';upd()}else if(v==='='){if(op&&first!==null){const r=cl(first,parseFloat(disp),op);h.textContent=first+' '+op+' '+disp+' =';disp=String(r);first=null;op=null;wait=false;upd()}}else hdl(v)}));
};

apps.notes=function(ctr){let notes=JSON.parse(JSON.stringify(_notes)),cid=notes.length?notes[0].id:null;
  function render(){const n=notes.find(x=>x.id===cid);
    ctr.innerHTML=`<div class="notes"><div class="notes-list"><button class="note-new-btn primary" id="nn">+ New Note</button>${notes.map(x=>`<div class="note-item ${x.id===cid?'active':''}" data-id="${x.id}">${x.title||'Untitled'}</div>`).join('')}</div><div class="note-editor"><div class="note-tb"><button id="nd" class="danger">Delete</button><button id="ne">Export</button></div><input placeholder="Title" id="nt" value="${n?n.title:''}" /><textarea placeholder="Write your note..." id="nc">${n?n.content:''}</textarea></div></div>`;
    ctr.querySelector('#nn').addEventListener('click',()=>{saveCur();const i=Math.max(0,...notes.map(x=>x.id))+1;notes.push({id:i,title:'',content:''});cid=i;render()});
    ctr.querySelector('#nd').addEventListener('click',()=>{if(notes.length<=1)return;notes=notes.filter(x=>x.id!==cid);cid=notes[0]?.id||null;saveAll();render()});
    ctr.querySelector('#ne').addEventListener('click',()=>{saveCur();const n=notes.find(x=>x.id===cid);if(n){const b=new Blob([n.content],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=(n.title||'note')+'.txt';a.click();URL.revokeObjectURL(u);notify('Notes','Exported!','&#128229;')}});
    ctr.querySelector('#nt').addEventListener('input',saveCur);ctr.querySelector('#nc').addEventListener('input',saveCur);ctr.querySelector('.notes-list').addEventListener('click',e=>{const it=e.target.closest('.note-item');if(!it)return;saveCur();cid=parseInt(it.dataset.id);render()});
  }
  function saveCur(){const t=ctr.querySelector('#nt'),c=ctr.querySelector('#nc');if(!t||!c)return;const n=notes.find(x=>x.id===cid);if(n){n.title=t.value;n.content=c.value}saveAll()}
  function saveAll(){_notes=JSON.parse(JSON.stringify(notes));save()}render();
};

apps.calendar=function(ctr){
  const now=new Date();let y=now.getFullYear(),m=now.getMonth(),sel=now.getDate();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'],days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function gk(y,m,d){return y+'-'+m+'-'+d}function ev(y,m,d){return(_events[gk(y,m,d)]||[]).length>0}function sve(){localStorage.setItem('aos_e',JSON.stringify(_events));save()}
  function render(){const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),pd=new Date(y,m,0).getDate();let c='';for(let i=fd-1;i>=0;i--)c+=`<div class="cal-day other">${pd-i}</div>`;for(let d=1;d<=dim;d++){let cls='cal-day';if(d===now.getDate()&&m===now.getMonth()&&y===now.getFullYear())cls+=' today';if(d===sel)cls+=' sel';if(ev(y,m+1,d))cls+=' ev';c+=`<div class="cal-day ${cls}" data-day="${d}">${d}</div>`}const rem=42-(fd+dim);for(let d=1;d<=Math.min(rem,14);d++)c+=`<div class="cal-day other">${d}</div>`;const key=gk(y,m+1,sel),dev=_events[key]||[];
    ctr.innerHTML=`<div class="calendar"><div class="cal-h"><button id="cp">&lsaquo;</button><h3>${months[m]} ${y}</h3><button id="cn">&rsaquo;</button></div><div class="cal-grid">${days.map(d=>`<div class="cal-dn">${d}</div>`).join('')}${c}</div><div class="cal-ev"><strong style="font-size:12px">${months[m]} ${sel}, ${y}</strong>${dev.map((e,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:var(--surface2);border-radius:var(--radius-sm);margin:3px 0;font-size:12px"><span>${e}</span><button style="font-size:10px;padding:1px 5px" data-rm="${i}">&times;</button></div>`).join('')}<div style="display:flex;gap:4px;margin-top:6px"><input placeholder="Add event..." id="ei" style="flex:1" /><button id="ae">+</button></div></div></div>`;
    ctr.querySelector('#cp').addEventListener('click',()=>{m--;if(m<0){m=11;y--}render()});ctr.querySelector('#cn').addEventListener('click',()=>{m++;if(m>11){m=0;y++}render()});
    ctr.querySelectorAll('.cal-day:not(.other)').forEach(el=>el.addEventListener('click',()=>{sel=parseInt(el.dataset.day);render()}));
    ctr.querySelector('#ae').addEventListener('click',()=>{const v=ctr.querySelector('#ei').value.trim();if(!v)return;const k=gk(y,m+1,sel);if(!_events[k])_events[k]=[];_events[k].push(v);sve();render()});
    ctr.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{const i=parseInt(b.dataset.rm);const k=gk(y,m+1,sel);_events[k].splice(i,1);if(!_events[k].length)delete _events[k];sve();render()}));
    ctr.querySelector('#ei').addEventListener('keydown',e=>{if(e.key==='Enter')ctr.querySelector('#ae').click()});
  }render();
};

apps.settings=function(ctr){
  ctr.innerHTML=`<div class="settings"><div class="sets"><h4>Profile</h4><div style="display:flex;align-items:center;gap:10px"><div class="wiz-avatar" style="display:inline-flex;margin:0">${userAvatar?`<img src="${userAvatar}" />`:'&#128100;'}</div><div><strong>${userName}</strong><br><span style="font-size:11px;color:var(--txt2)">AI OS User</span></div></div></div><div class="sets"><h4>Appearance</h4><div class="set-row"><span>Dark Mode</span><div class="toggle ${theme==='dark'?'on':''}" id="ts"></div></div></div><div class="sets"><h4>Virtual Desktops</h4><div style="font-size:12px;color:var(--txt2);line-height:2">Active desktops: 4<br>Current: Desktop ${currentDesktop+1}<br>Switch: Ctrl+1 through Ctrl+4</div></div><div class="sets"><h4>Wallpaper</h4><div class="wall-grid">${wallpapers.map((w,i)=>`<div class="wall-item ${i===wallIdx?'active':''}" data-idx="${i}" style="background:${w}"></div>`).join('')}</div></div><div class="sets"><h4>System</h4><div style="font-size:12px;color:var(--txt2);line-height:2">OS: AI OS v4.0<br>Kernel: Quantum 6.2<br>Apps: ${Object.keys(cfg).length}<br>Resolution: ${window.innerWidth}x${window.innerHeight}<br>Theme: ${theme}</div></div><div class="sets"><h4>Data</h4><button class="danger" onclick="notify('Reset','Clearing all data...','&#9888;');localStorage.clear();location.reload()">Reset All Data</button></div></div>`;
  ctr.querySelector('#ts').addEventListener('click',function(){theme=theme==='dark'?'light':'dark';applyTheme();save();this.classList.toggle('on',theme==='dark')});
  ctr.querySelector('.wall-grid').addEventListener('click',e=>{const it=e.target.closest('.wall-item');if(!it)return;wallIdx=parseInt(it.dataset.idx);applyWallpaper();save();ctr.querySelectorAll('.wall-item').forEach(x=>x.classList.remove('active'));it.classList.add('active')});
};

apps.paint=function(ctr){let tool='brush',color='#58a6ff',size=3,drawing=false,saved;
  ctr.innerHTML=`<div class="paint"><div class="paint-tb"><button class="on" data-t="brush">&#128396; Brush</button><button data-t="eraser">&#129094; Eraser</button><button data-t="line">&#8213; Line</button><button data-t="rect">&#9634; Rect</button><button data-t="fill">&#128313; Fill</button><input type="color" id="pc" value="${color}" /><span style="font-size:10px;margin:0 2px">Size</span><input type="range" min="1" max="20" value="${size}" id="ps" /><button id="pcl" class="danger">Clear</button></div><div class="paint-canvas"><canvas id="pcanvas"></canvas></div></div>`;
  const wrap=ctr.querySelector('.paint-canvas'),canvas=ctr.querySelector('#pcanvas'),ctx=canvas.getContext('2d');let sx,sy;
  function resize(){const r=wrap.getBoundingClientRect();const data=ctx.getImageData(0,0,canvas.width,canvas.height);canvas.width=r.width;canvas.height=r.height;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);if(data&&data.width)ctx.putImageData(data,0,0)}resize();new ResizeObserver(resize).observe(wrap);
  function startDraw(x,y){drawing=true;sx=x;sy=y;if(tool==='fill'){ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,canvas.height);drawing=false;return}if(tool==='rect'||tool==='line')saved=ctx.getImageData(0,0,canvas.width,canvas.height);else{ctx.beginPath();ctx.moveTo(sx,sy)}}
  function moveDraw(x,y){if(!drawing)return;if(tool==='rect'||tool==='line'){ctx.putImageData(saved,0,0);ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.beginPath();if(tool==='rect')ctx.rect(sx,sy,x-sx,y-sy);else{ctx.moveTo(sx,sy);ctx.lineTo(x,y)}ctx.stroke()}else{ctx.strokeStyle=tool==='eraser'?'#fff':color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineTo(x,y);ctx.stroke()}}
  canvas.addEventListener('mousedown',e=>{const r=canvas.getBoundingClientRect();startDraw(e.clientX-r.left,e.clientY-r.top)});
  canvas.addEventListener('touchstart',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),t=e.touches[0];startDraw(t.clientX-r.left,t.clientY-r.top)});
  canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();moveDraw(e.clientX-r.left,e.clientY-r.top)});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),t=e.touches[0];moveDraw(t.clientX-r.left,t.clientY-r.top)});
  document.addEventListener('mouseup',()=>{drawing=false});document.addEventListener('touchend',()=>{drawing=false});
  ctr.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{ctr.querySelectorAll('[data-t]').forEach(x=>x.classList.remove('on'));b.classList.add('on');tool=b.dataset.t}));
  ctr.querySelector('#pc').addEventListener('input',e=>{color=e.target.value});ctr.querySelector('#ps').addEventListener('input',e=>{size=parseInt(e.target.value)});
  ctr.querySelector('#pcl').addEventListener('click',()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)});
};

apps.code=function(ctr){let files=[{name:'index.html',lang:'HTML',content:'<!DOCTYPE html>\n<html><head><title>Demo</title></head><body>\n  <h1>Hello AI OS!</h1>\n  <p>Edit and run this HTML.</p>\n  <script>console.log("Hello World")<\/script>\n</body></html>'},{name:'app.js',lang:'JavaScript',content:'function fib(n){\n  if(n<=1)return n;\n  return fib(n-1)+fib(n-2);\n}\nconsole.log("Fibonacci(10):",fib(10));\nconst arr=[5,2,9,1,7];\nconsole.log("Sorted:",arr.sort((a,b)=>a-b));\n'},{name:'style.css',lang:'CSS',content:'body{font-family:system-ui;background:#f0f0f0;display:flex;justify-content:center;align-items:center;min-height:100vh}\n.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.1)}\n'},{name:'data.json',lang:'JSON',content:'{"name":"AI OS","version":"4.0","features":["Virtual Desktops","Task Manager","Browser","Office Viewer","Image Viewer"]}'}];let cf=0;
  function render(){const f=files[cf];ctr.innerHTML=`<div class="code"><div class="code-nav"><button class="primary" id="cnew" style="margin:6px">+ New File</button>${files.map((x,i)=>`<div class="cf-item ${i===cf?'active':''}" data-idx="${i}">&#128196; ${x.name}</div>`).join('')}</div><div class="code-main"><div class="code-tb"><span style="font-weight:600">${f.name}</span><span class="lang-tag">${f.lang}</span><button id="crun" class="primary">&#9654; Run</button><button id="chint">&#129504; Hint</button></div><div class="code-editor"><textarea id="ced" spellcheck="false">${f.content}</textarea></div><div class="code-out" id="cout">Output...</div></div></div>`;
    const ed=ctr.querySelector('#ced');ed.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=e.target.selectionStart,end=e.target.selectionEnd;e.target.value=e.target.value.substring(0,s)+'  '+e.target.value.substring(end);e.target.selectionStart=e.target.selectionEnd=s+2}});ed.addEventListener('input',()=>{files[cf].content=ed.value});
    ctr.querySelector('#crun').addEventListener('click',()=>{const code=ed.value,out=ctr.querySelector('#cout');if(f.lang==='JavaScript'){out.textContent='';const orig=console.log;console.log=(...args)=>{out.textContent+=args.join(' ')+'\n'};try{eval(code)}catch(e){out.textContent+='Error: '+e.message+'\n'}console.log=orig}else if(f.lang==='HTML'){const b=new Blob([code],{type:'text/html'});window.open(URL.createObjectURL(b),'_blank');out.textContent='HTML opened in new tab.'}else if(f.lang==='JSON'){try{out.textContent=JSON.stringify(JSON.parse(code),null,2)}catch(e){out.textContent='Invalid JSON: '+e.message}}else if(f.lang==='CSS')out.textContent='CSS valid (no check in demo).'});
    ctr.querySelector('#chint').addEventListener('click',()=>{const code=ed.value;let hint='Review for best practices.';if(code.includes('function'))hint='Check edge cases and param validation.';else if(code.includes('console.log'))hint='Add descriptive log messages.';else if(code.includes('sort'))hint='Use compare function for numeric sort.';notify('AI Hint',hint,'&#129504;')});
    ctr.querySelectorAll('.cf-item').forEach(el=>el.addEventListener('click',()=>{files[cf].content=ed.value;cf=parseInt(el.dataset.idx);render()}));
    ctr.querySelector('#cnew').addEventListener('click',()=>{files[cf].content=ed.value;files.push({name:'untitled'+Math.floor(Math.random()*100)+'.js',lang:'JavaScript',content:'// New file'});cf=files.length-1;render()});
  }render();
};

apps.timer=function(ctr){let mode='clock',tSec=0,tRun=false,tInt=null,swTime=0,swRun=false,swInt=null;
  function render(){let dsp=mode==='clock'?new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):mode==='timer'?fmt(tSec):fmt(swTime);
    ctr.innerHTML=`<div class="timer"><div class="timer-label">${mode==='clock'?'Clock':mode==='timer'?'Timer':'Stopwatch'}</div><div class="timer-disp">${dsp}</div><div style="display:flex;gap:6px"><button ${mode==='clock'?'class=primary':''} id="tmc">&#128338;</button><button ${mode==='timer'?'class=primary':''} id="tmt">&#9202;</button><button ${mode==='stopwatch'?'class=primary':''} id="tms">&#9200;</button></div>
      ${mode==='timer'?`<div class="timer-presets">${[60,300,600,900,1800,3600].map(s=>`<button data-s="${s}">${s<3600?Math.floor(s/60)+'m':Math.floor(s/3600)+'h'}</button>`).join('')}</div><div style="display:flex;gap:6px"><button class="primary" id="tstr">${tRun?'Pause':'Start'}</button><button id="trst">Reset</button></div>`:''}
      ${mode==='stopwatch'?`<div style="display:flex;gap:6px"><button class="primary" id="sws">${swRun?'Pause':'Start'}</button><button id="swr">Reset</button><button id="swl">Lap</button></div><div id="swlaps" style="font-size:11px;color:var(--txt2);max-height:80px;overflow-y:auto;text-align:center"></div>`:''}
      ${mode==='clock'?`<div style="font-size:12px;color:var(--txt2)">${new Date().toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>`:''}</div>`;
    ctr.querySelector('#tmc').addEventListener('click',()=>{clearInterval(tInt);clearInterval(swInt);tRun=false;swRun=false;mode='clock';render()});
    ctr.querySelector('#tmt').addEventListener('click',()=>{clearInterval(swInt);swRun=false;mode='timer';render()});
    ctr.querySelector('#tms').addEventListener('click',()=>{clearInterval(tInt);tRun=false;mode='stopwatch';render()});
    if(mode==='timer'){ctr.querySelector('#tstr').addEventListener('click',()=>{if(tRun){clearInterval(tInt);tRun=false;render()}else if(tSec>0){tRun=true;render();tInt=setInterval(()=>{tSec--;const el=ctr.querySelector('.timer-disp');if(el)el.textContent=fmt(tSec);if(tSec<=0){clearInterval(tInt);tRun=false;notify('Timer','Done!','&#9202');render()}},1000)}});ctr.querySelector('#trst').addEventListener('click',()=>{clearInterval(tInt);tRun=false;tSec=0;render()});ctr.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',()=>{tSec=parseInt(b.dataset.s);const el=ctr.querySelector('.timer-disp');if(el)el.textContent=fmt(tSec)}));}
    if(mode==='stopwatch'){let laps=[];ctr.querySelector('#sws').addEventListener('click',()=>{if(swRun){clearInterval(swInt);swRun=false;render()}else{swRun=true;render();swInt=setInterval(()=>{swTime++;const el=ctr.querySelector('.timer-disp');if(el)el.textContent=fmt(swTime)},1000)}});ctr.querySelector('#swr').addEventListener('click',()=>{clearInterval(swInt);swRun=false;swTime=0;laps=[];render()});ctr.querySelector('#swl').addEventListener('click',()=>{laps.push(swTime);const el=ctr.querySelector('#swlaps');if(el)el.innerHTML=laps.map((t,i)=>`Lap ${i+1}: ${fmt(t)}`).join('<br>')});}
  }render();if(mode==='clock')setInterval(()=>{if(mode==='clock'){const el=ctr.querySelector('.timer-disp');if(el)el.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}},1000);
};

apps.workflow=function(ctr){let wf=JSON.parse(localStorage.getItem('aos_wf')||'[{"name":"Morning Routine","steps":["Open File Explorer","Show weather","Play music"],"enabled":true}]');function sv(){localStorage.setItem('aos_wf',JSON.stringify(wf))}
  function runWf(w){if(!w||!w.enabled)return;notify('Workflow','Running: '+w.name,'&#9889;');w.steps.forEach((s,i)=>{setTimeout(()=>{const sl=s.toLowerCase();if(sl.includes('file'))openApp('files');else if(sl.includes('weather'))notify('Weather','24C, Partly Cloudy','&#9729;');else if(sl.includes('music')||sl.includes('play'))openApp('music');else if(sl.includes('terminal'))openApp('terminal');else if(sl.includes('code'))openApp('code');else if(sl.includes('note'))openApp('notes');else if(sl.includes('calendar'))openApp('calendar');else if(sl.includes('calc'))openApp('calculator');notify('Step',s,'&#9989;',2000)},i*700)})}
  function render(){ctr.innerHTML=`<div class="wf"><h4 style="font-size:15px">Workflow Automation</h4>${wf.map((w,i)=>`<div class="wf-card"><h4>${w.name} ${w.enabled?'&#128994;':''}</h4><ol class="wf-steps">${w.steps.map(s=>`<li>${s}</li>`).join('')}</ol><div class="wf-btns"><button class="primary" data-run="${i}">&#9654; Run</button><button data-tog="${i}">${w.enabled?'Disable':'Enable'}</button><button class="danger" data-del="${i}">Delete</button></div></div>`).join('')}<div style="display:flex;gap:4px;margin-top:8px"><input placeholder="Workflow name..." id="wn" /><button id="wa" class="primary">+ Add</button></div>${wf.length?`<div style="padding:8px;background:var(--surface2);border-radius:var(--radius-sm);font-size:11px;color:var(--txt2);margin-top:6px">Tip: Steps like "Open File Explorer", "Show weather", "Play music"</div>`:''}</div>`;ctr.querySelector('#wa').addEventListener('click',()=>{const n=ctr.querySelector('#wn').value.trim();if(!n)return;wf.push({name:n,steps:[],enabled:true});sv();render()});ctr.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>runWf(wf[parseInt(b.dataset.run)])));ctr.querySelectorAll('[data-tog]').forEach(b=>b.addEventListener('click',()=>{const i=parseInt(b.dataset.tog);wf[i].enabled=!wf[i].enabled;sv();render()}));ctr.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{const i=parseInt(b.dataset.del);wf.splice(i,1);sv();render()}));}render();
};

apps.agent=function(ctr){let agents=[{name:'Coding Agent',status:'idle',tasks:['Monitor code quality','Suggest optimizations','Auto-complete code']},{name:'Research Agent',status:'idle',tasks:['Search for information','Summarize findings','Collect references']},{name:'Writing Agent',status:'idle',tasks:['Draft documents','Proofread text','Generate reports']},{name:'Security Agent',status:'active',tasks:['Monitor system integrity','Scan for threats','Log events']},{name:'Design Agent',status:'idle',tasks:['Suggest UI improvements','Generate color palettes','Analyze layouts']}];
  function render(){ctr.innerHTML=`<div class="agent"><h4 style="font-size:15px">AI Agent Center</h4><div class="agent-list">${agents.map((a,i)=>`<div class="agent-card"><div class="agent-dot ${a.status}"></div><div class="agent-info"><strong>${a.name}</strong><span>${a.tasks.join(' | ')}</span></div><div class="agent-actions"><button ${a.status==='active'?'class=danger':''} data-act="${i}">${a.status==='active'?'Stop':'Start'}</button></div></div>`).join('')}</div><button class="primary" id="arun" style="margin-top:4px">&#9654; Run All Active Agents</button><div id="alog" style="background:var(--bg);border-radius:var(--radius-sm);padding:8px;margin-top:6px;font-family:monospace;font-size:11px;max-height:120px;overflow-y:auto;color:var(--txt2)"></div></div>`;
    function log(m){const l=ctr.querySelector('#alog');const d=document.createElement('div');d.textContent=`[${new Date().toLocaleTimeString()}] ${m}`;l.appendChild(d);l.scrollTop=l.scrollHeight}
    log('Agent Center ready.');ctr.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{const i=parseInt(b.dataset.act);agents[i].status=agents[i].status==='active'?'idle':'active';log(`${agents[i].name}: ${agents[i].status}`);render()}));
    ctr.querySelector('#arun').addEventListener('click',()=>{log('Starting pipeline...');agents.forEach(a=>{if(a.status==='active'){log(`${a.name}: Executing...`);setTimeout(()=>log(`${a.name}: Done.`),1500+Math.random()*2000)}});notify('Agents','Pipeline started','&#129504;')});
  }render();
};

// ===== SYSTEM MONITOR WIDGET =====
function updateWidgets(){
  const cpu=20+Math.floor(Math.random()*40),mem=40+Math.floor(Math.random()*30),disk=25+Math.floor(Math.random()*25);
  const ec=document.getElementById('wg-cpu'),eb=document.getElementById('wg-cpu-bar'),em=document.getElementById('wg-mem'),emb=document.getElementById('wg-mem-bar'),ed=document.getElementById('wg-disk'),edb=document.getElementById('wg-disk-bar'),en=document.getElementById('wg-net');
  if(ec)ec.textContent=cpu+'%';if(eb)eb.style.width=cpu+'%';if(em)em.textContent=mem+'%';if(emb)emb.style.width=mem+'%';if(ed)ed.textContent=disk+'%';if(edb)edb.style.width=disk+'%';if(en)en.textContent=(.5+Math.random()*3).toFixed(1)+' Mbps';
  const temps=[22,24,27,30,19,23,26],conds=['Sunny','Partly Cloudy','Overcast','Clear','Light Rain'],t=temps[Math.floor(Math.random()*temps.length)],c=conds[Math.floor(Math.random()*conds.length)];
  const et=document.getElementById('wg-temp'),ecnd=document.getElementById('wg-cond');if(et)et.innerHTML=t+'&deg;C';if(ecnd)ecnd.textContent=c;
  // AI Dashboard updates
  const aiDash=document.getElementById('ai-dash-content');if(aiDash){
    const tips=['Try "Open terminal" in AI chat','Use Ctrl+1-4 to switch desktops','Right-click desktop for screenshot','Drag files between folders','Upload audio to Music Player'];
    aiDash.innerHTML=tips[Math.floor(Math.random()*tips.length)];
  }
}

// ===== INIT =====
load();applyTheme();applyWallpaper();renderVDIndicator();updateClock();setInterval(updateClock,10000);setInterval(updateWidgets,3000);

// AI Dashboard in widgets
const aiDashCard=document.createElement('div');aiDashCard.className='wg-card';aiDashCard.innerHTML='<h4>&#129504; AI Tips</h4><div class="ai-dash" id="ai-dash-content">Loading tips...</div>';document.getElementById('widgets').appendChild(aiDashCard);

// Show wizard if first time
if(!setupDone)document.getElementById('wizard').style.display='';
else document.getElementById('wizard').style.display='none';

function boot(){
  if(!setupDone)return; // Wait for setup
  const fill=document.getElementById('boot-fill');let p=0;
  const i=setInterval(()=>{p+=Math.random()*10+4;if(p>=100){p=100;clearInterval(i);setTimeout(()=>{document.getElementById('boot').classList.add('hide');setTimeout(()=>document.getElementById('boot').style.display='none',600);updateWidgets();notify('NexOS v4','Welcome, '+userName+'! 15 apps, 4 desktops, AI assistant ready.','&#9670;',6000);setTimeout(()=>notify('New','Task Manager, Browser, Office Viewer, Image Viewer, Snipping Tool added!','&#127881;',5000),3000)},400)}fill.style.width=p+'%'},60);
}
if(setupDone)boot();
else{notify('NexOS','Welcome! Please complete the setup to get started.','&#128640;');document.getElementById('boot').style.display='none'}


/* ===========================
        Footer
=========================== */

// Automatic Copyright Year

const year = document.getElementById("year");

if(year){

    year.textContent = new Date().getFullYear();

}
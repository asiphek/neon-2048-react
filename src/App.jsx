
import { useEffect, useState, useCallback, useRef } from 'react'
// FIX: can't click same button twice - no disabled buttons, no blocking flags, functional setState, overlays fully unmount
const SIZE=4
const COLORS={2:['#00f0ff','#0077ff'],4:['#22d3ee','#3b82f6'],8:['#a855f7','#7c3aed'],16:['#ec4899','#db2777'],32:['#f43f5e','#fb7185'],64:['#f97316','#fb923c'],128:['#eab308','#facc15'],256:['#84cc16','#22c55e'],512:['#10b981','#14b8a6'],1024:['#06b6d4','#22d3ee'],2048:['#ffd166','#ff2d95'],4096:['#fff','#ffd166'],8192:['#fff','#00f0ff']}
let nextId=1
function makeTile(value,row,col,isNew=false){return{id:nextId++,value,row,col,isNew,merged:false}}
function emptyCells(tiles){const taken=new Set(tiles.map(t=>t.row*10+t.col));const out=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!taken.has(r*10+c))out.push([r,c]);return out}
function addRandom(tiles){const e=emptyCells(tiles);if(!e.length)return tiles;const [r,c]=e[Math.floor(Math.random()*e.length)];return[...tiles,makeTile(Math.random()<0.9?2:4,r,c,true)]}
function startTiles(){return addRandom(addRandom([]))}
function moveTiles(tiles,dir){
  const lines=[]
  for(let i=0;i<4;i++){
    let line=[]
    if(dir==='left') line=tiles.filter(t=>t.row===i).sort((a,b)=>a.col-b.col)
    if(dir==='right') line=tiles.filter(t=>t.row===i).sort((a,b)=>b.col-a.col)
    if(dir==='up') line=tiles.filter(t=>t.col===i).sort((a,b)=>a.row-b.row)
    if(dir==='down') line=tiles.filter(t=>t.col===i).sort((a,b)=>b.row-a.row)
    lines.push({index:i,line})
  }
  let gained=0,moved=false;const result=[]
  lines.forEach(({index,line})=>{
    const merged=[]
    for(let i=0;i<line.length;i++){const cur={...line[i],isNew:false,merged:false};if(i+1<line.length&&line[i].value===line[i+1].value){cur.value*=2;cur.merged=true;gained+=cur.value;i++}merged.push(cur)}
    merged.forEach((t,pos)=>{let nr,nc;if(dir==='left'){nr=index;nc=pos}if(dir==='right'){nr=index;nc=3-pos}if(dir==='up'){nr=pos;nc=index}if(dir==='down'){nr=3-pos;nc=index}if(t.row!==nr||t.col!==nc)moved=true;result.push({...t,row:nr,col:nc})})
  })
  return{gained,moved,tiles:result}
}
function canMove(tiles){if(tiles.length<16)return true;const at=(r,c)=>tiles.find(t=>t.row===r&&t.col===c);for(let r=0;r<4;r++)for(let c=0;c<4;c++){const t=at(r,c);if(!t)continue;if(c+1<4&&at(r,c+1)?.value===t.value)return true;if(r+1<4&&at(r+1,c)?.value===t.value)return true}return false}
function loadHistory(){
  try{const raw=localStorage.getItem('neon2048-history');if(raw){const h=JSON.parse(raw);if(Array.isArray(h)&&h.length)return h}const oldBest=Number(localStorage.getItem('neon2048-best')||0);if(oldBest>0){const m=[{score:oldBest,bestTile:512,moves:0,date:new Date().toLocaleDateString(),result:'Previous Best',time:Date.now()}];localStorage.setItem('neon2048-history',JSON.stringify(m));localStorage.removeItem('neon2048-best');return m}}catch{}return []
}
export default function App(){
  const [screen,setScreen]=useState('home')
  const [tiles,setTiles]=useState(()=>startTiles())
  const [score,setScore]=useState(0)
  const [moves,setMoves]=useState(0)
  const [history,setHistory]=useState(()=>loadHistory())
  const [over,setOver]=useState(false)
  const [won,setWon]=useState(false)
  const [keepPlaying,setKeepPlaying]=useState(false)
  const [showScores,setShowScores]=useState(false)
  const [undoStack,setUndoStack]=useState([])
  const [shake,setShake]=useState(0)
  const [clickCount,setClickCount]=useState(0)
  // Refs so repeated clicks always see LATEST state (fixes stale closure double-click bug)
  const tilesRef=useRef(tiles); tilesRef.current=tiles
  const scoreRef=useRef(score); scoreRef.current=score
  const movesRef=useRef(moves); movesRef.current=moves
  const overRef=useRef(over); overRef.current=over
  const wonRef=useRef(won); wonRef.current=won
  const keepRef=useRef(keepPlaying); keepRef.current=keepPlaying
  const savedForGameRef=useRef(false)
  const best=history.length?Math.max(...history.map(h=>h.score)):0
  const avg=history.length?Math.round(history.reduce((s,h)=>s+h.score,0)/history.length):0
  const wins=history.filter(h=>h.result==='Won').length

  const saveGame=(result)=>{
    // No blocking flag across games: only prevents duplicate save for THIS game instance, reset on newGame/startGame
    if(scoreRef.current<=0||savedForGameRef.current) return
    savedForGameRef.current=true
    const entry={score:scoreRef.current,moves:movesRef.current,bestTile:tilesRef.current.length?Math.max(...tilesRef.current.map(t=>t.value)):0,date:new Date().toLocaleString(),result,time:Date.now()+Math.random()}
    setHistory(h=>{const nh=[entry,...h];localStorage.setItem('neon2048-history',JSON.stringify(nh));return nh})
  }
  const doMove=(dir)=>{
    setClickCount(c=>c+1) // proves click registered every time
    if(overRef.current||(wonRef.current&&!keepRef.current)) return
    const prev=tilesRef.current
    const {gained,moved,tiles:nt}=moveTiles(prev,dir)
    if(!moved){ setShake(Date.now()); return } // no-op but click still registered + shake feedback
    setScore(s=>s+gained); setMoves(m=>m+1)
    setUndoStack(u=>[...u.slice(-20),{tiles:prev,score:scoreRef.current,moves:movesRef.current}])
    const withNew=addRandom(nt)
    setTiles(withNew)
    if(withNew.some(t=>t.value===2048)&&!keepRef.current){ setWon(true); }
    if(!canMove(withNew)){ setOver(true); }
  }
  useEffect(()=>{ if(over) saveGame('Game Over') },[over])
  useEffect(()=>{ if(won&&!keepPlaying) saveGame('Won') },[won])
  useEffect(()=>{
    const h=(e)=>{ if(screen!=='game')return; const m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}; const d=m[e.key]; if(d){e.preventDefault();doMove(d)} }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  },[screen])
  const newGame=()=>{ if(scoreRef.current>0&&!overRef.current&&!wonRef.current) saveGame('Quit'); savedForGameRef.current=false; setTiles(startTiles()); setScore(0); setMoves(0); setUndoStack([]); setOver(false); setWon(false); setKeepPlaying(false) }
  const startGame=()=>{ savedForGameRef.current=false; setTiles(startTiles()); setScore(0); setMoves(0); setUndoStack([]); setOver(false); setWon(false); setKeepPlaying(false); setScreen('game') }
  const goHome=()=>{ if(scoreRef.current>0&&!overRef.current&&!wonRef.current) saveGame('Quit'); setScreen('home') }
  const undo=()=>{ setUndoStack(u=>{ if(!u.length) return u; const last=u[u.length-1]; setTiles(last.tiles); setScore(last.score); setMoves(last.moves); setOver(false); setWon(false); savedForGameRef.current=false; return u.slice(0,-1) }) }
  const clearHistory=()=>{ if(!confirm('Clear all score history? This also resets Best to 0.'))return; setHistory([]); localStorage.setItem('neon2048-history','[]') }
  const [touch,setTouch]=useState(null)
  const sortedHistory=[...history].sort((a,b)=>b.score-a.score)

  if(screen==='home') return (
    <div className="app">
      <h1>2048 NEON</h1><p className="subtitle">Join the numbers. Reach <b>2048</b> ✨</p>
      <div className="home-preview">{[2,4,8,16,32,64,128,256,512,1024,2048,4096].map((v,i)=>{const c=COLORS[v]||COLORS[2048];return <div key={v} style={{background:`linear-gradient(135deg,${c[0]},${c[1]})`,boxShadow:`0 0 14px ${c[1]}`,animationDelay:`${i*0.15}s`}}>{v}</div>})}</div>
      <button className="play-btn" onClick={()=>{setClickCount(c=>c+1);startGame()}}>▶ PRESS PLAY</button>
      <div className="stats"><div className="stat"><small>Best</small><b>{best}</b></div><div className="stat"><small>Games</small><b>{history.length}</b></div><div className="stat"><small>Wins</small><b>{wins}</b></div><div className="stat"><small>Average</small><b>{avg}</b></div></div>
      <div style={{display:'flex',gap:8,justifyContent:'center'}}><button className="secondary" onClick={()=>setShowScores(true)}>📊 Scores · History</button></div>
      <p className="how"><b>How to play:</b> Use arrow keys, WASD, swipe, or on-screen arrows.<br/>Same numbers merge! If tiles are already at the edge, that direction does nothing until you move another way.</p>
      {showScores&&<ScoresPanel history={sortedHistory} best={best} avg={avg} wins={wins} onClose={()=>setShowScores(false)} onClear={clearHistory}/>}
    </div>
  )
  return (
    <div className="app">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><button className="secondary small" onClick={goHome}>← Home</button><button className="secondary small" onClick={()=>setShowScores(true)}>📊 Scores</button></div>
      <h1>2048 NEON</h1>
      <div className="top"><div className="score"><small>Score</small><b>{score}</b></div><div className="score"><small>Best</small><b>{best}</b></div></div>
      <div className="controls"><button onClick={newGame}>🔄 New Game</button><button className="secondary" onClick={undo}>↩ Undo</button></div>
      <div className={`board-wrap ${shake?'shake':''}`} key={shake} onTouchStart={e=>setTouch(e.touches[0])} onTouchEnd={e=>{if(!touch)return;const t=e.changedTouches[0];const dx=t.clientX-touch.clientX,dy=t.clientY-touch.clientY;if(Math.abs(dx)>30||Math.abs(dy)>30){doMove(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))}}}>
        <div className="bg-grid">{Array.from({length:16}).map((_,i)=><div key={i} className="bg-cell"/>)}</div>
        <div className="tiles-layer">{tiles.map(t=>{const c=COLORS[t.value]||COLORS[2048];return <div key={t.id} className={`tile ${t.merged?'merged':''} ${t.isNew?'isnew':''}`} style={{left:`calc(${t.col*25}% + ${t.col===0?0:2}px)`,top:`calc(${t.row*25}% + ${t.row===0?0:2}px)`,background:`linear-gradient(135deg,${c[0]},${c[1]})`,boxShadow:`0 0 18px ${c[1]}, inset 0 0 0 1px #ffffff55`,fontSize:t.value>=1024?18:t.value>=128?22:26}}>{t.value}</div>})}</div>
        {over&&<div className="overlay"><h2>Game Over!</h2><p>This game: score {score} · best tile {tiles.length?Math.max(...tiles.map(t=>t.value)):0} · moves {moves}</p><p>Saved to your scores ✓</p><button onClick={newGame}>Try Again</button><button className="secondary" onClick={goHome}>Home</button></div>}
        {won&&!keepPlaying&&<div className="overlay"><h2>🎉 You Win!</h2><p>This game: score {score} · best tile 2048 · moves {moves}</p><p>Saved to your scores ✓</p><div style={{display:'flex',gap:8}}><button onClick={()=>{setWon(false);setKeepPlaying(true)}}>Keep Playing</button><button className="secondary" onClick={newGame}>New Game</button></div></div>}
      </div>
      <div className="arrows">
        <button className="up" onClick={()=>doMove('up')}>↑</button>
        <button className="left" onClick={()=>doMove('left')}>←</button>
        <button className="down" onClick={()=>doMove('down')}>↓</button>
        <button className="right" onClick={()=>doMove('right')}>→</button>
      </div>
      <p className="how">Clicks registered: {clickCount} · Arrow keys / WASD / swipe / buttons all work repeatedly.</p>
      {showScores&&<ScoresPanel history={sortedHistory} best={best} avg={avg} wins={wins} onClose={()=>setShowScores(false)} onClear={clearHistory}/>}
    </div>
  )
}
function ScoresPanel({history,best,avg,wins,onClose,onClear}){
  return <div className="modal"><div className="modal-box">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 style={{margin:0}}>📊 Scores</h2><button className="secondary small" onClick={onClose}>✕ Close</button></div>
    <div className="stats"><div className="stat"><small>Best</small><b>{best}</b></div><div className="stat"><small>Games</small><b>{history.length}</b></div><div className="stat"><small>Wins</small><b>{wins}</b></div><div className="stat"><small>Average</small><b>{avg}</b></div></div>
    {!history.length?<p>No games yet — press PLAY!</p>:history.map((h,i)=><div key={h.time+i} className={`history-row ${i===0?'top1':''}`}><div><b>{i===0?'👑 ':''}#{i+1} — {h.score}</b><div style={{fontSize:12,opacity:.75}}>Best tile: {h.bestTile} · Moves: {h.moves??'-'} · {h.date}</div></div><span className="badge">{h.result}</span></div>)}
    <div style={{display:'flex',gap:8,marginTop:12}}><button className="secondary" onClick={onClear}>Clear History</button><button onClick={onClose}>Done</button></div>
  </div></div>
}

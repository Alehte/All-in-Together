// hedef2048.js — tahta secim ekrani + 2048 oyun mantigi
// ============ HEDEF 2048 — TAHTA SECIM EKRANI ============
  (function(){
    // 5x5 bedava; digerleri altinla acilir
    const BOARDS = [
      {size:5,  price:0},
      {size:6,  price:400},
      {size:7,  price:1200},
      {size:8,  price:3000},
      {size:9,  price:7500},
      {size:10, price:18000}
    ];
    const stage = document.getElementById('bdStage');
    const hintEl = document.getElementById('bdHint');
    const backCenter = document.getElementById('bdBackCenter');
    let centered = null;      // o an ortadaki tahta boyutu
    let tilesEl = {};

    function owned(){
      const o = (window.AppProgress && window.AppProgress.boards) || [5];
      return new Set(o);
    }
    function buy(size, price){
      if(!window.AppGold || window.AppGold.get() < price) return false;
      window.AppGold.add(-price);
      const list = Array.from(owned()); list.push(size);
      window.AppProgress.boards = list;
      window.AppSaveProgress({boards: list});
      return true;
    }

    function hexPositions(){
      // merkez + cevresinde 6 nokta (fotoğraftaki altigen dizilim)
      const w = stage.clientWidth || 340, hgt = stage.clientHeight || 420;
      const cx = w/2, cy = hgt/2;
      const rx = Math.min(w*0.34, 128), ry = Math.min(hgt*0.30, 150);
      return [
        {x:cx,        y:cy},              // merkez (secili)
        {x:cx-rx,     y:cy-ry},
        {x:cx+rx,     y:cy-ry},
        {x:cx-rx*1.18,y:cy},
        {x:cx+rx*1.18,y:cy},
        {x:cx-rx,     y:cy+ry},
        {x:cx+rx,     y:cy+ry}
      ];
    }

    function render(){
      const pos = hexPositions();
      const own = owned();
      const gold = window.AppGold ? window.AppGold.get() : 0;
      stage.querySelectorAll('.bd-tile').forEach(el => el.remove());
      tilesEl = {};

      const small = Math.min(stage.clientWidth*0.24, 92);
      const big   = Math.min(stage.clientWidth*0.42, 165);

      let slotIdx = 0;
      BOARDS.forEach((b) => {
        const isCenter = centered === b.size;
        const slot = isCenter ? pos[0] : pos[++slotIdx];
        const el = document.createElement('div');
        el.className = 'bd-tile' + (own.has(b.size) ? '' : ' locked') + (isCenter ? ' center' : '');
        el.style.width = (isCenter ? big : small) + 'px';
        el.style.left = slot.x + 'px';
        el.style.top  = slot.y + 'px';
        el.dataset.size = b.size;

        let cells = '';
        for(let k=0;k<b.size*b.size;k++) cells += '<i></i>';
        const gridStyle = 'grid-template-columns:repeat(' + b.size + ',1fr);grid-template-rows:repeat(' + b.size + ',1fr);';
        let lock = '';
        if(!own.has(b.size)){
          lock = '<div class="bd-lock">' +
                 '<svg class="lk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
                 '<span class="bd-price">' + window.CoinSVG(true) + b.price + '</span></div>';
        }
        el.innerHTML = '<div class="face"><div class="grid" style="' + gridStyle + '">' + cells + '</div>' + lock + '</div>' +
                       '<div class="label">' + b.size + 'x' + b.size + '</div>';
        stage.appendChild(el);
        tilesEl[b.size] = el;
      });

      stage.classList.toggle('focused', centered !== null);
      document.getElementById('screen-2048-boards').classList.toggle('focused', centered !== null);
      backCenter.classList.toggle('show', centered !== null);

      if(centered === null){
        hintEl.textContent = 'Bir tahta seç';
      } else if(own.has(centered)){
        hintEl.textContent = centered + 'x' + centered + ' — oynamak için tekrar dokun';
      } else {
        const b = BOARDS.find(x => x.size === centered);
        hintEl.textContent = gold >= b.price
          ? centered + 'x' + centered + ' — açmak için tekrar dokun'
          : 'Yeterli altının yok (' + b.price + ' gerekli)';
      }
    }

    stage.addEventListener('click', (e) => {
      const t = e.target.closest('.bd-tile');
      if(!t) return;
      const size = Number(t.dataset.size);
      // Bir kare ortadayken sadece o kare tiklanabilir; digerlerine dokunmak bir sey yapmaz.
      // Secimden cikis yalnizca geri tusu (ekrandaki veya telefonun) ile olur.
      if(centered !== null && centered !== size) return;
      if(centered !== size){ centered = size; render(); return; }   // once ortaya getir
      const own = owned();
      if(own.has(size)){
        if(window.Game2048) window.Game2048.start(size);
        slideForward('boards2048','game2048');
        if(window.AppGold) window.AppGold.render();
      } else {
        const b = BOARDS.find(x => x.size === size);
        if(buy(size, b.price)){
          if(window.AppFX) window.AppFX.seq([[523,.14,.12,0],[659,.14,.12,80],[880,.26,.14,160]], 'triangle');
          render();
        } else {
          hintEl.textContent = 'Yeterli altının yok (' + b.price + ' gerekli)';
          if(window.AppFX) window.AppFX.tone(220, 150, 0.18, 'sine', 0.1);
        }
      }
    });

    backCenter.addEventListener('click', () => { centered = null; render(); });
    window.addEventListener('resize', () => { if(screens.boards2048) render(); });

    window.Boards2048 = {
      open(){ centered = null; render(); if(window.AppGold) window.AppGold.render(); },
      // telefonun geri tusu: once ortadaki secimi birak, sonra ekrandan cik
      handleBack(){
        if(centered !== null){ centered = null; render(); return true; }
        return false;
      }
    };
  })();
  // ============ HEDEF 2048 GAME LOGIC ============
  (function(){
    let SIZE = 5;
    const boardEl = document.getElementById('board');
    const tileLayer = document.getElementById('tileLayer');
    const scoreValEl = document.getElementById('scoreVal');
    const bestValEl = document.getElementById('bestVal');
    const scoreBoxEl = document.getElementById('scoreBox');
    const overlayEl = document.getElementById('overlay');
    const overlayMsg = document.getElementById('overlayMsg');
    const overlaySub = document.getElementById('overlaySub');
    const overlayBtn = document.getElementById('overlayBtn');
    const restartBtn = document.getElementById('restartBtn');
    let tiles = [], nextId = 1, score = 0, recordBroken = false, animating = false, cellStep = 0, gamesStarted = 0;
    let milestonesHit = new Set();   // sadece o oyundaki ILK 32/64/128... icin ses
    function bestKey(){ return 'b' + SIZE; }
    function loadBest(){
      const rec = (window.AppProgress && window.AppProgress.bests) || {};
      return rec[bestKey()] || 0;
    }
    let best = 0;
    const domTiles = new Map();
    let audioCtx = null;
    function ensureAudio(){ if(!audioCtx){ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } if(audioCtx.state === 'suspended'){ audioCtx.resume(); } return audioCtx; }
    function playTone(freqStart, freqEnd, duration, type, gainPeak){
      const ctx = ensureAudio(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd,1), ctx.currentTime + duration);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      const v = window.AppFX ? window.AppFX.vol() : 1;
      if(v <= 0) return;
      gain.gain.linearRampToValueAtTime(gainPeak * v, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration + 0.03);
    }
    function playLoseSound(){ playTone(300, 90, 0.5, 'sine', 0.16); }
    function showTileReward(amount){
      const host = document.getElementById('screen-game-2048');
      const b = document.createElement('div');
      b.className = 'tile-reward';
      b.innerHTML = window.CoinSVG(true) + '<span>+' + amount + '</span>';
      host.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    }
    // "dın-dı-rı-dın" — her yeni kilometre tasi icin bir kez, degeri yukseldikce tizlesir
    // Ulasilan her yeni kutu icin altin — sadece o oyunda ILK kez ulasildiginda
    const TILE_GOLD = {
      256:10, 512:25, 1024:60, 2048:150, 4096:300, 8192:600, 16384:1100,
      32768:2000, 65536:3500, 131072:6000, 262144:10000, 524288:17000, 1048576:30000
    };
    // --- kilitli karo / joker ---
    const LOCK_TURNS = 3;                  // kac hamlede cozulur
    function lockChance(){
      if(score < 500) return 0;            // ogrenme suresi
      return Math.min((SIZE*SIZE) / 500, 0.20);         // 5x5 %5 -> 10x10 %20
    }
    function wildChance(){
      return score < 1500 ? 0 : 0.015;
    }
    function canPair(a, b){
      if(a.wall || b.wall) return false;           // duvar hicbir seyle birlesmez
      if(a.lock > 0 || b.lock > 0) return false;   // kilitli karo birlesmez
      if(a.wild && b.wild) return false;           // joker + joker birlesmez
      if(a.wild || b.wild) return true;
      return a.value === b.value;
    }
    function pairValue(a, b){
      if(a.wild) return b.value * 2;
      return a.value * 2;                          // b.wild olsa da survivor'in degeri esas
    }
    function wallCount(){ return Math.floor(SIZE*SIZE / 20); }   // 5x5:1 ... 10x10:5
    function placeWalls(){
      const n = wallCount(); if(n <= 0) return;
      const banned = new Set(['0_0', '0_'+(SIZE-1), (SIZE-1)+'_0', (SIZE-1)+'_'+(SIZE-1)]);
      const used = new Set(); let tries = 0;
      while(used.size < n && tries++ < 300){
        const r = Math.floor(Math.random()*SIZE), c = Math.floor(Math.random()*SIZE);
        const key = r+'_'+c;
        if(banned.has(key) || used.has(key)) continue;              // kose ve tekrar yok
        if(used.has((r-1)+'_'+c) || used.has((r+1)+'_'+c) ||
           used.has(r+'_'+(c-1)) || used.has(r+'_'+(c+1))) continue; // yan yana duvar yok
        used.add(key);
        tiles.push({id:nextId++, value:0, r, c, lock:0, wild:false, wall:true});
      }
    }
    function playMilestoneSound(value){
      const step = Math.log2(value) - 5;                 // 32 -> 0
      const base = 523.25 * Math.pow(1.055, Math.min(step, 8));
      [[base,0],[base*1.26,65],[base*1.5,130],[base*2,200]].forEach(([f,d],i) => {
        setTimeout(() => playTone(f, f, i === 3 ? 0.2 : 0.11, 'triangle', 0.13), d);
      });
    }
    function playWinSound(){ const notes=[523.25,659.25,783.99]; notes.forEach((f,i)=>setTimeout(()=>playTone(f,f,0.18,'triangle',0.14), i*90)); }
    function buildBoardCells(){
      boardEl.querySelectorAll('.cell-bg').forEach(el => el.remove());
      boardEl.style.setProperty('--grid-size', SIZE);
      if(window.AppMarket) window.AppMarket.karoTemasiUygula(boardEl);
      const frag = document.createDocumentFragment();
      for(let i=0;i<SIZE*SIZE;i++){ const d=document.createElement('div'); d.className='cell-bg'; frag.appendChild(d); }
      boardEl.insertBefore(frag, tileLayer);
    }
    function measure(){
      const cells = boardEl.querySelectorAll('.cell-bg');
      const rect1 = cells[0].getBoundingClientRect(); const rect2 = cells[1].getBoundingClientRect();
      cellStep = rect2.left - rect1.left; return rect1.width;
    }
    function emptyCells(){
      const occ = new Set(tiles.map(t => t.r + '_' + t.c)); const out = [];
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(!occ.has(r+'_'+c)) out.push([r,c]);
      return out;
    }
    function spawnTile(){
      const empties = emptyCells(); if(empties.length === 0) return null;
      const [r,c] = empties[Math.floor(Math.random()*empties.length)];
      const tile = {id:nextId++, value:2, r, c, lock:0, wild:false};
      const roll = Math.random(), wc = wildChance();
      if(roll < wc){
        tile.wild = true; tile.value = 0;
      } else {
        tile.value = Math.random() < 0.9 ? 2 : 4;
        if(roll < wc + lockChance()) tile.lock = LOCK_TURNS;
      }
      tiles.push(tile); return tile;
    }
    // --- oyun durumu: AYNI ANDA TEK aktif oyun tutulur ---
    // Tahta basina ayri kayit tutmak hem bellegi sisirir hem de "hangi oyun aktif"
    // sorusunu bulaniklastirir. Tek slot: baska tahtaya gecmek eskisini siler (onay sorarak).
    let liveSession = null;                  // bu oturumda bellekteki aktif oyun
    function snapshot(){
      return { size: SIZE, score: score,
               tiles: tiles.map(t => [t.r, t.c, t.value, t.lock || 0, t.wild ? 1 : 0, t.wall ? 1 : 0]),
               milestones: Array.from(milestonesHit) };
    }
    function savedActive(){
      const st = window.AppProgress && window.AppProgress.g2048active;
      return (st && st.tiles && st.tiles.length && st.score > 0) ? st : null;
    }
    function saveState(){
      const snap = snapshot();
      liveSession = snap;
      if(window.AppSaveProgress) window.AppSaveProgress({g2048active: snap});
    }
    function clearActive(){
      liveSession = null;
      if(window.AppSaveProgress) window.AppSaveProgress({g2048active: null});
    }
    function restoreState(st){
      SIZE = st.size;
      buildBoardCells();
      tiles = []; domTiles.forEach(el => el.remove()); domTiles.clear();
      nextId = 1;
      st.tiles.forEach(a => tiles.push({id: nextId++, value: a[2], r: a[0], c: a[1],
                                        lock: a[3] || 0, wild: !!a[4], wall: !!a[5]}));
      score = st.score;
      best = loadBest();
      milestonesHit = new Set(st.milestones || []);
      gamesStarted = Math.max(gamesStarted, 2);   // rekor isigi calissin
      recordBroken = score > 0 && score >= best;
      scoreBoxEl.classList.toggle('record', recordBroken);
      scoreBoxEl.classList.toggle('normal', !recordBroken);
      overlayEl.classList.remove('show');
      render();
      liveSession = snapshot();
    }

    function undo(){
      if(animating || !undoStack.length) return;
      restoreState(undoStack.pop());
      saveState();
    }

    function newGame(){
      gamesStarted++; tiles = []; milestonesHit = new Set(); domTiles.forEach(el => el.remove()); domTiles.clear();
      score = 0; recordBroken = false; undoStack = [];
      scoreBoxEl.classList.remove('record'); scoreBoxEl.classList.add('normal');
      overlayEl.classList.remove('show'); placeWalls(); spawnTile(); spawnTile(); render(); saveState();
    }
    let lastCw = 0;
    function render(){
      const cw = measure();
      if(!cw || !cellStep) return;   // ekran gizliyken olculer 0 gelir, cizme
      const sizeChanged = (cw !== lastCw); lastCw = cw;
      tiles.forEach(t => {
        let el = domTiles.get(t.id); const isNewEl = !el;
        if(isNewEl){ el = document.createElement('div'); el.className = 'tile pop'; tileLayer.appendChild(el); domTiles.set(t.id, el); el.addEventListener('animationend', () => el.classList.remove('pop','merged'), {once:true}); }
        el.style.width = cw + 'px'; el.style.height = cw + 'px';
        const key = t.wall ? 'X' : (t.wild ? 'w' : (t.value + '|' + t.lock));
        if(sizeChanged || el.dataset.k !== key){
          el.dataset.k = key;
          el.dataset.v = t.wall ? 'wall' : (t.wild ? 'wild' : t.value);
          el.classList.toggle('locked', t.lock > 0);
          if(t.lock > 0) el.dataset.lock = t.lock; else el.removeAttribute('data-lock');
          el.textContent = t.wall ? '' : (t.wild ? '★' : t.value);
          const d = t.wall ? 2 : (t.wild ? 2 : String(t.value).length);
          const ratio = d <= 2 ? 0.42 : d === 3 ? 0.34 : d === 4 ? 0.27 : d === 5 ? 0.22 : 0.19;
          el.style.fontSize = Math.round(cw * ratio) + 'px';
        }
        el.style.translate = (t.c * cellStep) + 'px ' + (t.r * cellStep) + 'px';
        if(t.justMerged && !isNewEl){ el.classList.add('merged'); } t.justMerged = false;
      });
      const liveIds = new Set(tiles.map(t => t.id));
      domTiles.forEach((el, id) => { if(!liveIds.has(id)){ el.remove(); domTiles.delete(id); } });
      scoreValEl.textContent = score; bestValEl.textContent = best;
    }
    function lineOrder(dir){
      const lines = [];
      if(dir === 'left'){ for(let r=0;r<SIZE;r++){ const line=[]; for(let c=0;c<SIZE;c++) line.push([r,c]); lines.push(line); } }
      else if(dir === 'right'){ for(let r=0;r<SIZE;r++){ const line=[]; for(let c=SIZE-1;c>=0;c--) line.push([r,c]); lines.push(line); } }
      else if(dir === 'up'){ for(let c=0;c<SIZE;c++){ const line=[]; for(let r=0;r<SIZE;r++) line.push([r,c]); lines.push(line); } }
      else if(dir === 'down'){ for(let c=0;c<SIZE;c++){ const line=[]; for(let r=SIZE-1;r>=0;r--) line.push([r,c]); lines.push(line); } }
      return lines;
    }
    let queuedDir = null;
    let undoStack = [];
    function move(dir){
      if(animating){ queuedDir = dir; return; }
      const prevSnap = snapshot();
      const grid = {}; tiles.forEach(t => { grid[t.r+'_'+t.c] = t; });
      const lines = lineOrder(dir); let movedAny = false, scoreGain = 0; const removeIds = new Set();

      lines.forEach(line => {
        const cellTiles = line.map(([r,c]) => grid[r+'_'+c] || null);
        let segCells = [], segTiles = [];          // kilitli karolar satiri parcalara boler
        const flush = () => {
          if(segCells.length){
            const result = []; const riders = new Map(); let i = 0;
            while(i < segTiles.length){
              if(i+1 < segTiles.length && canPair(segTiles[i], segTiles[i+1])){
                const survivor = segTiles[i], removed = segTiles[i+1];
                const newVal = pairValue(survivor, removed);
                survivor.pendingValue = newVal;
                riders.set(survivor.id, removed);
                if(newVal >= 32 && !milestonesHit.has(newVal)){
                  milestonesHit.add(newVal);
                  playMilestoneSound(newVal);
                  const reward = TILE_GOLD[newVal];
                  if(reward && window.AppGold){ window.AppGold.add(reward); showTileReward(reward); }
                }
                scoreGain += newVal; removeIds.add(removed.id); result.push(survivor); i += 2;
              } else { result.push(segTiles[i]); i += 1; }
            }
            for(let idx=0; idx<segCells.length; idx++){
              const [r,c] = segCells[idx]; const tile = result[idx];
              if(tile){
                if(tile.r !== r || tile.c !== c) movedAny = true;
                tile.r = r; tile.c = c;
                const rider = riders.get(tile.id);
                if(rider){ rider.r = r; rider.c = c; }
              }
            }
          }
          segCells = []; segTiles = [];
        };
        for(let k=0;k<line.length;k++){
          const [r,c] = line[k]; const t = cellTiles[k];
          if(t && (t.lock > 0 || t.wall)){ flush(); }   // kilit veya duvar: segmenti kapat
          else { segCells.push(line[k]); if(t) segTiles.push(t); }
        }
        flush();
      });
      if(removeIds.size > 0) movedAny = true;

      if(!movedAny){ tiles.forEach(t => { t.pendingValue = null; }); return; }
      undoStack.push(prevSnap); if(undoStack.length > 5) undoStack.shift();
      score += scoreGain; animating = true;
      render();
      setTimeout(() => {
        tiles.forEach(t => {
          if(t.pendingValue){ t.value = t.pendingValue; t.pendingValue = null; t.wild = false; t.justMerged = true; }
        });
        tiles = tiles.filter(t => !removeIds.has(t.id));
        tiles.forEach(t => { if(t.lock > 0) t.lock--; });   // kilitler sadece basarili hamlede erir
        spawnTile(); render(); animating = false;
        saveState(); evaluateAfterMove();
        if(queuedDir){ const d = queuedDir; queuedDir = null; move(d); }
      }, 140);
    }
    function canMove(){
      if(emptyCells().length > 0) return true;
      const grid = {}; tiles.forEach(t => grid[t.r+'_'+t.c] = t);
      for(let r=0;r<SIZE;r++){ for(let c=0;c<SIZE;c++){
        const a = grid[r+'_'+c]; if(!a) continue;
        const right = grid[r+'_'+(c+1)], down = grid[(r+1)+'_'+c];
        if(c+1<SIZE && right && canPair(a, right)) return true;
        if(r+1<SIZE && down  && canPair(a, down))  return true;
      } }
      return false;
    }
    // Yeni rekorda yazi cikmaz; kenarlarda guclu, merkezde daha soluk bir isik parlar.
    const recordFxEl = document.getElementById('recordFx');
    function flashRecord(){
      recordFxEl.classList.remove('show'); void recordFxEl.offsetWidth; recordFxEl.classList.add('show');
      setTimeout(() => recordFxEl.classList.remove('show'), 1600);
    }
    function showLoseOverlay(){ overlayMsg.textContent='Hamle kalmadı'; overlaySub.textContent='Skorun: '+score; overlayBtn.style.display='inline-block'; overlayBtn.textContent='Yeniden Başla'; overlayEl.classList.add('show'); }
    function evaluateAfterMove(){
      if(score > best){
        best = score; bestValEl.textContent = best;
        if(window.AppSaveProgress){
          window.AppProgress.bests = window.AppProgress.bests || {};
          window.AppProgress.bests[bestKey()] = best;
          window.AppSaveProgress({bests: window.AppProgress.bests});
        }
        if(!recordBroken && gamesStarted > 1){ recordBroken = true; scoreBoxEl.classList.remove('normal'); scoreBoxEl.classList.add('record'); playWinSound(); flashRecord(); }
      }
      if(!canMove()){
        if(tiles.some(t => t.lock > 0)){        // sadece kilitler yuzunden tikandiysa hepsini coz
          tiles.forEach(t => t.lock = 0); render();
          if(canMove()){ if(window.AppFX) window.AppFX.tone(660, 200, 0.14, 'triangle', 0.12); return; }
        }
        playLoseSound(); showLoseOverlay(); clearActive();
      }
    }
    const gameScreenEl = document.getElementById('screen-game-2048');
    function gameVisible(){
      const cs = getComputedStyle(gameScreenEl);
      if(cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .5) return false;
      const r = gameScreenEl.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 1 && r.left < window.innerWidth - 1;
    } 
    window.addEventListener('keydown', (e) => {
      if(!gameVisible()) return;
      const map = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
                   a:'left', d:'right', w:'up', s:'down', A:'left', D:'right', W:'up', S:'down'};
      if(map[e.key]){ e.preventDefault(); move(map[e.key]); }
 });
    let touchStartX = 0, touchStartY = 0;
    boardEl.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, {passive:true});
    boardEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX; const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const big = Math.max(absX, absY), small = Math.min(absX, absY);
      const th = Math.max(18, Math.min(cellStep * 0.35, 40));   // tahta buyudukce esik kuculur
      if(big < th) return;
      if(big < small * 1.1) return;                             // cok capraz -> hamle sayma
      if(absX > absY){ move(dx > 0 ? 'right' : 'left'); } else { move(dy > 0 ? 'down' : 'up'); }
    }, {passive:true});
    restartBtn.addEventListener('click', newGame);
    overlayBtn.addEventListener('click', newGame);
    window.addEventListener('resize', render);
    if(window.AppReset){
      window.AppReset.push(function(){ SIZE = 5; best = 0; liveSession = null; bestValEl.textContent = '0'; gamesStarted = 0; buildBoardCells(); newGame(); });
    }
    // Tahta secim ekrani buradan baslatir
    const resumeAsk = document.getElementById('resumeAsk');
    const raTitleEl = document.getElementById('raTitle');
    const raSub = document.getElementById('raSub');
    const raYesBtn = document.getElementById('raYes');
    const raNoBtn  = document.getElementById('raNo');
    let onYes = null, onNo = null;

    function askDialog(title, sub, yesLabel, noLabel, yesFn, noFn){
      raTitleEl.textContent = title;
      raSub.textContent = sub;
      raYesBtn.textContent = yesLabel;
      raNoBtn.textContent  = noLabel;
      onYes = yesFn; onNo = noFn;
      resumeAsk.classList.add('show');
    }
    raYesBtn.addEventListener('click', () => {
      resumeAsk.classList.remove('show');
      const f = onYes; onYes = onNo = null; if(f) f();
    });
    raNoBtn.addEventListener('click', () => {
      resumeAsk.classList.remove('show');
      const f = onNo; onYes = onNo = null; if(f) f();
    });

    function beginNew(size){
      SIZE = size; best = loadBest(); buildBoardCells(); newGame();
    }

    window.Game2048 = {
      start(size){
        resumeAsk.classList.remove('show');
        onYes = onNo = null;
        const active = liveSession || savedActive();

        // Aktif oyun yok -> dogrudan yeni oyun
        if(!active || !active.tiles.length || active.score <= 0){ beginNew(size); return; }

        // Aktif oyun AYNI tahtada
        if(active.size === size){
          if(liveSession){ restoreState(liveSession); return; }   // ayni oturum -> sessiz devam
          SIZE = size; best = loadBest(); buildBoardCells();       // uygulama kapanmisti -> sor
          askDialog('Kaldığın yerden devam edelim mi?',
            size + 'x' + size + ' tahtada ' + active.score + ' puanlık oyunun duruyor.',
            'Evet', 'Hayır',
            () => restoreState(active),
            () => { clearActive(); beginNew(size); });
          return;
        }

        // Aktif oyun BASKA tahtada -> tek slot oldugu icin silinecek, once onay al
        SIZE = size; best = loadBest(); buildBoardCells();
        askDialog('Aktif ' + active.size + 'x' + active.size + ' oyunun silinsin mi?',
          active.score + ' puanlık oyunun kaybolacak. Aynı anda tek oyun tutuluyor.',
          'Sil ve Başla', 'Vazgeç',
          () => { clearActive(); beginNew(size); },
          () => {
            slideBack('game2048','boards2048');
            if(window.Boards2048) window.Boards2048.open();
          });
      }
    };
    SIZE = 5; best = loadBest(); buildBoardCells(); newGame();
  })();

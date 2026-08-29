// tempoKup.js — Tempo Kup 8x8 blok yerlestirme + parca uretici v2
// ============ TEMPO KÜP — 8x8 blok yerlestirme ============
  // Kurallar: dondurme YOK, ayni anda 3 parca, dolan satir VE sutun temizlenir.
  (function(){
    const N = 8;
    const boardEl = document.getElementById('tpBoard');
    const trayEl  = document.getElementById('tpTray');
    const scoreEl = document.getElementById('tpScore');
    const bestEl  = document.getElementById('tpBest');
    const overEl  = document.getElementById('tpOver');
    const overBig = document.getElementById('tpOverBig');
    const overSub = document.getElementById('tpOverSub');

    // --- parca kutuphanesi (dondurme olmadigi icin her yon ayri parca) ---
    const SHAPES = [
      [[0,0],[0,1]], [[0,0],[1,0]],
      [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3],[0,4]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
      // kucuk L (3 hucre, 4 yon)
      [[0,0],[1,0],[1,1]], [[0,0],[0,1],[1,0]], [[0,0],[0,1],[1,1]], [[0,1],[1,0],[1,1]],
      // orta L / J (4 hucre, 8 yon)
      [[0,0],[1,0],[2,0],[2,1]], [[0,1],[1,1],[2,0],[2,1]],
      [[0,0],[0,1],[1,0],[2,0]], [[0,0],[0,1],[1,1],[2,1]],
      [[0,0],[1,0],[1,1],[1,2]], [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[0,2],[1,0]], [[0,0],[0,1],[0,2],[1,2]],
      // buyuk L (5 hucre, 4 yon)
      [[0,0],[1,0],[2,0],[2,1],[2,2]], [[0,0],[0,1],[0,2],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2],[2,2]], [[0,2],[1,2],[2,0],[2,1],[2,2]],
      // T (4 hucre, 4 yon)
      [[0,0],[0,1],[0,2],[1,1]], [[0,1],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[1,1],[2,0]], [[0,1],[1,0],[1,1],[2,1]],
      // S / Z
      [[0,1],[0,2],[1,0],[1,1]], [[0,0],[0,1],[1,1],[1,2]],
      [[0,0],[1,0],[1,1],[2,1]], [[0,1],[1,0],[1,1],[2,0]]
    ];
    const COLORS = ['#6FD3FF','#B78BFF','#FFD166','#4DF08F','#FF7A8A','#FF9F4D','#7A8CFF','#5FE0C8'];
    // Sekil bazli temel gelme sikligi (SpawnConfig disinda, sabit karakteristik)
    function rarity(shape){
      const n = shape.length;
      const rows = Math.max(...shape.map(s=>s[0])) + 1;
      const cols = Math.max(...shape.map(s=>s[1])) + 1;
      const bar  = (rows === 1 || cols === 1);
      if(n === 2) return 0.35;            // 2'lik cubuk: spam yapmasin
      if(n === 3) return 0.5;             // 3'luk cubuk ve kucuk L
      if(n === 4 && bar) return 1.5;      // 4'luk cubuk
      if(n === 5 && bar) return 1.5;      // 5'lik cubuk
      return 1;
    }

    // ===== ORTAK YARDIMCILAR (uretici ve ipucu birlikte kullanir) =====
    function fitsOn(g, shape, r0, c0){
      for(const [dr,dc] of shape){
        const r = r0+dr, c = c0+dc;
        if(r<0||r>=N||c<0||c>=N||g[r][c]) return false;
      }
      return true;
    }
    function applyOn(g, shape, r0, c0){
      const n = g.map(row => row.slice());
      for(const [dr,dc] of shape) n[r0+dr][c0+dc] = 1;
      const fr = [], fc = [];
      for(let r=0;r<N;r++) if(n[r].every(v=>v)) fr.push(r);
      for(let c=0;c<N;c++){ let ok=true; for(let r=0;r<N;r++) if(!n[r][c]){ok=false;break;} if(ok) fc.push(c); }
      const lines = fr.length + fc.length;
      for(const r of fr) for(let c=0;c<N;c++) n[r][c] = 0;
      for(const c of fc) for(let r=0;r<N;r++) n[r][c] = 0;
      const full = lines>0 && n.every(row => row.every(v => !v));
      return {g:n, lines, full};
    }
    function largestOpenSquareOn(g){
      const dp = []; let best = 0;
      for(let r=0;r<N;r++){ dp[r] = [];
        for(let c=0;c<N;c++){
          if(g[r][c]){ dp[r][c] = 0; continue; }
          dp[r][c] = (r===0||c===0) ? 1 : 1 + Math.min(dp[r][c-1], dp[r-1][c], dp[r-1][c-1]);
          if(dp[r][c] > best) best = dp[r][c];
        } }
      return best;
    }
    function deadCellsOn(g){
      let d = 0;
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        if(g[r][c]) continue;
        let f = 0;
        if(r===0   || g[r-1][c]) f++;
        if(r===N-1 || g[r+1][c]) f++;
        if(c===0   || g[r][c-1]) f++;
        if(c===N-1 || g[r][c+1]) f++;
        if(f>=3) d++;
      }
      return d;
    }
    function occupancyOn(g){ let n=0; for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(g[r][c]) n++; return n/(N*N); }
    // bir parcanin makul yerlesimi (ipucu kullanir)
    function bestPlaceOn(g, shape){
      let bv = -Infinity, br = null;
      // Tahta boslarken dolu hucreleri az sayida satir/sutuna toplamaya calis:
      // final planinin kurulabilmesi icin gereken sart bu.
      const cw = occupancyOn(g) < SpawnConfig.spreadFrom ? SpawnConfig.spreadW : 0;
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        if(!fitsOn(g, shape, r, c)) continue;
        const res = applyOn(g, shape, r, c);
        const v = (res.full?400000:0) + res.lines*res.lines*18000
                + largestOpenSquareOn(res.g)*900 - deadCellsOn(res.g)*140 - occupancyOn(res.g)*3000
                - (cw ? spreadOn(res.g).min * cw : 0);
        if(v > bv){ bv = v; br = res; }
      }
      return br;
    }

    // ===== PARCA TURLERI (ust uste ayni tur gelmesini azaltmak icin) =====
    function typeOfShape(sh){
      const H = Math.max(...sh.map(s=>s[0]))+1, W = Math.max(...sh.map(s=>s[1]))+1;
      if(W===1 && H>=2) return 'dikey';
      if(H===1 && W>=2) return 'yatay';
      const has = (r,c) => sh.some(([a,b]) => a===r && b===c);
      let solid = true;
      for(let r=0;r<H;r++) for(let c=0;c<W;c++) if(!has(r,c)) solid = false;
      if(solid) return 'blok';
      for(const i of [0,H-1]) for(const j of [0,W-1]){
        let ok = true, cnt = 0;
        for(let r=0;r<H && ok;r++) for(let c=0;c<W && ok;c++){
          const inArm = (r===i) || (c===j);
          if(has(r,c)){ if(!inArm) ok = false; else cnt++; }
          else if(inArm) ok = false;
        }
        if(ok && cnt === sh.length) return 'L';
      }
      return 'diger';
    }
    const KINDS = ['dikey','yatay','blok','L','diger'];
    let typeHeat = {};
    function resetHeat(){ typeHeat = {}; for(const k of KINDS) typeHeat[k] = 0; }
    function bumpHeat(shapes){
      for(const sh of shapes) typeHeat[typeOfShape(sh)] = (typeHeat[typeOfShape(sh)]||0) + 1;
      for(const k of KINDS) typeHeat[k] *= SpawnConfig.typeDecay;
    }
    resetHeat();

    let grid = [];          // null | renk
    let score = 0, best = 0;
    let tray = [];          // {shape, color, used}
    let dragging = null;

    function loadBest(){
      const r = (window.AppProgress && window.AppProgress.tempoBest) || 0;
      return r;
    }
    function saveBest(){
      if(window.AppSaveProgress) window.AppSaveProgress({tempoBest: best});
    }

    // Hucreler bir kez uretilip dizide tutuluyor. Eskiden her erisimde
    // querySelector calisiyordu; hat patlatirken bu sorgular ust uste
    // binip gorunur gecikme yaratiyordu.
    let cellEls = [];
    function buildBoard(){
      boardEl.querySelectorAll('.tp-cell').forEach(e => e.remove());
      const frag = document.createDocumentFragment();
      cellEls = new Array(N*N);
      for(let i=0;i<N*N;i++){
        const d = document.createElement('div');
        d.className = 'tp-cell'; d.dataset.i = i;
        cellEls[i] = d;
        frag.appendChild(d);
      }
      boardEl.appendChild(frag);
    }
    function cellAt(r,c){ return cellEls[r*N+c]; }
    // markette secili blok temasi; yoksa oyunun kendi paleti
    function tpRenkSec(){
      const r = window.AppMarket && window.AppMarket.blokRengi && window.AppMarket.blokRengi();
      return r || COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    function paint(){
      if(window.AppMarket && window.AppMarket.blokTemasiUygula){
        window.AppMarket.blokTemasiUygula(boardEl);
        window.AppMarket.blokTemasiUygula(trayEl);
      }
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        const el = cellAt(r,c); const v = grid[r][c] || '';
        // ayni rengi tekrar yazmak her seferinde stil hesabi tetikliyordu
        if(el.dataset.bg !== v){ el.dataset.bg = v; el.style.backgroundColor = v; }
        el.classList.toggle('filled', !!v);
      }
      scoreEl.textContent = score.toLocaleString('tr-TR');
      bestEl.textContent = best.toLocaleString('tr-TR');
    }
    function clearPreview(){
      boardEl.querySelectorAll('.tp-cell').forEach(e => e.classList.remove('preview','badspot'));
    }

    function fits(shape, r0, c0){
      for(const [dr,dc] of shape){
        const r = r0+dr, c = c0+dc;
        if(r<0||r>=N||c<0||c>=N) return false;
        if(grid[r][c]) return false;
      }
      return true;
    }
    function anyFit(shape){
      for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(fits(shape,r,c)) return true;
      return false;
    }

    // --- PUANLAMA ---
    const PT_CELL = 20;         // yerlestirilen her hucre
    const PT_LINE = 700;        // temizlenen satir basi (satir sayisinin karesiyle carpilir)
    const PT_FULLCLEAR = 22000; // tahtayi tamamen supurmek: oyunun zirvesi
    const TEMPO_WINDOW = 5000;  // bu sure icinde tekrar temizlersen tempo korunur
    let lastClearAt = 0;
    let tempoActive = false;
    function currentMult(){ return tempoActive ? 2 : 1; }
    // Tempo artik kutu olarak gosterilmiyor: aktif olunca 0.5 sn'lik "x2" flasi cikar
    // ve tempo suresi boyunca ekran kenarlari nabiz atar.
    const screenTempo = () => document.getElementById('screen-tempo');
    function refreshTempo(){
      screenTempo().classList.toggle('tempo-on', tempoActive);
    }
    function flashX2(){
      const host = screenTempo();
      const el = document.createElement('div');
      el.className = 'tp-x2';
      el.textContent = 'x2';
      host.appendChild(el);
      setTimeout(() => el.remove(), 600);
    }
    let fuseTimer = null;
    function startFuseLoop(){
      if(fuseTimer) return;
      fuseTimer = setInterval(() => {
        if(!lastClearAt) return;
        const left = TEMPO_WINDOW - (Date.now() - lastClearAt);
        if(left <= 0 && tempoActive){ tempoActive = false; refreshTempo(); }
      }, 100);
    }
    function stopFuseLoop(){ if(fuseTimer){ clearInterval(fuseTimer); fuseTimer = null; } }
    function tickTempo(){
      const was = tempoActive;
      tempoActive = (Date.now() - lastClearAt) < TEMPO_WINDOW && lastClearAt > 0;
      if(was !== tempoActive) refreshTempo();
    }

    // ===== IPUCU: en iyi hamleyi bul ve goster =====
    let hintTimer = null;
    function clearHint(){
      clearTimeout(hintTimer);
      trayEl.querySelectorAll('.tp-piece').forEach(el => el.classList.remove('hint-on'));
      boardEl.querySelectorAll('.tp-silhouette').forEach(el => el.remove());
    }
    // En iyi hamle: once ANLIK fayda (patlayan cizgi), sonra tepsinin geri kalani.
    // Ipucuna basan oyuncu anlasilir ve tatmin edici bir hamle gormeli; bu yuzden
    // cizgi patlatan hamle, gizli kurulum hamlesinin onunde tutulur.
    function findBestMove(){
      let best = null;
      const rest = tray.map((p,i) => ({p,i})).filter(x => !x.p.used);
      rest.forEach(({p, i:idx}) => {
        for(let r=0;r<N;r++) for(let c=0;c<N;c++){
          if(!fitsOn(grid, p.shape, r, c)) continue;
          const first = applyOn(grid, p.shape, r, c);
          // kalan parcalar: baglam olarak hesaba katilir ama belirleyici degildir
          let g = first.g, tailLines = 0, tailFull = 0;
          for(const o of rest){
            if(o.i === idx) continue;
            const nx = bestPlaceOn(g, o.p.shape);
            if(!nx) break;
            g = nx.g; tailLines += nx.lines; if(nx.full) tailFull++;
          }
          const v = (first.full ? 900000 : 0)                 // tahtayi supuruyorsa her seyin onunde
                  + first.lines*first.lines*60000             // ANLIK patlama agir basar
                  + (tailFull*120000 + tailLines*tailLines*9000)   // tepsi baglami: yarim agirlik
                  + largestOpenSquareOn(g)*700
                  - deadCellsOn(g)*160
                  - occupancyOn(g)*2500;
          if(!best || v > best.v) best = {v, idx, r, c, shape:p.shape};
        }
      });
      return best;
    }
    function showHint(){
      clearHint();
      if(overEl.classList.contains('show')) return;
      const mv = findBestMove();
      if(!mv) return;
      // 1) tepsideki onerilen parca nabiz atsin
      const pe = trayEl.querySelector('.tp-piece[data-idx="' + mv.idx + '"]');
      if(pe) pe.classList.add('hint-on');
      // 2) tahtada konulacak yerde hayali siluet
      const cw = cellAt(0,0).getBoundingClientRect().width;
      const step = cellAt(0,1).getBoundingClientRect().left - cellAt(0,0).getBoundingClientRect().left;
      const rows = Math.max(...mv.shape.map(s=>s[0]))+1;
      const cols = Math.max(...mv.shape.map(s=>s[1]))+1;
      const sil = document.createElement('div');
      sil.className = 'tp-silhouette on';
      sil.style.gridTemplateColumns = 'repeat(' + cols + ',' + cw + 'px)';
      sil.style.gridTemplateRows = 'repeat(' + rows + ',' + cw + 'px)';
      const anchor = cellAt(mv.r, mv.c).getBoundingClientRect();
      const boardBox = boardEl.getBoundingClientRect();
      sil.style.left = (anchor.left - boardBox.left) + 'px';
      sil.style.top  = (anchor.top  - boardBox.top)  + 'px';
      const set = new Set(mv.shape.map(s => s[0] + '_' + s[1]));
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const i = document.createElement('i');
        if(!set.has(r + '_' + c)) i.style.visibility = 'hidden';
        sil.appendChild(i);
      }
      boardEl.appendChild(sil);
      if(window.AppFX) window.AppFX.tone(880, 1180, 0.16, 'triangle', 0.09);
      hintTimer = setTimeout(clearHint, 4000);
    }
    // ==========================================================
    //  PARCA URETICI v3 — "adil ve odullendirici"
    //  1) INSA EDEREK GARANTI : tepsi, tahtaya sirayla konularak uretilir.
    //     3 parcanin bir siralamayla yerlesmesi sansa degil, uretim
    //     bicimine baglidir -> %100.
    //  2) POZITIF GERI BILDIRIM : patlamaya yakin hatti kapatan parca
    //     geri cekilmez, ODULLENDIRILIR (boostClearerW).
    //  3) SUREKLI DINAMIK HAVUZ : esik / acil-durum modu yok. Parca boyutu
    //     tahtanin dolulugu ile pursuz bir egri boyunca kayar.
    //  4) RNG CEZASI YOK : skor ne olursa olsun sigmayan parca uretilmez.
    //  Tum katsayilar SpawnConfig'ten canli ayarlanir.
    // ==========================================================
    const SpawnConfig = {
      // --- SUREKLI DINAMIK HAVUZ (bant degil, egri) ---
      // t = doluluk (0 = bomboş tahta, 1 = dolu tahta). Agirliklar t ile kayar.
      bigWeightAtEmpty   : 3.6,   // bos tahtada buyuk parca (3x3, 5'lik cubuk, buyuk L)
      bigWeightAtFull    : 0.04,  // tahta doldukca buyuk parca sifira yakinsar
      bigCurve           : 2.2,   // >1 => buyuk parca daha erken cekilir
      midWeightAtEmpty   : 0.9,   // orta boy (4'luk cubuk, T, S/Z, 2x2): omurga
      midWeightAtFull    : 1.7,
      smallWeightAtEmpty : 0.30,  // bos tahtada kucuk parca sikici -> bastirilir
      smallWeightAtFull  : 1.9,   // dolu tahtada kucuk parca nefes aldirir
      // 1x1 esikle degil egriyle gelir; bos tahtada pratikte hic gorunmez.
      allowUnitPiece     : true,
      unitWeightAtFull   : 2.4,
      unitCurve          : 6,     // buyudukce 1x1 daha gec devreye girer

      // --- POZITIF GERI BILDIRIM (dopamin gecikmesi DEGIL, dopamin odulu) ---
      boostClearerW      : 1.3,   // su an bir hat patlatabilen parca
      boostMultiClearW   : 1.8,   // ayni hamlede 2+ hat patlatabilen parca
      snugBonusW         : 1.1,   // tahtadaki spesifik bosluga oturan parcaya bonus
      clearerSlotChance  : 1.0,   // patlatilabilir hat varsa 1. yuva garanti kapatici

      // --- FINAL: TAM TEMIZLIK ANA HEDEF ---
      finaleMaxLines : 4,     // tum dolu hucreler en fazla kac PARALEL hatta sigmali
      finaleMaxCells : 24,    // kapatilmasi gereken bosluk sayisi tavani
      finaleCooldown : 6,     // tam temizlikten sonra kac tepsi plan sunulmasin
      spreadFrom     : 0.35,  // doluluk bunun altindayken konsolidasyon devreye girer
      spreadW        : 2000,  // "dolu hucreleri az sayida hatta topla" baskisi

      // --- SETUP -> PAYOFF (tahta sezgisel analizine bagli) ---
      nearGapMax         : 3,     // <= bu kadar bosluk kalan satir/sutun "patlamaya yakin"
      nearLineProgressW  : 2.4,   // eksik hatti KISMEN dolduran parcaya da bonus (setup)
      payoffFrom         : 0.30,  // payoff bonusu bu dolulukta belirmeye baslar
      payoffTo           : 0.55,  // bu dolulukta tam gucune ulasir (orta nokta ~%45)

      // --- MERHAMET: girinti duzeltme ---
      concavityRepairW   : 3.0,   // purruzlu tahtada L ve 2x2 kare bonusu
      repairFrom         : 0.25,  // concavity bu degerden sonra onemsenir
      repairTo           : 0.55,  // burada tam guc

      // --- CESITLILIK ---
      typeRepeatPenalty  : 0.45,  // ayni turun ust uste gelmesini azaltir
      typeDecay          : 0.5,
      trayDupPenalty     : 0.35,  // ayni tepside ayni seklin tekrari
      forbidTripleSame   : true,

      // --- ADALET ---
      verifyPlayable     : true,  // uretim sonrasi son dogrulama
      rebuildAttempts    : 12
    };

    window.SpawnConfig = SpawnConfig;   // konsoldan canli ayar icin

function shapeBox(sh){
      return {H: Math.max(...sh.map(s=>s[0]))+1, W: Math.max(...sh.map(s=>s[1]))+1};
    }
    const UNIT_PIECE = [[0,0]];
    // Uretim havuzu = normal sekiller + 1x1. 1x1 havuzda hep durur ama
    // agirligi doluluk egrisiyle belirlenir; bos tahtada ~0'dir.
    const SPAWN_POOL = SHAPES.concat([UNIT_PIECE]);

    // boyut sinifi: 'unit' | 'small' | 'mid' | 'big'
    function sizeClassOf(sh){
      if(sh.length === 1) return 'unit';
      const {H,W} = shapeBox(sh);
      if(sh.length >= 5 || (H >= 3 && W >= 3)) return 'big';
      if(sh.length <= 3) return 'small';
      return 'mid';
    }

    function fitsAnywhere(sh, g){
      for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(fitsOn(g, sh, r, c)) return true;
      return false;
    }

    // ==========================================================
    //  TAHTA SEZGISEL ANALIZI (BoardAnalyzer)
    //  Tepsi uretilmeden once tahta okunur; uretici bu 3 sinyale bakar.
    // ==========================================================

    // 1) Dolmasina az kalmis satir/sutunlar. Her biri: {gap, cells:Set(hucre indeksi)}
    //    "cells" = o hattaki BOS hucreler -> parcanin ne kadarini kapattigini olcecegiz.
    function nearCompleteLines(g){
      const out = [], maxGap = SpawnConfig.nearGapMax;
      for(let r=0;r<N;r++){
        const cells = new Set();
        for(let c=0;c<N;c++) if(!g[r][c]) cells.add(r*N + c);
        if(cells.size > 0 && cells.size <= maxGap) out.push({type:'row', i:r, gap:cells.size, cells});
      }
      for(let c=0;c<N;c++){
        const cells = new Set();
        for(let r=0;r<N;r++) if(!g[r][c]) cells.add(r*N + c);
        if(cells.size > 0 && cells.size <= maxGap) out.push({type:'col', i:c, gap:cells.size, cells});
      }
      return out;
    }
    // Hucre -> hangi yakin hatlara ait? (measureShape hizli sorgulasin diye)
    function nearLineIndex(near){
      const map = new Map();
      near.forEach((ln, id) => {
        for(const key of ln.cells){
          if(!map.has(key)) map.set(key, []);
          map.get(key).push(id);
        }
      });
      return map;
    }

    // 2) Girintililik: bos hucrelerin ne kadari "cukur"da? (0 = duzgun, 1 = tarak gibi)
    //    3-4 komsusu dolu/duvar olan bos hucre = derin girinti; 2 komsulu = hafif.
    function concavityOn(g){
      let empty = 0, notch = 0;
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        if(g[r][c]) continue;
        empty++;
        let f = 0;
        const nb = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for(const [nr,nc] of nb){
          if(nr<0 || nr>=N || nc<0 || nc>=N){ f++; continue; }   // duvar da kapatir
          if(g[nr][nc]) f++;
        }
        if(f >= 3) notch += 1;
        else if(f === 2) notch += 0.4;
      }
      return empty ? notch / empty : 0;
    }

    // 3) Tek cagriyla tam tablo
    function analyzeBoard(g){
      const near = nearCompleteLines(g);
      return {
        density   : occupancyOn(g),      // tahtanin yuzde kaci dolu
        near      : near,                // patlamaya yakin hatlar
        nearMap   : nearLineIndex(near), // hucre -> hat id'leri
        concavity : concavityOn(g)       // purruzluluk
      };
    }

    // Esik yerine yumusak gecis: x edge0 altinda 0, edge1 ustunde 1.
    function smoothstep(edge0, edge1, x){
      const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    }
    // Girintiyi duzelten sekiller: L ailesi + 2x2 kucuk kare
    function isRepairShape(sh){
      if(typeOfShape(sh) === 'L') return true;
      const {H,W} = shapeBox(sh);
      return sh.length === 4 && H === 2 && W === 2;
    }

    // --- SEKIL OLCUMU: bu sekil, bu tahtada ne yapabilir? ---
    //   fits     : hicbir yere sigiyor mu
    //   maxLines : en iyi konumda kac hat patlatir  -> ODUL sinyali
    //   snug     : en iyi konumda cevresel temas orani (0..1) -> bosluga oturma
    //   nearProg : eksik bir hattin ne kadarini kapatiyor (0..1) -> SETUP sinyali
    function measureShape(sh, g, an){
      let fits = false, maxLines = 0, snug = 0, nearProg = 0;
      const q = sh.length * 4;
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        if(!fitsOn(g, sh, r, c)) continue;
        fits = true;
        const lines = applyOn(g, sh, r, c).lines;
        if(lines > maxLines) maxLines = lines;
        const own = new Set(sh.map(([a,b]) => (r+a)*N + (c+b)));
        let touch = 0;
        for(const [dr,dc] of sh){
          const rr = r+dr, cc = c+dc;
          const nb = [[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]];
          for(const [nr,nc] of nb){
            if(nr<0 || nr>=N || nc<0 || nc>=N){ touch++; continue; }  // duvar da temastir
            if(own.has(nr*N + nc)) continue;
            if(g[nr][nc]) touch++;
          }
        }
       const s = touch / q;
        if(s > snug) snug = s;
        // SETUP olcumu: bu konumda, patlamaya yakin bir hattin kac boslugunu doldurur?
        if(an && an.near.length){
          const tally = {};
          for(const [dr,dc] of sh){
            const ids = an.nearMap.get((r+dr)*N + (c+dc));
            if(ids) for(const id of ids) tally[id] = (tally[id] || 0) + 1;
          }
          for(const id in tally){
            const p = tally[id] / an.near[id].gap;    // hattin yuzde kaci kapandi
            if(p > nearProg) nearProg = p;
          }
        }
      }
      return {fits, maxLines, snug, nearProg};
    }
    // tum havuzu tek seferde olc; agirliklar bu tabloya bakar
    function measurePool(g, an){
      const m = new Map();
      for(const sh of SPAWN_POOL){
        if(sh === UNIT_PIECE && !SpawnConfig.allowUnitPiece) continue;
        m.set(sh, measureShape(sh, g, an));
      }
      return m;
    }

    function lerp(a, b, t){ return a + (b - a) * t; }

    // --- AGIRLIK: sureklidir, esik yoktur ---
    function pieceWeight(sh, g, ctx){
      const meta = ctx.meta.get(sh);
      if(!meta || !meta.fits) return 0;        // sigmayan parca asla uretilmez
      const t = ctx.occ;                       // 0 = bos, 1 = dolu
      let w;
      switch(sizeClassOf(sh)){
        case 'unit':
          w = SpawnConfig.unitWeightAtFull * Math.pow(t, SpawnConfig.unitCurve); break;
        case 'big':
          w = lerp(SpawnConfig.bigWeightAtEmpty, SpawnConfig.bigWeightAtFull,
                   Math.pow(t, SpawnConfig.bigCurve)); break;
        case 'small':
          w = lerp(SpawnConfig.smallWeightAtEmpty, SpawnConfig.smallWeightAtFull, t); break;
        default:
          w = lerp(SpawnConfig.midWeightAtEmpty, SpawnConfig.midWeightAtFull, t);
      }
      // ODUL: hat patlatabilen parcayi one al (eskiden geri cekiliyordu)
      if(meta.maxLines >= 2)       w *= SpawnConfig.boostMultiClearW;
      else if(meta.maxLines === 1) w *= SpawnConfig.boostClearerW;
      // tahtadaki spesifik bosluga oturan parca, tahta doldukca daha degerli
      w *= 1 + SpawnConfig.snugBonusW * meta.snug * t;
      // SETUP -> PAYOFF: hatti tam kapatmasa bile ilerleten parca da odullendirilir.
      // Bonusun gucu doluluk ile yumusakca acilir (~%45 civari yariya gelir).
      if(meta.nearProg > 0){
        const payoff = smoothstep(SpawnConfig.payoffFrom, SpawnConfig.payoffTo, t);
        w *= 1 + SpawnConfig.nearLineProgressW * meta.nearProg * payoff;
      }
      // MERHAMET: tahta purruzluyse L ve 2x2 kare girintileri duzeltsin diye one cikar
      if(ctx.concavity > 0 && isRepairShape(sh)){
        const repair = smoothstep(SpawnConfig.repairFrom, SpawnConfig.repairTo, ctx.concavity);
        w *= 1 + SpawnConfig.concavityRepairW * repair;
      }
      // sekil bazli temel siklik
      w *= rarity(sh);
      // ayni tur ust uste gelmesin
      w *= 1 / (1 + (typeHeat[typeOfShape(sh)] || 0) * SpawnConfig.typeRepeatPenalty);
      // ayni tepside tekrar etmesin
      if(ctx.chosen && ctx.chosen.has(sh)) w *= SpawnConfig.trayDupPenalty;
      return Math.max(w, 0.0001);
    }
    function weightedPick(list, g, ctx){
      if(!list.length) return null;
      const ws = list.map(sh => pieceWeight(sh, g, ctx));
      const tot = ws.reduce((a,b)=>a+b, 0);
      if(!(tot > 0)) return list[Math.floor(Math.random()*list.length)];
      let t = Math.random() * tot;
      for(let i=0;i<list.length;i++){ t -= ws[i]; if(t <= 0) return list[i]; }
      return list[list.length-1];
    }

    // OYUNCU SIRASIYLA oynanabilirlik.
    // "Bir siralamayla oynanabilir" garantisi yetmiyor: oyuncu farkli sirayla
    // oynayip son parcayi yerlestiremeden kalabiliyor (olcum: oyunlarin cogu
    // boyle bitiyordu). Bu yuzden oyuncunun gercekte secmesi muhtemel sirayi
    // simule edip ucunun de yerlestigini dogruluyoruz.
    function playableUnderGreedy(g, shapes){
      let b = g, rem = shapes.slice();
      while(rem.length){
        let bi = -1, br = null, bv = -Infinity;
        for(let i=0;i<rem.length;i++){
          const res = bestPlaceOn(b, rem[i]);
          if(!res) continue;
          const v = (res.full?500000:0) + res.lines*res.lines*22000
                  + largestOpenSquareOn(res.g)*1100 - deadCellsOn(res.g)*180 - occupancyOn(res.g)*4200;
          if(v > bv){ bv = v; bi = i; br = res; }
        }
        if(bi < 0) return false;
        b = br.g; rem.splice(bi,1);
      }
      return true;
    }
    // uc parca, bir siralamayla arka arkaya konulabilir mi?
    function allPlayableInOrder(g, shapes){
      const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
      function dfs(b, pm, i){
        if(i===3) return true;
        const sh = shapes[pm[i]];
        for(let r=0;r<N;r++) for(let c=0;c<N;c++){
          if(!fitsOn(b, sh, r, c)) continue;
          if(dfs(applyOn(b, sh, r, c).g, pm, i+1)) return true;
        }
        return false;
      }
      for(const pm of perms) if(dfs(g, pm, 0)) return true;
      return false;
    }

    // ==========================================================
    //  FINAL PLANLAYICI — tam temizlik ana hedef
    //  Tahtadaki tum dolu hucreler az sayida PARALEL hatta (sadece satir
    //  ya da sadece sutun) sigiyorsa, o hatlarin bosluklarini TAM olarak
    //  kaplayan 1-3 parca aranir. Bulunursa tepsi bu parcalarla kurulur;
    //  oyuncu dogru yerlere koyarsa tahta tamamen supurulur.
    //  Paralel sarti onemli: satirlar birbirinin hucresini bozmaz, bir hat
    //  erken patlasa bile geri kalan plan gecerli kalir.
    // ==========================================================
    function spreadOn(g){
      const R = new Set(), C = new Set();
      for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(g[r][c]){ R.add(r); C.add(c); }
      return {rows:[...R], cols:[...C], min: Math.min(R.size, C.size)};
    }
    // Hucre kumesini en fazla `depth` parca ile TAM olarak kapla (exact cover).
    function tileExact(cellSet, depth){
      if(cellSet.size === 0) return [];
      if(depth === 0) return null;
      let target = Infinity;
      for(const k of cellSet) if(k < target) target = k;      // en ustteki bos hucre
      const tr = Math.floor(target/N), tc = target%N;
      for(const sh of SPAWN_POOL){
        if(sh.length > cellSet.size) continue;
        for(const [ar,ac] of sh){                            // seklin her hucresini hedefe hizala
          const r0 = tr-ar, c0 = tc-ac;
          const used = []; let ok = true;
          for(const [dr,dc] of sh){
            const rr = r0+dr, cc = c0+dc;
            if(rr<0||rr>=N||cc<0||cc>=N){ ok = false; break; }
            const key = rr*N + cc;
            if(!cellSet.has(key)){ ok = false; break; }       // hattin disina tasarsa plan bozulur
            used.push(key);
          }
          if(!ok) continue;
          const next = new Set(cellSet);
          for(const k of used) next.delete(k);
          const rest = tileExact(next, depth-1);
          if(rest) return [{shape:sh, r:r0, c:c0}, ...rest];
        }
      }
      return null;
    }
    function finalePlan(g){
      const sp = spreadOn(g);
      if(!sp.rows.length) return null;                       // tahta zaten bos
      for(const [orient, lines] of [['row', sp.rows], ['col', sp.cols]]){
        if(lines.length > SpawnConfig.finaleMaxLines) continue;
        const E = new Set();                                 // kapatilacak bosluklar
        for(const li of lines) for(let k=0;k<N;k++){
          const r = orient === 'row' ? li : k;
          const c = orient === 'row' ? k  : li;
          if(!g[r][c]) E.add(r*N + c);
        }
        if(E.size === 0 || E.size > SpawnConfig.finaleMaxCells) continue;
        const plan = tileExact(E, 3);
        if(plan) return plan;                                // [{shape,r,c}, ...]
      }
      return null;
    }
    // tam temizlik ust uste tekrarlanmasin diye kisa bekleme
    let finaleCooldown = 0;

    // --- ANA URETICI: tepsi "insa edilerek" uretilir ---
    // Her parca, bir onceki parcanin makul bir hamleyle oynanmis halindeki
    // tahtaya gore secilir. Bu yuzden "ucunu de bir sirayla koyabilirsin"
    // garantisi sansa degil, uretimin kendisine baglidir.
    
    function spawnTray(firstTray){
      if(finaleCooldown > 0) finaleCooldown--;

      // --- FINAL PLANI: tam temizlik firsati kurulabiliyor mu? ---
      if(!firstTray && finaleCooldown <= 0){
        const plan = finalePlan(grid);
        if(plan){
          const picks = plan.map(p => p.shape);
          // Bos kalan yuvalar: plan oynandiginda tahta bosalacagi icin
          // bu parcalar BOS tahtaya gore secilir.
          if(picks.length < 3){
            const blank = Array.from({length:N}, () => Array(N).fill(null));
            const an = analyzeBoard(blank);
            const meta = measurePool(blank, an);
            const chosen = new Set(picks);
            while(picks.length < 3){
              const pool = SPAWN_POOL.filter(sh => { const m = meta.get(sh); return m && m.fits; });
              const p = weightedPick(pool, blank, {occ:0, meta, chosen, concavity:0, near:[]});
              if(!p) break;
              picks.push(p); chosen.add(p);
            }
          }
          if(picks.length === 3){
            bumpHeat(picks);
            return picks.map(sh => ({shape:sh, color:tpRenkSec(), used:false}));
          }
        }
      }

      let board = grid;
      const picks = [];
      const chosen = new Set();

      for(let slot = 0; slot < 3; slot++){
        const an   = analyzeBoard(board);           // tahta sezgisel analizi
        const occ  = an.density;
        const meta = measurePool(board, an);
        const ctx  = {occ, meta, chosen, concavity: an.concavity, near: an.near};

        let pool = SPAWN_POOL.filter(sh => { const m = meta.get(sh); return m && m.fits; });
        if(!pool.length) break;                      // tahtada gercekten yer yok

        if(firstTray){
          // ilk el ferah baslasin: genis parcalar
          const big = pool.filter(sh => sizeClassOf(sh) === 'big');
          if(big.length) pool = big;
        } else if(slot === 0 && Math.random() < SpawnConfig.clearerSlotChance){
          // ODUL GARANTISI: patlatilabilir hat varsa ilk yuva onu kapatan olsun
          const clearers = pool.filter(sh => meta.get(sh).maxLines > 0);
          if(clearers.length) pool = clearers;
        }

        const pick = weightedPick(pool, board, ctx);
        if(!pick) break;
        picks.push(pick);
        chosen.add(pick);

        // sonraki parcayi, bunun oynanmis halindeki tahtaya gore sec
        const played = bestPlaceOn(board, pick);
        if(played) board = played.g;
      }

      if(picks.length < 3) return null;              // tahta gercekten kilitli

      // ucu de ayni sekil olmasin (garantiyi bozmadan)
      if(SpawnConfig.forbidTripleSame && picks[0] === picks[1] && picks[1] === picks[2]){
        const alt = SPAWN_POOL.filter(sh => sh !== picks[0] && fitsAnywhere(sh, grid));
        for(let i=0;i<SpawnConfig.rebuildAttempts && alt.length;i++){
          const cand = alt[Math.floor(Math.random()*alt.length)];
          if(allPlayableInOrder(grid, [cand, picks[1], picks[2]])){ picks[0] = cand; break; }
        }
      }

      // SON DOGRULAMA: en az bir siralama ile ucu de yerlesmeli.
      // Insa mantigi geregi buraya normalde girilmez; girerse guvenli tepsi kurulur.
      if(SpawnConfig.verifyPlayable && !allPlayableInOrder(grid, picks)){
        const safe = buildSafeTray(grid);
        if(safe){ picks.length = 0; picks.push(safe[0], safe[1], safe[2]); }
      }

      bumpHeat(picks);
      return picks.map(sh => ({shape:sh, color:tpRenkSec(), used:false}));
    }

    // Acil durum modu DEGIL: yalnizca son dogrulama beklenmedik sekilde
    // patlarsa devreye giren guvenlik agi. En kucuk sigan parcalarla kurar.
    function buildSafeTray(g){
      let b = g; const out = [];
      for(let i=0;i<3;i++){
        const pool = SPAWN_POOL.filter(sh => fitsAnywhere(sh, b))
                               .sort((x,y) => x.length - y.length);
        if(!pool.length) return null;
        const sh = pool[0];
        out.push(sh);
        const played = bestPlaceOn(b, sh);
        if(played) b = played.g;
      }
      return out;
    }

    function refillTray(firstTray){
      const t = spawnTray(!!firstTray);
      tray = t || [randomPiece(), randomPiece(), randomPiece()];
      renderTray();
    }
    function randomPiece(){
      return {shape: SHAPES[Math.floor(Math.random()*SHAPES.length)],
              color: tpRenkSec(), used:false};
    }

    function renderTray(){
      trayEl.innerHTML = '';
      tray.forEach((p, idx) => {
        const slot = document.createElement('div');
        slot.className = 'tp-slot';
        if(!p.used){
          const rows = Math.max(...p.shape.map(s=>s[0]))+1;
          const cols = Math.max(...p.shape.map(s=>s[1]))+1;
          const pe = document.createElement('div');
          pe.className = 'tp-piece';
          pe.dataset.idx = idx;
          const unit = Math.min(20, Math.floor(76/Math.max(rows,cols)));
          pe.style.gridTemplateColumns = 'repeat(' + cols + ',' + unit + 'px)';
          pe.style.gridTemplateRows = 'repeat(' + rows + ',' + unit + 'px)';
          const set = new Set(p.shape.map(s=>s[0]+'_'+s[1]));
          for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
            const i = document.createElement('i');
            if(set.has(r+'_'+c)) i.style.backgroundColor = p.color;
            else i.style.visibility = 'hidden';
            pe.appendChild(i);
          }
          slot.appendChild(pe);
        }
        trayEl.appendChild(slot);
      });
    }

    // --- yerlestirme + temizleme ---
    function place(piece, r0, c0){
      piece.shape.forEach(([dr,dc]) => { grid[r0+dr][c0+dc] = piece.color; });
      score += piece.shape.length * PT_CELL;
      piece.used = true;

      const fullRows = [], fullCols = [];
      for(let r=0;r<N;r++) if(grid[r].every(v=>v)) fullRows.push(r);
      for(let c=0;c<N;c++){ let ok=true; for(let r=0;r<N;r++) if(!grid[r][c]){ok=false;break;} if(ok) fullCols.push(c); }
      const lines = fullRows.length + fullCols.length;

      if(lines > 0){
        const marked = new Set();
        fullRows.forEach(r => { for(let c=0;c<N;c++) marked.add(r+'_'+c); });
        fullCols.forEach(c => { for(let r=0;r<N;r++) marked.add(r+'_'+c); });
        marked.forEach(k => { const [r,c] = k.split('_').map(Number); cellAt(r,c).classList.add('clearing'); });
        tickTempo();
        const mult = currentMult();
        const gain = PT_LINE * lines * lines * mult;   // 1 satir=700, 2=2800, 3=6300, 4=11200 (x tempo)
        score += gain;
        showCombo(lines, gain, mult);
        const wasTempo = tempoActive;
        lastClearAt = Date.now();
        tempoActive = true; refreshTempo();
        if(!wasTempo) flashX2();
        if(window.AppFX){
          const base = 520 + lines*90;
          window.AppFX.seq([[base,.13,.12,0],[base*1.26,.13,.12,70],[base*1.5,.2,.13,140]], 'triangle');
          window.AppFX.vibrate(lines > 1 ? [15,40,15] : 18);
        }
        setTimeout(() => {
          marked.forEach(k => { const [r,c] = k.split('_').map(Number); grid[r][c] = null; cellAt(r,c).classList.remove('clearing'); });
          const swept = grid.every(row => row.every(v => !v));
          if(swept){
            score += PT_FULLCLEAR * mult;
            finaleCooldown = SpawnConfig.finaleCooldown;   // ust uste tekrarlanmasin
            showFullClear(PT_FULLCLEAR * mult);
            if(window.AppFX) window.AppFX.seq([[523,.14,.14,0],[659,.14,.14,80],[784,.14,.14,160],[1047,.16,.15,240],[1319,.36,.16,340]], 'triangle');
            if(window.AppFX) window.AppFX.vibrate([20,50,20,50,30]);
          }
          paint();
          // afterMove() bazen refillTray()->spawnTray() tetikliyor; o da finalePlan/
          // verifyPlayable icin tahtada geri izlemeli arama yapiyor ve tek basina
          // uzun surebiliyor. Ayni goreve (temizleme + paint ile) yigilmasin diye
          // bir sonraki kareye itiyoruz — hucreler aninda temizlenmis gorunur.
          requestAnimationFrame(afterMove);
        }, 330);
      } else {
        if(window.AppFX) window.AppFX.tone(300, 260, 0.07, 'sine', 0.07);
        paint(); afterMove();
      }
      renderTray();
      paint();
    }
    function showFullClear(gain){
      const t = document.createElement('div');
      t.className = 'tp-fullclear';
      t.innerHTML = '<span>TAM TEMİZLİK!</span><b>+' + gain.toLocaleString('tr-TR') + '</b>';
      boardEl.appendChild(t);
      setTimeout(() => t.remove(), 1900);
    }
    function showCombo(lines, gain, mult){
      const t = document.createElement('div');
      t.className = 'tp-combo';
      t.textContent = (lines > 1 ? lines + 'X KOMBO  ' : '') + (mult > 1 ? 'TEMPO x' + mult + '  ' : '') + '+' + gain;
      boardEl.appendChild(t);
      setTimeout(() => t.remove(), 1050);
    }
    function afterMove(){
      tickTempo();
      if(score > best){ best = score; saveBest(); }
      if(tray.every(p => p.used)) refillTray();
      paint();
      const alive = tray.filter(p => !p.used).some(p => anyFit(p.shape));
      if(!alive) gameOver();
    }
    const RECORD_GOLD = 200;
    function gameOver(){
      const brokeRecord = score > bestAtStart;
      overBig.innerHTML = brokeRecord
        ? '<span style="color:#FFE08A">Yeni</span> <span style="color:#8FF0B4">Rekor!</span>'
        : '<span style="color:#FF9A8A">Yer</span> <span style="color:#FFC97A">Kalmadı</span>';
      let sub = 'Skorun: ' + score.toLocaleString('tr-TR');
      if(brokeRecord){
        sub += '  ·  Önceki: ' + bestAtStart.toLocaleString('tr-TR');
        if(window.AppGold) window.AppGold.add(RECORD_GOLD);
      }
      overSub.innerHTML = sub + (brokeRecord ? '<div style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px;color:#FBE7AE;font-size:19px;">' + window.CoinSVG(true) + '+' + RECORD_GOLD + '</div>' : '');
      overEl.classList.add('show');
      tempoActive = false; lastClearAt = 0; refreshTempo();
      stopFuseLoop(); clearHint();
      if(window.AppFX){
        if(brokeRecord) window.AppFX.seq([[523,.15,.13,0],[659,.15,.13,90],[784,.15,.13,180],[1047,.3,.15,270]], 'triangle');
        else window.AppFX.seq([[440,.16,.13,0],[349,.16,.13,170],[262,.5,.15,340]], 'sine');
      }
    }

    let bestAtStart = 0;
    function newGame(){
      grid = Array.from({length:N}, () => Array(N).fill(null));
      resetHeat();
      score = 0; best = loadBest(); bestAtStart = best;
      lastClearAt = 0; tempoActive = false;
      overEl.classList.remove('show');
      buildBoard(); refillTray(true); paint(); refreshTempo(); clearHint();
      startFuseLoop();
    }

    // --- surukle birak (pointer: fare + dokunma tek kod) ---
    function boardMetrics(){
      const cell0 = cellAt(0,0), cell1 = cellAt(0,1);
      const r0 = cell0.getBoundingClientRect(), r1 = cell1.getBoundingClientRect();
      return { left:r0.left, top:r0.top, step:(r1.left - r0.left), size:r0.width };
    }
    function killGhosts(){ document.querySelectorAll('.tp-ghost').forEach(g => g.remove()); }
    function startDrag(e){
      if(dragging) return;                        // ikinci bir surukleme baslatilamaz
      if(e.button !== undefined && e.button !== 0) return;   // sadece sol tus
      killGhosts();                               // onceki turden kalan hayalet varsa temizle
      const pe = e.target.closest('.tp-piece');
      if(!pe || overEl.classList.contains('show')) return;
      const idx = Number(pe.dataset.idx);
      const piece = tray[idx];
      if(!piece || piece.used) return;
      e.preventDefault();

      const m = boardMetrics();
      const rows = Math.max(...piece.shape.map(s=>s[0]))+1;
      const cols = Math.max(...piece.shape.map(s=>s[1]))+1;
      const ghost = document.createElement('div');
      ghost.className = 'tp-ghost';
      ghost.style.gridTemplateColumns = 'repeat(' + cols + ',' + m.size + 'px)';
      ghost.style.gridTemplateRows = 'repeat(' + rows + ',' + m.size + 'px)';
      const set = new Set(piece.shape.map(s=>s[0]+'_'+s[1]));
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const i = document.createElement('i');
        if(set.has(r+'_'+c)) i.style.backgroundColor = piece.color; else i.style.visibility='hidden';
        ghost.appendChild(i);
      }
      // hayalet body'ye tasindigi icin tepsinin temasini miras alamiyor;
      // temayi dogrudan onun uzerine de yaziyoruz
      if(window.AppMarket && window.AppMarket.blokTemasiUygula){
        window.AppMarket.blokTemasiUygula(ghost);
      }
      document.body.appendChild(ghost);
      pe.classList.add('used');

      dragging = { piece, idx, ghost, rows, cols, m, pid: e.pointerId,
                   w: cols*m.step - (m.step-m.size), h: rows*m.step - (m.step-m.size) };
      // isaretciyi yakala: fare pencere disina ciksa bile olaylar bize gelir
      try{ trayEl.setPointerCapture(e.pointerId); }catch(err){}
      moveDrag(e);
      window.addEventListener('pointermove', moveDrag);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('blur', endDrag);
    }
    function dropTarget(dd){
      const d = dd || dragging; if(!d) return null;
      const g = d.ghost.getBoundingClientRect();
      const c0 = Math.round((g.left - d.m.left) / d.m.step);
      const r0 = Math.round((g.top  - d.m.top)  / d.m.step);
      return {r0, c0};
    }
    function moveDrag(e){
      const d = dragging; if(!d) return;
      const lift = 58;   // parca parmagin ustunde dursun
      d.ghost.style.left = (e.clientX - d.w/2) + 'px';
      d.ghost.style.top  = (e.clientY - d.h/2 - lift) + 'px';
      clearPreview();
      const t = dropTarget();
      if(!t) return;
      const ok = fits(d.piece.shape, t.r0, t.c0);
      d.piece.shape.forEach(([dr,dc]) => {
        const r = t.r0+dr, c = t.c0+dc;
        if(r>=0&&r<N&&c>=0&&c<N) cellAt(r,c).classList.add(ok ? 'preview' : 'badspot');
      });
    }
    function endDrag(e){
      const d = dragging; if(!d) return;
      dragging = null;                         // once kilidi ac: tekrar girisi engelle
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('blur', endDrag);
      try{ trayEl.releasePointerCapture(d.pid); }catch(err){}
      let t = null;
      try{ t = dropTarget(d); }catch(err){}
      killGhosts();                            // hayalet her durumda gider
      clearPreview();
      if(t && fits(d.piece.shape, t.r0, t.c0)){
        place(d.piece, t.r0, t.c0);
      }
      renderTray();                            // gecerli/gecersiz farketmez, tepsi hep yeniden cizilir
      paint();
    }
    trayEl.addEventListener('pointerdown', (e) => { clearHint(); startDrag(e); });
    const IPUCU_FIYAT = 100;
    const hintBtn = document.getElementById('tpHintBtn');
    const hintFiyatEl = hintBtn.querySelector('.f');
    if(hintFiyatEl) hintFiyatEl.innerHTML = window.CoinSVG(true) + IPUCU_FIYAT;
    hintBtn.addEventListener('click', () => {
      if(!window.AppGold.harca(IPUCU_FIYAT)){
        if(window.AppFX) window.AppFX.vibrate(28);
        hintBtn.classList.add('yetersiz');
        setTimeout(() => hintBtn.classList.remove('yetersiz'), 700);
        return;
      }
      showHint();
    });
    document.getElementById('tpAgain').addEventListener('click', newGame);

    if(window.AppReset) window.AppReset.push(function(){ best = 0; newGame(); });
    window.TempoKup = { start(){ if(!grid.length) newGame(); best = loadBest(); paint(); } };
    newGame();
  })();

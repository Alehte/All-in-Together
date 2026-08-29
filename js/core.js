// core.js — ekran gecisleri, ayarlar, ortak altin cuzdani, kalici kayit
// ============ NAVIGATION ============
  const screens = {
    home: document.getElementById('screen-home'),
    game2048: document.getElementById('screen-game-2048'),
    kacisMode: document.getElementById('screen-kacis-mode'),
    kacisOzel: document.getElementById('screen-kacis-ozel'),
    kacisLevels: document.getElementById('screen-kacis-levels'),
    kacisLevel1: document.getElementById('screen-kacis-level1'),
    boards2048: document.getElementById('screen-2048-boards'),
    tempo: document.getElementById('screen-tempo'),
    ssMod: document.getElementById('screen-susirala-mode'),
    ssHarita: document.getElementById('screen-susirala-harita'),
    ssOyun: document.getElementById('screen-susirala-oyun'),
    ssoHarita: document.getElementById('screen-susirala-ozelharita'),
    ssoOyun: document.getElementById('screen-susirala-ozeloyun'),
    market: document.getElementById('screen-market'),
  };
  let navBusy = false, pendingPop = null, settleTimer = null;
  // baslangicta home disindaki her ekran sahne disi: DevTools'ta Elements
  // panelinden herhangi bir ekranin ".offstage" class'i var mi diye bakip
  // gorunur/tiklanabilir mi anlayabilirsin.
  Object.keys(screens).forEach(function(k){ if(k !== 'home') screens[k].classList.add('offstage'); });
  function armScreenSettle(from, to){
    navBusy = true;
    from.style.willChange = 'transform'; to.style.willChange = 'transform';
    if(settleTimer) clearTimeout(settleTimer);
    const done = () => {
      from.removeEventListener('transitionend', done);
      clearTimeout(settleTimer);
      from.classList.add('offstage');
      from.style.willChange = ''; to.style.willChange = '';
      navBusy = false;
      if(pendingPop){ const p = pendingPop; pendingPop = null; p(); }
    };
    from.addEventListener('transitionend', done, { once:true });
    settleTimer = setTimeout(done, settings.reducedMotion ? 20 : 380);
  }
  function slideForward(fromKey, toKey){
    const from = screens[fromKey], to = screens[toKey];
    to.classList.remove('offstage');
    to.style.transition = 'none'; to.style.transform = 'translateX(100%)'; void to.offsetWidth; to.style.transition = '';
    requestAnimationFrame(() => { from.style.transform = 'translateX(-100%)'; to.style.transform = 'translateX(0)'; });
    armScreenSettle(from, to);
  }
  function slideBack(fromKey, toKey){
    const from = screens[fromKey], to = screens[toKey];
    to.classList.remove('offstage');
    to.style.transition = 'none'; to.style.transform = 'translateX(-100%)'; void to.offsetWidth; to.style.transition = '';
    requestAnimationFrame(() => { from.style.transform = 'translateX(100%)'; to.style.transform = 'translateX(0)'; });
    armScreenSettle(from, to);
  }
  document.getElementById('cardHedef2048').addEventListener('click', () => { slideForward('home','boards2048'); if(window.Boards2048) window.Boards2048.open(); });
  document.getElementById('boardsBackBtn').addEventListener('click', () => slideBack('boards2048','home'));
  document.getElementById('backBtn2048').addEventListener('click', () => { slideBack('game2048','boards2048'); if(window.Boards2048) window.Boards2048.open(); });
  document.getElementById('cardTempo').addEventListener('click', () => { slideForward('home','tempo'); if(window.TempoKup) window.TempoKup.start(); if(window.AppGold) window.AppGold.render(); });
  document.getElementById('tempoBackBtn').addEventListener('click', () => slideBack('tempo','home'));
  document.getElementById('cardKacis').addEventListener('click', () => { if(window.KacisMod) window.KacisMod.yenile(); slideForward('home','kacisMode'); });
  document.getElementById('kacisModeBackBtn').addEventListener('click', () => slideBack('kacisMode','home'));
  document.getElementById('kacisLevelsBackBtn').addEventListener('click', () => { if(window.KacisMod) window.KacisMod.yenile(); slideBack('kacisLevels','kacisMode'); });
  document.getElementById('kc1BackBtn').addEventListener('click', () => slideBack('kacisLevel1', window.Kacis ? window.Kacis.haritaAnahtari() : 'kacisLevels'));
  document.getElementById('kacisOzelBackBtn').addEventListener('click', () => { if(window.KacisMod) window.KacisMod.yenile(); slideBack('kacisOzel','kacisMode'); });
  document.getElementById('cardSuSirala').addEventListener('click', () => {
    if(window.SuSiralaOyun) window.SuSiralaOyun.modYenile();
    slideForward('home','ssMod');
  });
  document.getElementById('ssModeBackBtn').addEventListener('click', () => slideBack('ssMod','home'));
  document.getElementById('ssHaritaBackBtn').addEventListener('click', () => {
    if(window.SuSiralaOyun) window.SuSiralaOyun.modYenile();
    slideBack('ssHarita','ssMod');
  });
  document.getElementById('ssOyunBackBtn').addEventListener('click', () => {
    if(window.SuSiralaOyun) window.SuSiralaOyun.haritaCiz();
    slideBack('ssOyun','ssHarita');
  });
  document.getElementById('ssoHaritaBackBtn').addEventListener('click', () => {
    if(window.SuSiralaOyun) window.SuSiralaOyun.modYenile();
    slideBack('ssoHarita','ssMod');
  });
  document.getElementById('ssoOyunBackBtn').addEventListener('click', () => {
    if(window.SuSiralaOzelOyun) window.SuSiralaOzelOyun.haritaCiz();
    slideBack('ssoOyun','ssoHarita');
  });
  // --- telefonun kendi geri tusu ile senkron ---
  let navStack = [];
  const _fwd = slideForward, _back = slideBack;
  slideForward = function(from, to){
    if(navBusy) return;
    navStack.push([from, to]); _fwd(from, to); history.pushState({s:to}, '');
  };
  slideBack = function(from, to){
    if(navBusy) return;
    navStack = navStack.filter(p => p[1] !== from); _back(from, to);
  };
  history.replaceState({s:'home'}, '');
  function handlePopstate(){
    // once ekran ici bir secim aciksa onu kapat
    if(window.Boards2048 && screens.boards2048.style.transform === 'translateX(0)' && window.Boards2048.handleBack()){
      history.pushState({s:'boards2048'}, '');
      return;
    }
    const last = navStack.pop();
    if(last){ _back(last[1], last[0]); }
  }
  window.addEventListener('popstate', () => {
    if(navBusy){ pendingPop = handlePopstate; return; }
    handlePopstate();
  });

  // ============ HOME SCREEN LOGIC ============
  const settingsRow = document.getElementById('settingsRow');
  const sheet = document.getElementById('sheet');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const sheetClose = document.getElementById('sheetClose');
  const gamesScroll = document.getElementById('gamesScroll');
  const gameCards = Array.from(document.querySelectorAll('.game-card'));
  function updateActiveCard(){
    const scrollRect = gamesScroll.getBoundingClientRect();
    const center = scrollRect.left + scrollRect.width / 2;
    let closest = null, closestDist = Infinity;
    gameCards.forEach(card => {
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const dist = Math.abs(cardCenter - center);
      if(dist < closestDist){ closestDist = dist; closest = card; }
    });
    gameCards.forEach(card => card.classList.toggle('active', card === closest));
  }
  gamesScroll.addEventListener('scroll', () => window.requestAnimationFrame(updateActiveCard), {passive:true});
  updateActiveCard();
  function openSheet(){ sheet.classList.add('show'); sheetBackdrop.classList.add('show'); }
  function closeSheet(){ sheet.classList.remove('show'); sheetBackdrop.classList.remove('show'); }
  settingsRow.addEventListener('click', openSheet);
  settingsRow.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') openSheet(); });
  sheetClose.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);
  // ---- kalici depo: dosya olarak acildiginda saklar, saklanamiyorsa oturum boyu bellekte tutar ----
  const Store = (function(){
    let mem = {}, ok = true;
    try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); } catch(e){ ok = false; }
    return {
      persistent: ok,
      get(k, d){ try{ if(ok){ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } }catch(e){}
                 return (k in mem) ? mem[k] : d; },
      set(k, v){ try{ if(ok){ localStorage.setItem(k, JSON.stringify(v)); return; } }catch(e){}
                 mem[k] = v; },
      del(k){ try{ if(ok){ localStorage.removeItem(k); return; } }catch(e){}
              delete mem[k]; }
    };
  })();
  window.AppStore = Store;   // market.js NO ADS kaydini burada tutar

  const DEFAULTS = { sfx:70, music:45, haptics:true, reducedMotion:false, lang:'tr' };
  let settings = Object.assign({}, DEFAULTS, Store.get('ait_settings', {}));
  function saveSettings(){ Store.set('ait_settings', settings); }

  // Oyun scriptlerinin kullandigi ortak yardimcilar
  window.AppFX = {
    vol(){ return settings.sfx / 100; },
    vibrate(pattern){
      if(!settings.haptics) return;
      if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
    },
    // ortak ton uretici — efekt seviyesine bagli
    tone(f0, f1, dur, type, peak){
      const v = settings.sfx / 100;
      if(v <= 0) return;
      const ctx = ensureUiAudio();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(f0, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), ctx.currentTime + dur);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak * v, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur + 0.03);
    },
    seq(notes, type){   // [[freq, dur, peak, delayMs], ...]
      notes.forEach(n => setTimeout(() => window.AppFX.tone(n[0], n[0], n[1], type, n[2]), n[3]));
    }
  };
  window.AppReset = [];   // her oyun kendi sifirlama islevini buraya ekler

  const phoneEl = document.querySelector('.phone');
  function applyMotion(){ phoneEl.classList.toggle('reduced-motion', !!settings.reducedMotion); }

  let uiAudioCtx = null;
  function ensureUiAudio(){ if(!uiAudioCtx){ uiAudioCtx = new (window.AudioContext||window.webkitAudioContext)(); } if(uiAudioCtx.state === 'suspended'){ uiAudioCtx.resume(); } return uiAudioCtx; }
  function playPreviewTone(volumePercent){
    if(volumePercent <= 0) return;
    const ctx = ensureUiAudio();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    const peak = (volumePercent / 100) * 0.22;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.24);
  }

  // --- ses ---
  const sfxSlider = document.getElementById('sfxSlider'), sfxVal = document.getElementById('sfxVal');
  const musicSlider = document.getElementById('musicSlider'), musicVal = document.getElementById('musicVal');
  sfxSlider.value = settings.sfx; sfxVal.textContent = settings.sfx + '%';
  musicSlider.value = settings.music; musicVal.textContent = settings.music + '%';
  sfxSlider.addEventListener('input', () => { settings.sfx = Number(sfxSlider.value); sfxVal.textContent = settings.sfx + '%'; });
  sfxSlider.addEventListener('change', () => { saveSettings(); playPreviewTone(settings.sfx); });
  musicSlider.addEventListener('input', () => { settings.music = Number(musicSlider.value); musicVal.textContent = settings.music + '%'; });
  musicSlider.addEventListener('change', saveSettings);

  // --- anahtarlar ---
  function bindSwitch(el, key, onChange){
    el.setAttribute('aria-checked', settings[key] ? 'true' : 'false');
    el.addEventListener('click', () => {
      settings[key] = !settings[key];
      el.setAttribute('aria-checked', settings[key] ? 'true' : 'false');
      saveSettings();
      if(onChange) onChange();
    });
  }
  bindSwitch(document.getElementById('hapticsSwitch'), 'haptics', () => window.AppFX.vibrate(28));
  bindSwitch(document.getElementById('motionSwitch'), 'reducedMotion', applyMotion);
  applyMotion();

  // --- ilerlemeyi sifirla (iki adimli onay) ---
  const resetBtn = document.getElementById('resetBtn');
  let resetArmed = false, resetTimer = null;
  resetBtn.addEventListener('click', () => {
    if(!resetArmed){
      resetArmed = true;
      resetBtn.classList.add('confirm');
      resetBtn.textContent = 'Emin misin? Dokun ve sıfırla';
      resetTimer = setTimeout(() => {
        resetArmed = false; resetBtn.classList.remove('confirm'); resetBtn.textContent = 'İlerlemeyi Sıfırla';
      }, 4000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    Store.del('ait_progress');
    window.AppProgress = { unlocked: 1, best: 0, gold: 0, kacisHearts: {}, ssAcik: 1, ssYildiz: {}, ssJoker: null, ssoAcik: 1, ssoYildiz: {} };
    if(window.AppGold) window.AppGold.render();
    window.AppReset.forEach(fn => { try{ fn(); }catch(e){} });
    resetBtn.classList.remove('confirm');
    resetBtn.textContent = 'Sıfırlandı ✓';
    setTimeout(() => { resetBtn.textContent = 'İlerlemeyi Sıfırla'; }, 1600);
  });

  // --- ilerleme kaydi (oyun scriptleri bunu okur) ---
  window.AppProgress = Store.get('ait_progress', { unlocked: 1, best: 0, gold: 0, kacisHearts: {} });
  if(typeof window.AppProgress.gold !== 'number') window.AppProgress.gold = 0;
  if(!window.AppProgress.kacisHearts) window.AppProgress.kacisHearts = {};

  // --- ortak altin cuzdani (tum oyunlar ayni keseyi kullanir) ---
  window.CoinSVG = function(filled){
    return '<img src="img/jeton.png" alt="" style="opacity:' + (filled ? 1 : .28) + '">';
};
  window.AppGold = {
    get(){ return window.AppProgress.gold || 0; },
    add(n){
      window.AppProgress.gold = (window.AppProgress.gold || 0) + n;
      window.AppSaveProgress({ gold: window.AppProgress.gold });
      window.AppGold.render();
      return window.AppProgress.gold;
    },
    harca(n){
      if(n < 0) return false;
      if((window.AppProgress.gold || 0) < n) return false;
      window.AppProgress.gold -= n;
      window.AppSaveProgress({ gold: window.AppProgress.gold });
      window.AppGold.render();
      return true;
    },
    render(){
      const html = window.CoinSVG(true) + '<span>' + window.AppGold.get() + '</span>';
      ['goldPillHome','goldPillMap','goldPillMode','goldPillOzel','goldPillBoards','goldPill2048','goldPillTempo','goldPillLevel','goldPillSsMode','goldPillSsHarita','goldPillSsOyun',
       'goldPillSsoHarita','goldPillSsoOyun','goldPillMarket'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = html;
      });
    }
  };
  window.AppSaveProgress = function(patch){
    Object.assign(window.AppProgress, patch);
    Store.set('ait_progress', window.AppProgress);
  };
  setTimeout(function(){ if(window.AppGold) window.AppGold.render(); }, 0);

  // --- hakkinda ---
  document.getElementById('privacyBtn').addEventListener('click', () => {
    const n = document.getElementById('privacyNote');
    n.style.display = n.style.display === 'none' ? 'block' : 'none';
  });
// --- GEÇİCİ: masaüstü kaydırma yardımcısı ---
(() => {
  const kaydir = document.querySelector('.games-scroll');
  if (!kaydir) { console.warn('.games-scroll bulunamadi'); return; }

  // Bir kart + aradaki boşluk kadar kaydır
  const adim = () => {
    const kart = kaydir.firstElementChild;
    if (!kart) return 200;
    const bosluk = parseFloat(getComputedStyle(kaydir).gap) || 0;
    return kart.getBoundingClientRect().width + bosluk;
  };

  // Fare tekerleği -> yatay kaydırma
  kaydir.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      kaydir.scrollBy({ left: Math.sign(e.deltaY) * adim(), behavior: 'smooth' });
    }
  }, { passive: false });

  // Sağ / sol ok tuşları
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') kaydir.scrollBy({ left:  adim(), behavior: 'smooth' });
    if (e.key === 'ArrowLeft')  kaydir.scrollBy({ left: -adim(), behavior: 'smooth' });
  });
})();

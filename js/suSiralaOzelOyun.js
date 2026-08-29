/* ============================================================
   SIRALA DUR — ÖZEL BÖLÜMLER, OYUN KATMANI
   js/suSiralaOzelOyun.js

   Yükleme sırası:
     suSirala.js -> suSiralaOzel.js -> suSiralaOzelBolumler.js
     -> suSiralaOyun.js -> suSiralaOzelOyun.js

   Ana moddaki suSiralaOyun.js'e DOKUNMAZ. Renkler
   SuSiralaOzel.RENK_HEX'ten gelir (indeksler anlamlı).

   Ekran yapısı:
     üst sıra  = normal şişeler   (#ssoSiseler)
     alt sıra  = erlenmayerler    (#ssoKaplar)  + "Karıştır" butonu
   ============================================================ */

(function (global) {
  'use strict';

  var TOPLAM_OZEL = 100;

  /* Dokme animasyon sureleri (ms), aktarilan blok sayisina gore */
  var SURE = { 1: 600, 2: 800, 3: 1000, 4: 1000, 5: 1200, 6: 1300 };

  /* Karistirma animasyonu asamalari (ms) */
  var BAGET_IN = 220, BAGET_KARIS = 780, BAGET_OUT = 200;

  var KONFETI = ['#A78BFA', '#7F6BE8', '#C9A6FF', '#7FD8E6', '#E9D8FF', '#8B5FD6', '#FBE7AE'];

  /* --- erlenmayer olculeri (px, SVG 1:1) --- */
  var KAP_TABAN = 62;     /* dip genisligi */
  var KAP_BOYUN = 20;     /* boyun genisligi */
  var KAP_BOYUN_Y = 26;   /* boyun yuksekligi */
  var KAP_PAY = 6;        /* SVG kenar payi */
  var KAP_DIP_R = 7;      /* dip kose yuvarlakligi */

  var oyun = null;
  var secili = -1;
  var akanSayisi = 0;
  var doken = {};
  var dolan = {};
  var karistiran = {};       /* o an bagetle karistirilan kaplar */
  var kutlanan = {};         /* konfetisi patlamis siseler (sadece normal sise, erlenmayer degil) */
  var katmanY = 28;          /* normal sise katman yuksekligi */
  var sonKazanilan = 0;
  var ogretimKilidi = false; /* tanitim yazisi / diyagram acikken tahta kilitli */
  var ogretimGorulen = {};   /* hangi tanitimlar zorunlu gosterildi */

  /* ---------- Kisayollar ---------- */

  function $(id) { return document.getElementById(id); }

  function el(etiket, sinif, ana) {
    var d = document.createElement(etiket);
    if (sinif) d.className = sinif;
    if (ana) ana.appendChild(d);
    return d;
  }

  function O() { return global.SuSiralaOzel; }

  function renkHex(r) {
    var h = O().RENK_HEX;
    return h[r] || h[h.length - 1];
  }

  function kisikHareket() {
    return !!document.querySelector('.phone.reduced-motion');
  }

  /* ============================================================
     SES — cam ve sivi temali. Kacis'taki tek tonlu bipler yerine
     katmanli sesler: her cagri hafifce farkli calsin diye tum
     perdelere kucuk rastgele sapma bindiriliyor, boylece art arda
     gelen dokumler ayni kaydin tekrari gibi duyulmuyor.
     ============================================================ */

  function T(f0, f1, sure, tip, guc, gecikme) {
    if (!global.AppFX) return;
    var sap = 1 + (Math.random() - 0.5) * 0.06;      /* ±%3 perde sapmasi */
    setTimeout(function () {
      global.AppFX.tone(f0 * sap, f1 * sap, sure, tip, guc);
    }, gecikme || 0);
  }

  /* Cam tokusu: cok kisa, yuksek, hizla sonen ust ton */
  function tinla(temel, guc, gecikme) {
    T(temel, temel * 0.985, 0.16, 'triangle', guc, gecikme);
    T(temel * 2.02, temel * 1.99, 0.10, 'sine', guc * 0.5, (gecikme || 0) + 8);
  }

  function ses(tur, oran) {
    if (!global.AppFX) return;

    if (tur === 'dok') {
      /* Kap doldukca perde yukselir — sise doldurma sesi boyle davranir */
      var t = 250 + (typeof oran === 'number' ? oran : 0.4) * 190;
      T(t, t * 1.5, 0.13, 'sine', 0.15);
      T(t * 0.5, t * 0.62, 0.17, 'sine', 0.07, 12);   /* alt govde */
      T(t * 3.1, t * 2.6, 0.06, 'sine', 0.035, 26);   /* damla ucu */

    } else if (tur === 'karistirBasla') {
      tinla(1180, 0.10);                              /* baget cama degdi */
      T(300, 340, 0.30, 'sine', 0.05, 40);

    } else if (tur === 'karistir') {
      /* Girdap: birbirini kovalayan iki ton, ustune hafif cam tokusu */
      T(360, 470, 0.34, 'sine', 0.085);
      T(452, 356, 0.34, 'sine', 0.065, 90);
      T(368, 486, 0.30, 'sine', 0.075, 200);
      tinla(1320, 0.055, 150);
      tinla(1105, 0.05, 330);

    } else if (tur === 'olustu') {
      /* Hedef renk kapta olustu: parlak yukselen ucluu + isilti */
      T(523, 528, 0.16, 'triangle', 0.15);
      T(784, 790, 0.16, 'triangle', 0.15, 85);
      T(1046, 1052, 0.30, 'triangle', 0.14, 170);
      tinla(1568, 0.07, 200);

    } else if (tur === 'tamam') {
      T(659, 665, 0.14, 'triangle', 0.14);
      T(988, 994, 0.26, 'triangle', 0.13, 90);
      tinla(1976, 0.05, 120);

    } else if (tur === 'camur') {
      /* Cokme: derin kayan ton + akortsuz ikinci ses */
      T(190, 62, 0.55, 'sawtooth', 0.15);
      T(203, 68, 0.52, 'square', 0.055, 30);
      T(96, 44, 0.60, 'sine', 0.11, 70);
      global.AppFX.vibrate([40, 60, 90]);

    } else if (tur === 'hata') {
      T(210, 150, 0.09, 'square', 0.10);
      T(160, 112, 0.13, 'square', 0.09, 70);
      global.AppFX.vibrate(28);

    } else if (tur === 'kazan') {
      var nota = [523, 659, 784, 1046, 1318];
      for (var i = 0; i < nota.length; i++) {
        T(nota[i], nota[i] * 1.004, i === 4 ? 0.46 : 0.15, 'triangle', 0.15, i * 105);
        T(nota[i] / 2, nota[i] / 2, i === 4 ? 0.40 : 0.14, 'sine', 0.06, i * 105);
      }
      tinla(2093, 0.06, 470);
      tinla(2637, 0.05, 620);
    }
  }

  function ilerleme() {
    var p = global.AppProgress || {};
    if (typeof p.ssoAcik !== 'number') p.ssoAcik = 1;
    if (!p.ssoYildiz) p.ssoYildiz = {};
    return p;
  }

  function ilerlemeKaydet(yama) {
    if (typeof global.AppSaveProgress === 'function') global.AppSaveProgress(yama);
  }

  function konfetiPatlat(kapsayici, x, y, adet, gucCarpani, konik) {
    if (!kapsayici) return;
    adet = kisikHareket() ? Math.round((adet || 18) / 3) : (adet || 18);
    var guc = gucCarpani || 1;
    for (var i = 0; i < adet; i++) {
      var p = el('i', 'ss-konfeti', kapsayici);
      /* konik: yukari dogru dar bir yelpaze (-150° .. -30°) */
      var aci = konik ? (-150 + Math.random() * 120) * Math.PI / 180
                      : Math.random() * Math.PI * 2;
      var mesafe = (36 + Math.random() * 74) * guc;
      var boy = konik ? .68 : 1;
      p.style.background = KONFETI[Math.floor(Math.random() * KONFETI.length)];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = ((4 + Math.random() * 5) * boy).toFixed(1) + 'px';
      p.style.height = ((6 + Math.random() * 7) * boy).toFixed(1) + 'px';
      p.style.setProperty('--dx', (Math.cos(aci) * mesafe).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(aci) * mesafe + 70 * guc).toFixed(1) + 'px');
      p.style.setProperty('--spin', Math.round(Math.random() * 900 - 450) + 'deg');
      p.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
      (function (nokta) {
        setTimeout(function () { if (nokta.parentNode) nokta.parentNode.removeChild(nokta); }, 1500);
      })(p);
    }
  }

  function mesajGoster(metin) {
    var m = $('ssoMesaj');
    if (!m) return;
    m.textContent = metin || '';
    m.classList.toggle('show', !!metin);
    if (metin) {
      clearTimeout(mesajGoster._z);
      mesajGoster._z = setTimeout(function () { m.classList.remove('show'); }, 2600);
    }
  }

  /* ============================================================
     1) BOLUM HARITASI — ozel bolumler icin sade izgara
     ============================================================ */

  function haritaCiz() {
    var ic = $('ssoHaritaIzgara');
    if (!ic) return;
    var p = ilerleme();
    var acik = p.ssoAcik || 1;
    ic.innerHTML = '';

    for (var n = 1; n <= TOPLAM_OZEL; n++) {
      var acikMi = n <= acik;
      var yildiz = p.ssoYildiz[n] || 0;

      var h = el('button', 'sso-node' + (acikMi ? '' : ' kilitli'), ic);
      h.disabled = !acikMi;

      var no = el('span', 'sso-node-no', h);
      no.textContent = acikMi ? n : '';
      if (!acikMi) {
        no.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="3" y="11" width="18" height="10" rx="2"/>' +
          '<path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      }

      var ys = el('span', 'sso-node-yildiz', h);
      var m = '';
      if (yildiz > 0) {
        for (var z = 0; z < 3; z++) m += (z < yildiz ? '★' : '☆');
      }
      ys.textContent = m;

      if (n === sonKazanilan && acikMi) h.classList.add('sso-node-yeni');
      if (acikMi) {
        (function (bn) { h.addEventListener('click', function () { bolumBaslat(bn); }); })(n);
      }
    }

    if (sonKazanilan) {
      var hedefDugum = ic.children[sonKazanilan - 1];
      if (hedefDugum) {
        hedefDugum.scrollIntoView({ block: 'center' });
        /* konfeti kendi katmanina — izgara hucresi olmasin diye absolute */
        var kat = el('div', 'sso-konfeti-kat', ic);
        (function (dugum, katman) {
          setTimeout(function () {
            var r = dugum.getBoundingClientRect(), ir = ic.getBoundingClientRect();
            konfetiPatlat(katman,
                          r.left - ir.left + r.width / 2,
                          r.top - ir.top + r.height / 2,
                          14, .85, true);
            setTimeout(function () {
              if (katman.parentNode) katman.parentNode.removeChild(katman);
              dugum.classList.remove('sso-node-yeni');
            }, 1500);
          }, 360);
        })(hedefDugum, kat);
      }
      sonKazanilan = 0;
    }
    if (global.AppGold) global.AppGold.render();
  }

  /* ============================================================
     2) OYUN EKRANI
     ============================================================ */

  function bolumBaslat(bolumNo) {
    if (!O()) { mesajGoster('Özel bölüm modülü yüklenmedi'); return; }
    if (!global.SuSiralaOzelBolumler) {
      console.warn('[ozel] suSiralaOzelBolumler.js yok — yedek tohum kullanılıyor, ' +
                   'bölüm çözülemeyebilir.');
    }
    oyun = O().OzelOyunOlustur(bolumNo);
    sifirlaDurum();

    var baslik = $('ssoLevelTitle');
    if (baslik) baslik.textContent = 'Özel ' + bolumNo;

    var sonuc = $('ssoSonuc');
    if (sonuc) sonuc.classList.remove('show');

    tahtaKur();
    barYenile();

    if (global.slideForward) global.slideForward('ssoHarita', 'ssoOyun');
    if (global.AppGold) global.AppGold.render();
    acilisAkisi(bolumNo);
  }

  /* Tanitim yazisi -> (1. bolumde) zorunlu diyagram */
  function acilisAkisi(bolumNo) {
    ogretimKilidi = true;
    karistirButonlariYenile();
    setTimeout(function () {
      tanitimGoster(bolumNo, function () {
        var tanitim = oyun.bolum.profil && oyun.bolum.profil.tanitim;
        var ilkKez = !ogretimGorulen[tanitim];
        if (tanitim && ilkKez) {
          ogretimGorulen[tanitim] = true;
          diyagramAc(true, null);
        } else {
          ogretimKilidi = false;
          karistirButonlariYenile();
          barYenile();
        }
      });
    }, 420);                       /* ekran kaymasi bitsin */
  }

  function bolumBaslat2(bolumNo) {
    oyun = O().OzelOyunOlustur(bolumNo);
    sifirlaDurum();
    var baslik = $('ssoLevelTitle');
    if (baslik) baslik.textContent = 'Özel ' + bolumNo;
    tahtaKur();
    barYenile();
    acilisAkisi(bolumNo);
  }

  function sifirlaDurum() {
    secili = -1;
    doken = {}; dolan = {}; karistiran = {}; kutlanan = {};
    akanSayisi = 0;
  }

  /* Tahtanin tamaminin bekledigi durumlar (geri al / bastan basla) */
  function mesgul() {
    if (akanSayisi > 0) return true;
    for (var k in karistiran) if (karistiran[k]) return true;
    return false;
  }

  /* SADECE o kap mesgul mu — birden fazla kap ayni anda karistirilabilsin */
  function kapMesgul(i) {
    return !!(karistiran[i] || dolan[i] || doken[i]);
  }

  /* ---------- tahta ---------- */

  function tahtaKur() {
    var siseKutu = $('ssoSiseler'), kapKutu = $('ssoKaplar');
    if (!siseKutu || !kapKutu) return;
    siseKutu.innerHTML = '';
    kapKutu.innerHTML = '';
    kutlanan = {};

    var d = oyun.durum;

    /* normal sise indeksleri ve erlenmayer indeksleri ayri */
    var siseler = [], kaplar = [];
    for (var i = 0; i < d.tupler.length; i++) {
      (d.kapMi[i] ? kaplar : siseler).push(i);
    }

    var n = siseler.length;
    katmanY = n > 12 ? 21 : (n > 9 ? 24 : 28);
    var genislik = n > 12 ? 30 : (n > 9 ? 34 : 40);
    siseKutu.style.setProperty('--ss-tup-w', genislik + 'px');
    if (global.AppMarket && global.AppMarket.siseTemasiUygula) global.AppMarket.siseTemasiUygula(siseKutu);

    var enBuyuk = 1;
    for (var s = 0; s < siseler.length; s++) {
      if (d.kaplar[siseler[s]] > enBuyuk) enBuyuk = d.kaplar[siseler[s]];
    }

    for (var a = 0; a < siseler.length; a++) {
      var idx = siseler[a];
      var yuva = el('div', 'ss-yuva', siseKutu);
      yuva.style.height = (enBuyuk * katmanY + 12) + 'px';

      var tup = el('div', 'ss-tup', yuva);
      tup.dataset.i = idx;
      tup.style.height = (d.kaplar[idx] * katmanY + 6) + 'px';
      (function (j) {
        tup.addEventListener('click', function () { tiklandi(j); });
      })(idx);
      var kapak = el('div', 'ss-kapak', yuva);
kapak.style.bottom = tup.offsetHeight + 'px';
kapak.innerHTML = (global.AppMarket && global.AppMarket.siseKapakSvg ? global.AppMarket.siseKapakSvg() : '');
      sivilariCiz(tup, idx);
    }

    for (var b = 0; b < kaplar.length; b++) {
      kapHucresiKur(kapKutu, kaplar[b]);
    }

    hedefPaneliYenile();
    isaretleriYenile();
  }

  function sivilariCiz(tup, i) {
    var d = oyun.durum;
    tup.innerHTML = '';
    for (var k = 0; k < d.tupler[i].length; k++) {
      var s = el('div', 'ss-sivi', tup);
      s.style.height = katmanY + 'px';
      s.style.setProperty('--ss-renk', renkHex(d.tupler[i][k]));
    }
  }

  function tupElemani(i) {
    return document.querySelector('#ssoSiseler .ss-tup[data-i="' + i + '"]');
  }

  function kapElemani(i) {
    return document.querySelector('#ssoKaplar .sso-kap[data-i="' + i + '"]');
  }

  function parcaElemani(i) {
    return oyun.durum.kapMi[i] ? kapElemani(i) : tupElemani(i);
  }

  /* ============================================================
     3) ERLENMAYER
     Katmanlar esit YUKSEKLIK degil esit ALAN kaplar: konide
     dipteki birim genis oldugu icin daha az dikey yer tutar.

     Genislik(y) = W + (nw - W) * y / H          (y: dipten yukseklik)
     Alan(0..h)  = W*h + (nw - W) * h^2 / (2H)
     Alan(0..h_k) = k/N * ToplamAlan  ->  h_k ikinci derece denklemden
     ============================================================ */

  function kapOlculeri(kapasite) {
    var H = 44 + kapasite * 6;                 /* konik govde yuksekligi */
    var toplamY = H + KAP_BOYUN_Y + KAP_PAY;
    var vbW = KAP_TABAN + KAP_PAY * 2;
    return {
      H: H, W: KAP_TABAN, nw: KAP_BOYUN,
      boyunY: KAP_BOYUN_Y,
      vbW: vbW, vbH: toplamY,
      cx: vbW / 2,
      yb: toplamY - 2,                          /* dip cizgisi */
      yt: toplamY - 2 - H,                      /* govde ust cizgisi (boyun dibi) */
      yn: toplamY - 2 - H - KAP_BOYUN_Y         /* agiz */
    };
  }

  /* h[k] = k birim sivinin ust yuzeyinin dipten yuksekligi */
  function katmanSinirlari(kapasite, W, nw, H) {
    var a = (nw - W) / (2 * H);
    var toplamAlan = H * (W + nw) / 2;
    var h = [0];
    for (var k = 1; k <= kapasite; k++) {
      var hedefAlan = toplamAlan * k / kapasite;
      var y;
      if (Math.abs(a) < 1e-9) {
        y = hedefAlan / W;
      } else {
        var disc = W * W + 4 * a * hedefAlan;
        if (disc < 0) disc = 0;
        y = (-W + Math.sqrt(disc)) / (2 * a);
      }
      h.push(y);
    }
    return h;
  }

  function genislikte(y, W, nw, H) {
    return W + (nw - W) * (y / H);
  }

  function kapHucresiKur(ana, i) {
    var hucre = el('div', 'sso-kap-hucre', ana);

    var kap = el('div', 'sso-kap', hucre);
    kap.dataset.i = i;
    (function (j) {
      kap.addEventListener('click', function () { tiklandi(j); });
    })(i);

    kapCiz(kap, i);

    var btn = el('button', 'sso-karistir', hucre);
    btn.dataset.i = i;
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round"><path d="M17 3 8.5 16.5"/>' +
      '<path d="M9.5 14.5 6 21l6.5-3.2"/></svg><span>Karıştır</span>';
    (function (j) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); karistirTiklandi(j); });
    })(i);

    return hucre;
  }

  function kapCiz(kap, i) {
    var d = oyun.durum;
    var kapasite = d.kaplar[i];
    var icerik = d.tupler[i];
    var m = kapOlculeri(kapasite);
    var h = katmanSinirlari(kapasite, m.W, m.nw, m.H);
    var ns = 'http://www.w3.org/2000/svg';
    var clipId = 'ssoClip' + i;

    var p = [];
    p.push('M ' + (m.cx - m.nw / 2) + ' ' + m.yt);
    p.push('L ' + (m.cx - m.W / 2) + ' ' + (m.yb - KAP_DIP_R));
    p.push('Q ' + (m.cx - m.W / 2) + ' ' + m.yb + ' ' + (m.cx - m.W / 2 + KAP_DIP_R) + ' ' + m.yb);
    p.push('L ' + (m.cx + m.W / 2 - KAP_DIP_R) + ' ' + m.yb);
    p.push('Q ' + (m.cx + m.W / 2) + ' ' + m.yb + ' ' + (m.cx + m.W / 2) + ' ' + (m.yb - KAP_DIP_R));
    p.push('L ' + (m.cx + m.nw / 2) + ' ' + m.yt);
    var govdePath = p.join(' ') + ' Z';

    /* cam siluet: agizdan asagi, govde, tekrar yukari */
    var c = [];
    c.push('M ' + (m.cx - m.nw / 2 - 3.5) + ' ' + m.yn);
    c.push('L ' + (m.cx - m.nw / 2) + ' ' + (m.yn + 6));
    c.push('L ' + (m.cx - m.nw / 2) + ' ' + m.yt);
    c.push('L ' + (m.cx - m.W / 2) + ' ' + (m.yb - KAP_DIP_R));
    c.push('Q ' + (m.cx - m.W / 2) + ' ' + m.yb + ' ' + (m.cx - m.W / 2 + KAP_DIP_R) + ' ' + m.yb);
    c.push('L ' + (m.cx + m.W / 2 - KAP_DIP_R) + ' ' + m.yb);
    c.push('Q ' + (m.cx + m.W / 2) + ' ' + m.yb + ' ' + (m.cx + m.W / 2) + ' ' + (m.yb - KAP_DIP_R));
    c.push('L ' + (m.cx + m.nw / 2) + ' ' + m.yt);
    c.push('L ' + (m.cx + m.nw / 2) + ' ' + (m.yn + 6));
    c.push('L ' + (m.cx + m.nw / 2 + 3.5) + ' ' + m.yn);
    var camPath = c.join(' ');

    var katmanlar = '';
    for (var k = 0; k < icerik.length && k < kapasite; k++) {
      var y1 = m.yb - h[k], y2 = m.yb - h[k + 1];
      var w1 = genislikte(h[k], m.W, m.nw, m.H);
      var w2 = genislikte(h[k + 1], m.W, m.nw, m.H);
      if (k === 0) { y1 += 4; w1 += 2; }          /* dip yuvarlagini tasir, clip keser */
      katmanlar +=
        '<polygon class="sso-katman" points="' +
        (m.cx - w1 / 2).toFixed(1) + ',' + y1.toFixed(1) + ' ' +
        (m.cx + w1 / 2).toFixed(1) + ',' + y1.toFixed(1) + ' ' +
        (m.cx + w2 / 2).toFixed(1) + ',' + y2.toFixed(1) + ' ' +
        (m.cx - w2 / 2).toFixed(1) + ',' + y2.toFixed(1) +
        '" fill="' + renkHex(icerik[k]) + '"/>';
    }

    /* en ust sivinin yuzey parlakligi */
    if (icerik.length) {
      var hy = h[Math.min(icerik.length, kapasite)];
      var hw = genislikte(hy, m.W, m.nw, m.H);
      katmanlar += '<rect class="sso-yuzey" x="' + (m.cx - hw / 2).toFixed(1) + '" y="' +
        (m.yb - hy).toFixed(1) + '" width="' + hw.toFixed(1) + '" height="2.5" fill="#FFFFFF"/>';
    }

    kap.style.width = m.vbW + 'px';
    kap.style.height = m.vbH + 'px';
    kap.innerHTML =
      '<svg class="sso-kap-svg" viewBox="0 0 ' + m.vbW + ' ' + m.vbH + '" ' +
      'width="' + m.vbW + '" height="' + m.vbH + '" xmlns="' + ns + '">' +
      '<defs><clipPath id="' + clipId + '"><path d="' + govdePath + '"/></clipPath></defs>' +
      '<path class="sso-cam-dolgu" d="' + govdePath + '"/>' +
      '<g class="sso-sivilar" clip-path="url(#' + clipId + ')">' + katmanlar + '</g>' +
      '<path class="sso-cam" d="' + camPath + '" fill="none"/>' +
      '<line class="sso-parlama" x1="' + (m.cx - m.W * 0.26).toFixed(1) + '" y1="' + (m.yb - 8) +
        '" x2="' + (m.cx - m.nw * 0.30).toFixed(1) + '" y2="' + (m.yt + 4) + '"/>' +
      '</svg>' +
      '<div class="sso-baget"><i></i></div>';

    /* ölçüleri animasyonlar için sakla */
    kap._olcu = m;
    kap._sinir = h;
  }

  /* Bir kabin sivi yuzeyinin SAYFA koordinatindaki y degeri */
  function kapYuzeyY(i, doluKatman) {
    var kap = kapElemani(i);
    if (!kap || !kap._olcu) return 0;
    var r = kap.getBoundingClientRect();
    var h = kap._sinir[Math.min(doluKatman, kap._sinir.length - 1)];
    return r.top + (kap._olcu.yb - h);
  }

  function kapAgizY(i) {
    var kap = kapElemani(i);
    if (!kap || !kap._olcu) return 0;
    return kap.getBoundingClientRect().top + kap._olcu.yn;
  }

  /* ============================================================
     4) HEDEF PANELI
     ============================================================ */

  function hedefPaneliYenile() {
    var kutu = $('ssoHedefler');
    if (!kutu) return;
    var d = oyun.durum;
    kutu.innerHTML = '';

    /* hangi hedefler su an bir kapta saf ve tam adette? */
    var tamam = d.hedefler.map(function () { return false; });
    for (var i = 0; i < d.tupler.length; i++) {
      if (!d.kapMi[i]) continue;
      var t = d.tupler[i];
      if (!t.length) continue;
      var saf = true;
      for (var j = 1; j < t.length; j++) if (t[j] !== t[0]) { saf = false; break; }
      if (!saf) continue;
      for (var k = 0; k < d.hedefler.length; k++) {
        if (!tamam[k] && d.hedefler[k].renk === t[0] && d.hedefler[k].adet === t.length) {
          tamam[k] = true; break;
        }
      }
    }

    for (var h = 0; h < d.hedefler.length; h++) {
      var rozet = el('div', 'sso-hedef' + (tamam[h] ? ' tamam' : ''), kutu);
      var nokta = el('i', 'sso-hedef-renk', rozet);
      nokta.style.background = renkHex(d.hedefler[h].renk);
      var yazi = el('span', null, rozet);
      yazi.textContent = d.hedefler[h].adet + '× ' + O().RENK_AD[d.hedefler[h].renk];
    }
  }

  /* Tanitim yazisi rozetlere dogru kuculdukten sonra rozetler nabiz atsin */
  function hedefleriParlat() {
    var kutu = $('ssoHedefler');
    if (!kutu) return;
    kutu.classList.remove('dikkat');
    void kutu.offsetWidth;
    kutu.classList.add('dikkat');
    setTimeout(function () { kutu.classList.remove('dikkat'); }, 2600);
  }

  /* ============================================================
     TANITIM YAZISI — "Yesil Yilani Kurtar" esdegeri
     Ekranin ortasinda belirir, sonra hedef rozetlerinin uzerine
     dogru kuculerek kaybolur; rozetler nabiz atmaya baslar.
     ============================================================ */

  function tanitimGoster(bolumNo, bitince) {
    var ekran = $('screen-susirala-ozeloyun');
    var hedefKutu = $('ssoHedefler');
    if (!ekran || !hedefKutu) { if (bitince) bitince(); return; }

    var d = oyun.durum;
    var istek = d.hedefler.map(function (h) {
      return h.adet + ' ' + O().RENK_AD[h.renk].toLowerCase();
    }).join(' ve ');

    var perde = el('div', 'sso-tanitim', ekran);
    perde.style.pointerEvents = 'auto';        /* GECICI: tiklayinca atlansin */
    var kart = el('div', 'sso-tanitim-kart', perde);
    var ust = el('div', 'sso-tanitim-ust', kart);
    ust.textContent = 'Bölüm ' + bolumNo;
    var ana = el('div', 'sso-tanitim-ana', kart);
    ana.textContent = istek + ' hazırla';
    var alt = el('div', 'sso-tanitim-alt', kart);
    var tanitim = oyun.bolum.profil && oyun.bolum.profil.tanitim;
    alt.textContent = (tanitim === 'kirli')
      ? 'Dikkat: gri, kahverengi ve siyah erlenmayerde çamura döner'
      : 'Ham renkleri erlenmayere dök, cam bagetle karıştır';

    var kisik = kisikHareket();
    var bekle = kisik ? 500 : 1500;

    /* GECICI: bekleme suresini beklemeden tiklayarak gecebilmek icin.
       Kaldirirken bu blogu ve yukaridaki pointerEvents satirini sil. */
    var zaman = null, gitti = false;
    function kapat() {
      if (gitti) return;
      gitti = true;
      clearTimeout(zaman);
      kucul();
    }
    perde.addEventListener('click', kapat);
    zaman = setTimeout(kapat, bekle);

    function kucul() {
      /* kart, hedef rozetlerinin bulundugu noktaya dogru kuculsun */
      var kr = kart.getBoundingClientRect();
      var hr = hedefKutu.getBoundingClientRect();
      var dx = (hr.left + hr.width / 2) - (kr.left + kr.width / 2);
      var dy = (hr.top + hr.height / 2) - (kr.top + kr.height / 2);
      kart.style.transition = 'transform ' + (kisik ? 120 : 520) +
                              'ms cubic-bezier(.5,.05,.35,1), opacity ' +
                              (kisik ? 120 : 520) + 'ms ease-in';
      kart.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) +
                             'px) scale(.18)';
      kart.style.opacity = '0';
      setTimeout(function () {
        if (perde.parentNode) perde.parentNode.removeChild(perde);
        hedefleriParlat();
        if (bitince) bitince();
      }, kisik ? 130 : 540);
    }
  }


  /* ============================================================
     RENK KARISIM DIYAGRAMI
     Her bolumde ust bardaki dugmeden acilir. 1. bolumde oyuncu
     kapatana kadar tahta kilitli kalir.
     ============================================================ */

  var CIFTLER = [[0, 1, 3], [1, 2, 4], [0, 2, 5]];   /* [ham, ham, sonuc] */

  function diyagramSvg() {
    var R = renkHex, AD = O().RENK_AD, KIRLI = O().KIRLI;
    var g = '', y = 30;

    /* --- 1) ikili karisimlar --- */
    g += '<text class="sso-dg-bolum" x="14" y="' + y + '">Karışımlar</text>';
    y += 26;
    for (var i = 0; i < CIFTLER.length; i++) {
      var c = CIFTLER[i];
      g += '<circle cx="34" cy="' + y + '" r="16" fill="' + R(c[0]) + '"/>' +
           '<text class="sso-dg-op" x="64" y="' + (y + 6) + '">+</text>' +
           '<circle cx="94" cy="' + y + '" r="16" fill="' + R(c[1]) + '"/>' +
           '<text class="sso-dg-op" x="124" y="' + (y + 6) + '">=</text>' +
           '<circle cx="156" cy="' + y + '" r="18" fill="' + R(c[2]) + '"/>' +
           '<text class="sso-dg-ad" x="182" y="' + (y + 5) + '">' + AD[c[2]] + '</text>';
      y += 46;
    }

    /* --- 2) uc ham renk = camur --- */
    y += 6;
    g += '<line class="sso-dg-ayrac" x1="14" y1="' + (y - 16) + '" x2="272" y2="' + (y - 16) + '"/>';
    g += '<text class="sso-dg-bolum uyari" x="14" y="' + (y + 8) + '">Çamur</text>';
    y += 34;
    g += '<circle cx="26" cy="' + y + '" r="13" fill="' + R(0) + '"/>' +
         '<circle cx="54" cy="' + y + '" r="13" fill="' + R(1) + '"/>' +
         '<circle cx="82" cy="' + y + '" r="13" fill="' + R(2) + '"/>' +
         '<text class="sso-dg-op" x="110" y="' + (y + 6) + '">=</text>' +
         '<circle cx="142" cy="' + y + '" r="18" fill="' + R(6) + '"/>' +
         '<text class="sso-dg-ad camur" x="168" y="' + (y + 5) + '">Çamur</text>';
    y += 44;

    /* --- 3) kirli renkler: kaba girerse her sey camur --- */
    var kutu = '';
    for (var k = 0; k < KIRLI.length; k++) {
      kutu += '<circle cx="' + (26 + k * 28) + '" cy="' + y + '" r="13" fill="' +
              R(KIRLI[k]) + '" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>';
    }
    g += kutu +
         '<text class="sso-dg-op" x="110" y="' + (y + 6) + '">=</text>' +
         '<circle cx="142" cy="' + y + '" r="18" fill="' + R(6) + '"/>' +
         '<text class="sso-dg-ad camur" x="168" y="' + (y + 5) + '">Her zaman</text>';
    y += 28;

    return '<svg class="sso-dg-svg" viewBox="0 0 286 ' + y + '" width="286" ' +
           'height="' + y + '" xmlns="http://www.w3.org/2000/svg">' + g + '</svg>';
  }

  function diyagramAc(zorunlu, kapaninca) {
    var ekran = $('screen-susirala-ozeloyun');
    if (!ekran) { if (kapaninca) kapaninca(); return; }
    if (ekran.querySelector('.sso-diyagram')) return;

    ogretimKilidi = true;
    karistirButonlariYenile();

    var perde = el('div', 'sso-diyagram', ekran);
    var kart = el('div', 'sso-dg-kart', perde);

    var baslik = el('div', 'sso-dg-baslik', kart);
    baslik.textContent = 'Renkler nasıl karışır';

    var govde = el('div', 'sso-dg-govde', kart);
    govde.innerHTML = diyagramSvg();

    var not = el('div', 'sso-dg-not', kart);
    not.innerHTML =
      'Gri, kahverengi ve siyah hiçbir şeyle karışmaz. Erlenmayere girip ' +
      'karıştırılırsa kap anında çamur olur. Onları kendi şişelerinde topla.' +
      '<br><b>Erlenmayerden geri dökemezsin.</b>';

    var kapat = el('button', 'sso-dg-btn', kart);
    kapat.textContent = zorunlu ? 'Anladım' : 'Kapat';
    kapat.addEventListener('click', function () {
      document.removeEventListener('keydown', tusla);
      if (perde.parentNode) perde.parentNode.removeChild(perde);
      ogretimKilidi = false;
      karistirButonlariYenile();
      barYenile();
      if (kapaninca) kapaninca();
    });

    /* Perdenin bos alanina tiklayinca kapansin (zorunlu modda da) */
    perde.addEventListener('click', function (e) {
      if (e.target === perde) kapat.click();
    });

    /* PC testi: Esc / Enter / Space ile kapansin */
    function tusla(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        kapat.click();
      }
    }
    document.addEventListener('keydown', tusla);
  }

  /* ============================================================
     5) ISARETLER VE UST BAR
     ============================================================ */

  function isaretleriYenile() {
    var d = oyun.durum;
    for (var i = 0; i < d.tupler.length; i++) {
      var e = parcaElemani(i);
      if (!e) continue;
      e.classList.toggle('ss-secili', i === secili && !d.kapMi[i]);
      e.classList.toggle('sso-secili', i === secili && d.kapMi[i]);
      if (!d.kapMi[i]) {
        var saf = d.tupler[i].length > 0 && tekRenk(d.tupler[i]);
        e.classList.toggle('ss-tamam', saf && d.tupler[i].length === d.kaplar[i]);
      }
    }
    karistirButonlariYenile();
  }

  function tekRenk(t) {
    for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false;
    return t.length > 0;
  }

  function karistirButonlariYenile() {
    var btnler = document.querySelectorAll('#ssoKaplar .sso-karistir');
    for (var i = 0; i < btnler.length; i++) {
      var idx = parseInt(btnler[i].dataset.i, 10);
      var acik = !kapMesgul(idx) && !ogretimKilidi &&
                 !oyun.kazandiMi() && oyun.karistirilabilirMi(idx);
      btnler[i].disabled = !acik;
      btnler[i].classList.toggle('hazir', acik);
    }
  }

  function barYenile() {
    var hamle = $('ssoHamle');
    if (hamle) hamle.textContent = oyun.hamleSayisi;
    var hedef = $('ssoHedefHamle');
    if (hedef) hedef.textContent = oyun.bolum.yildizButce.uc;

    var dg = $('ssoDiyagramBtn');
    if (dg) dg.addEventListener('click', function () {
      if (!oyun) return;
      diyagramAc(false, null);
    });

    var geri = $('ssoGeriBtn');
    if (geri) geri.disabled = mesgul() || !oyun.gecmis.length;
    var bastan = $('ssoBastanBtn');
    if (bastan) bastan.disabled = mesgul();
    karistirButonlariYenile();
  }

  /* ============================================================
     6) ETKILESIM
     ============================================================ */

  function tiklandi(i) {
    if (!oyun || oyun.kazandiMi() || ogretimKilidi) return;
    var d = oyun.durum;
    if (doken[i] || karistiran[i]) return;
    if (dolan[i] && secili === -1) return;

    if (secili === -1) {
      if (d.kapMi[i]) { mesajGoster('Erlenmayerden geri dökemezsin'); ses('hata'); return; }
      if (!d.tupler[i].length) return;
      secili = i;
      isaretleriYenile();
      return;
    }
    if (secili === i) { secili = -1; isaretleriYenile(); return; }

    var kaynak = secili;
    if (!O().hamleGecerliMi(d, kaynak, i)) {
      var e = parcaElemani(i);
      if (e) {
        e.classList.add('ss-hatali');
        setTimeout(function () { e.classList.remove('ss-hatali'); }, 300);
      }
      if (d.kapMi[i] && d.tupler[i].length >= d.kaplar[i]) mesajGoster('Kap dolu');
      ses('hata');
      secili = -1;
      isaretleriYenile();
      return;
    }

    dokmeAnimasyonu(kaynak, i);
  }

  /* ============================================================
     7) DOKME ANIMASYONU
     Kaynak her zaman normal sise; hedef sise ya da erlenmayer.
     ============================================================ */

  function dokmeAnimasyonu(a, b) {
    var d = oyun.durum;
    var kapaMi = d.kapMi[b];
    var oncekiUzunluk = d.tupler[b].length;
    var renk = d.tupler[a][d.tupler[a].length - 1];

    var sonuc = oyun.dok(a, b);
    if (!sonuc) return;
    var adet = sonuc.adet;

    var toplam = SURE[adet] || SURE[6];
    var egilme = 190;
    var akisSuresi = Math.max(160, toplam - egilme * 2);
    var birim = akisSuresi / adet;

    doken[a] = true;
    dolan[b] = (dolan[b] || 0) + 1;
    akanSayisi++;
    secili = -1;
    isaretleriYenile();
    barYenile();

    var kaynakEl = tupElemani(a);
    var hedefEl = parcaElemani(b);
    var sahne = $('ssoSahne');
    if (!kaynakEl || !hedefEl || !sahne) { animasyonBitti(a, b); return; }

    var kr = kaynakEl.getBoundingClientRect();
    var hr = hedefEl.getBoundingClientRect();
    var sr = sahne.getBoundingClientRect();

    var sagaMi = (hr.left + hr.width / 2) > (kr.left + kr.width / 2);
    var aci = sagaMi ? 68 : -68;

    kaynakEl.style.transformOrigin = sagaMi ? '100% 0' : '0 0';
    var dudakX = sagaMi ? kr.right : kr.left;
    var dudakY = kr.top;

    var hedefDudakX = kapaMi ? (hr.left + hr.width / 2) : (hr.left + hr.width / 2);
    var hedefDudakY = (kapaMi ? kapAgizY(b) : hr.top) - 34;

    var dx = hedefDudakX - dudakX;
    var dy = hedefDudakY - dudakY;

    kaynakEl.classList.add('ss-dokuyor');
    kaynakEl.style.transition = 'transform ' + egilme + 'ms cubic-bezier(.35,.05,.25,1)';
    kaynakEl.style.transform =
      'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + aci + 'deg)';

    var akisEl = el('div', 'ss-akis', sahne);
    akisEl.style.backgroundColor = renkHex(renk);
    akisEl.style.left = (hedefDudakX - sr.left - 3) + 'px';
    akisEl.style.top = (hedefDudakY - sr.top) + 'px';

    function yuzeyY(doluKatman) {
      if (kapaMi) return kapYuzeyY(b, doluKatman);
      return hr.bottom - 3 - (doluKatman * katmanY);
    }
    function akisBoyu(doluKatman) {
      return Math.max(10, yuzeyY(doluKatman) - hedefDudakY);
    }
    function sicrat(doluKatman) {
      var sp = el('div', 'ss-sicrama', sahne);
      sp.style.background = renkHex(renk);
      sp.style.left = (hedefDudakX - sr.left - 11) + 'px';
      sp.style.top = (yuzeyY(doluKatman) - sr.top - 5) + 'px';
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 380);
    }

    setTimeout(function () {
      akisEl.style.height = akisBoyu(oncekiUzunluk) + 'px';
      akisEl.classList.add('show');

      var doldu = 0;
      function birKatman() {
        if (doldu >= adet) {
          akisEl.classList.remove('show');
          kaynakEl.style.transition = 'transform ' + egilme + 'ms cubic-bezier(.35,.05,.25,1)';
          kaynakEl.style.transform = '';
          setTimeout(function () {
            if (akisEl.parentNode) akisEl.parentNode.removeChild(akisEl);
            kaynakEl.classList.remove('ss-dokuyor');
            kaynakEl.style.transition = '';
            kaynakEl.style.transformOrigin = '';
            animasyonBitti(a, b);
          }, egilme);
          return;
        }

        /* kaynaktan bir katman eksilt */
        var sonKaynak = kaynakEl.lastElementChild;
        if (sonKaynak) sonKaynak.parentNode.removeChild(sonKaynak);

        /* hedefe bir katman ekle */
        if (kapaMi) {
          var kapEl = kapElemani(b);
          if (kapEl) {
            /* modelde zaten islendi; sadece o ana kadarki dolulugu ciz */
            kismiKapCiz(kapEl, b, oncekiUzunluk + doldu + 1);
          }
        } else {
          var yeniKatman = el('div', 'ss-sivi ss-dolan', hedefEl);
          yeniKatman.style.height = katmanY + 'px';
          yeniKatman.style.setProperty('--ss-renk', renkHex(renk));
        }

        sicrat(oncekiUzunluk + doldu);
        doldu++;
        akisEl.style.height = akisBoyu(oncekiUzunluk + doldu) + 'px';
        ses('dok', (oncekiUzunluk + doldu) / d.kaplar[b]);
        setTimeout(birKatman, birim);
      }
      birKatman();
    }, egilme);
  }

  /* Kabi, icerigin sadece ilk `adet` katmani doluymus gibi ciz */
  function kismiKapCiz(kapEl, i, adet) {
    var gercek = oyun.durum.tupler[i];
    var yedek = gercek.slice();
    oyun.durum.tupler[i] = gercek.slice(0, adet);
    kapCiz(kapEl, i);
    oyun.durum.tupler[i] = yedek;
    var g = kapEl.querySelector('.sso-sivilar');
    if (g) {
      var son = g.querySelector('polygon:last-of-type');
      if (son) son.classList.add('sso-dolan');
    }
  }

  /* Bir normal sise (erlenmayer degil) tek renkle tam dolduysa konfeti + kapak kapat.
     Erlenmayerler kendi "olustu" kutlamasini uygulaKaristir() icinde zaten yapiyor. */
  function tamamlanmaKontrol(i) {
    var d = oyun.durum;
    if (d.kapMi[i]) return;
    var bitti = d.tupler[i].length > 0 && d.tupler[i].length === d.kaplar[i] && tekRenk(d.tupler[i]);
    if (!bitti) { delete kutlanan[i]; return; }
    if (kutlanan[i]) return;
    kutlanan[i] = true;

    var tup = tupElemani(i), sahne = $('ssoSahne');
    if (!tup || !sahne) return;
    var r = tup.getBoundingClientRect(), sr = sahne.getBoundingClientRect();
    konfetiPatlat(sahne, r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 20, .85);
    tup.classList.remove('ss-tamamlandi');
    void tup.offsetWidth;
    tup.classList.add('ss-tamamlandi');
    ses('tamam');
  }

  function animasyonBitti(a, b) {
    delete doken[a];
    dolan[b] = (dolan[b] || 1) - 1;
    if (dolan[b] <= 0) delete dolan[b];
    akanSayisi = Math.max(0, akanSayisi - 1);

    var ka = tupElemani(a);
    if (ka) sivilariCiz(ka, a);
    if (!dolan[b]) {
      var hb = parcaElemani(b);
      if (hb) { oyun.durum.kapMi[b] ? kapCiz(hb, b) : sivilariCiz(hb, b); }
    }

    hedefPaneliYenile();
    isaretleriYenile();
    tamamlanmaKontrol(a);
    if (!dolan[b]) tamamlanmaKontrol(b);
    barYenile();

    if (mesgul()) return;
    sonKontrol();
  }

  /* ============================================================
     8) KARISTIRMA — cam baget
     ============================================================ */

  function karistirTiklandi(i) {
    if (!oyun || oyun.kazandiMi() || ogretimKilidi) return;
    if (kapMesgul(i)) return;
    if (!oyun.karistirilabilirMi(i)) {
      mesajGoster('Karıştırmak için kapta en az iki ham renk olmalı');
      ses('hata');
      return;
    }

    var kapEl = kapElemani(i);
    if (!kapEl) { uygulaKaristir(i); return; }

    karistiran[i] = true;
    secili = -1;
    isaretleriYenile();
    barYenile();

    var baget = kapEl.querySelector('.sso-baget');
    var sivilar = kapEl.querySelector('.sso-sivilar');
    var kisik = kisikHareket();
    var indir = kisik ? 60 : BAGET_IN;
    var karis = kisik ? 200 : BAGET_KARIS;
    var kaldir = kisik ? 60 : BAGET_OUT;

    if (baget) {
      baget.style.setProperty('--in', indir + 'ms');
      baget.style.setProperty('--kar', (karis / 3).toFixed(0) + 'ms');
      baget.classList.add('bat');
    }

    setTimeout(function () {
      if (sivilar) sivilar.classList.add('sso-karisiyor');
      ses('karistirBasla');
      setTimeout(function () { if (karistiran[i]) ses('karistir'); }, 110);
    }, indir);

    /* karisim, karistirmanin ortasinda gerceklesir */
    setTimeout(function () {
      var s = uygulaKaristir(i);
      var yeniKap = kapElemani(i);
      var yeniSivi = yeniKap && yeniKap.querySelector('.sso-sivilar');
      if (yeniSivi) {
        yeniSivi.classList.add('sso-karisiyor');
        yeniSivi.classList.add('sso-parla');
      }
      /* yeni cizim bageti sifirladi, animasyonu geri kur */
      var yeniBaget = yeniKap && yeniKap.querySelector('.sso-baget');
      if (yeniBaget) {
        yeniBaget.style.setProperty('--in', '0ms');
        yeniBaget.style.setProperty('--kar', (karis / 3).toFixed(0) + 'ms');
        yeniBaget.classList.add('bat', 'devam');
      }
      if (s && s.camur) ses('camur');
    }, indir + karis * 0.55);

    setTimeout(function () {
      var son = kapElemani(i);
      if (son) {
        var b2 = son.querySelector('.sso-baget');
        if (b2) { b2.classList.remove('bat', 'devam'); b2.classList.add('cik'); }
        var sv = son.querySelector('.sso-sivilar');
        if (sv) sv.classList.remove('sso-karisiyor');
      }
      setTimeout(function () {
        delete karistiran[i];
        var e = kapElemani(i);
        if (e) {
          var b3 = e.querySelector('.sso-baget');
          if (b3) b3.classList.remove('cik');
        }
        hedefPaneliYenile();
        isaretleriYenile();
        barYenile();
        if (!mesgul()) sonKontrol();
      }, kaldir);
    }, indir + karis);
  }

  function uygulaKaristir(i) {
    var s = oyun.karistir(i);
    if (!s) return null;
    var kapEl = kapElemani(i);
    if (kapEl) kapCiz(kapEl, i);
    hedefPaneliYenile();

    if (s.camur) {
      var e = kapElemani(i);
      if (e) {
        e.classList.remove('sso-camur');
        void e.offsetWidth;
        e.classList.add('sso-camur');
      }
      mesajGoster('Üç ham renk birleşti — kap çamur oldu');
    } else {
      /* hedefe tam oturduysa kutla */
      var t = oyun.durum.tupler[i];
      if (tekRenk(t)) {
        for (var k = 0; k < oyun.durum.hedefler.length; k++) {
          if (oyun.durum.hedefler[k].renk === t[0] && oyun.durum.hedefler[k].adet === t.length) {
            var kap = kapElemani(i), sahne = $('ssoSahne');
            if (kap && sahne) {
              var r = kap.getBoundingClientRect(), sr = sahne.getBoundingClientRect();
              konfetiPatlat(sahne, r.left - sr.left + r.width / 2,
                            r.top - sr.top + r.height / 2, 18, .85);
            }
            ses('olustu');
            break;
          }
        }
      }
    }
    return s;
  }

  /* ============================================================
     9) BOLUM SONU
     ============================================================ */

  function sonKontrol() {
    if (oyun.kazandiMi()) { setTimeout(bolumBitti, 240); return; }
    if (oyun.camurluMu()) {
      mesajGoster('Çamur temizlenemez — geri al veya baştan başla');
      return;
    }
    if (!oyun.oynanabilirMi()) {
      mesajGoster('Hamle kalmadı — geri al veya baştan başla');
    }
  }

  function bolumBitti() {
    var p = ilerleme();
    var no = oyun.bolum.bolumNo;
    var yildiz = oyun.yildiz();
    var oncekiYildiz = p.ssoYildiz[no] || 0;
    var ilkKez = oncekiYildiz === 0;

    if (yildiz > oncekiYildiz) p.ssoYildiz[no] = yildiz;
    if (no + 1 > (p.ssoAcik || 1)) p.ssoAcik = Math.min(TOPLAM_OZEL, no + 1);
    ilerlemeKaydet({ ssoAcik: p.ssoAcik, ssoYildiz: p.ssoYildiz });

    var odul = 0;
    if (ilkKez) {
      odul = yildiz === 3 ? 45 : (yildiz === 2 ? 30 : 15);
      if (global.AppGold) global.AppGold.add(odul);
    }

    ses('kazan');

    var kutu = $('ssoSonuc');
    if (!kutu) return;
    var yEl = $('ssoSonucYildiz');
    if (yEl) yEl.innerHTML =
      '<span class="' + (yildiz >= 1 ? 'dolu' : '') + '">★</span>' +
      '<span class="' + (yildiz >= 2 ? 'dolu' : '') + '">★</span>' +
      '<span class="' + (yildiz >= 3 ? 'dolu' : '') + '">★</span>';
    var mEl = $('ssoSonucMetin');
    if (mEl) mEl.textContent = oyun.hamleSayisi + ' hamlede tamamladın';
    var odulEl = $('ssoSonucOdul');
    if (odulEl) {
      if (odul > 0) {
        odulEl.style.display = 'flex';
        odulEl.innerHTML = (global.CoinSVG ? global.CoinSVG(true) : '') + '<span>+' + odul + '</span>';
      } else {
        odulEl.style.display = 'none';
      }
    }
    var sonrakiBtn = $('ssoSonrakiBtn');
    if (sonrakiBtn) sonrakiBtn.style.display = no < TOPLAM_OZEL ? 'block' : 'none';
    kutu.classList.add('show');

    sonKazanilan = Math.min(TOPLAM_OZEL, no + 1);

    setTimeout(function () {
      var r = kutu.getBoundingClientRect();
      konfetiPatlat(kutu, r.width / 2, r.height * 0.38, 34, 1.5);
    }, 120);
    setTimeout(function () {
      var r = kutu.getBoundingClientRect();
      konfetiPatlat(kutu, r.width * 0.2, r.height * 0.45, 16, 1.2);
      konfetiPatlat(kutu, r.width * 0.8, r.height * 0.45, 16, 1.2);
    }, 380);
  }

  /* ============================================================
     10) BAGLANTILAR
     ============================================================ */

  function baglan() {
    /* Mod ekranindaki "Ozel Bolumler" karti. Kilitliyse uyariyi
       ana katman (suSiralaOyun.js) veriyor, burasi sessiz kalir. */
    var giris = $('ssModeOzel');
    if (giris) giris.addEventListener('click', function () {
      if (giris.classList.contains('locked')) return;
      haritaCiz();
      if (global.slideForward) global.slideForward('ssMod', 'ssoHarita');
    });

    var dg = $('ssoDiyagramBtn');
    if (dg) dg.addEventListener('click', function () {
      if (!oyun) return;
      diyagramAc(false, null);
    });

    var geri = $('ssoGeriBtn');
    if (geri) geri.addEventListener('click', function () {
      if (!oyun || mesgul()) return;
      if (!oyun.geriAl()) { mesajGoster('Geri alınacak hamle yok'); return; }
      secili = -1;
      tahtaKur(); barYenile();
      var s = $('ssoSonuc'); if (s) s.classList.remove('show');
    });

    var bastan = $('ssoBastanBtn');
    if (bastan) bastan.addEventListener('click', function () {
      if (!oyun || mesgul()) return;
      oyun.bastanBasla();
      sifirlaDurum();
      tahtaKur(); barYenile();
      var s = $('ssoSonuc'); if (s) s.classList.remove('show');
    });

    var sonraki = $('ssoSonrakiBtn');
    if (sonraki) sonraki.addEventListener('click', function () {
      if (!oyun) return;
      var no = oyun.bolum.bolumNo + 1;
      var s = $('ssoSonuc'); if (s) s.classList.remove('show');
      if (no <= TOPLAM_OZEL) bolumBaslat2(no);
    });

    var haritaya = $('ssoHaritayaBtn');
    if (haritaya) haritaya.addEventListener('click', function () {
      var s = $('ssoSonuc'); if (s) s.classList.remove('show');
      haritaCiz();
      if (global.slideBack) global.slideBack('ssoOyun', 'ssoHarita');
    });
  }

  /* ---------- Disa acilan arayuz ---------- */

  global.SuSiralaOzelOyun = {
    haritaCiz: haritaCiz,
    bolumBaslat: bolumBaslat,
    baglan: baglan,
    TOPLAM_OZEL: TOPLAM_OZEL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baglan);
  } else {
    baglan();
  }

  if (global.AppReset && global.AppReset.push) {
    global.AppReset.push(function () {
      if (global.AppProgress) { global.AppProgress.ssoAcik = 1; global.AppProgress.ssoYildiz = {}; }
      oyun = null;
    });
  }

})(window);
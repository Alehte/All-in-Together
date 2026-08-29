/* ============================================================
   SU SIRALAMA - OYUN KATMANI (projeye entegre)
   Ekranlar: mod secimi -> bolum haritasi -> oyun
   Bagimliliklar: core.js (AppProgress, AppGold, AppFX, slideForward)
                  suSirala.js, suSiralaBolumler.js, suSiralaJoker.js
   ============================================================ */

(function (global) {
  'use strict';

  /* Palet CIE dE ile ayrildi: iki yesil arasi 23.8 -> 64.1,
     acik yesil ile turkuaz arasi 22.1 -> 52.0 */
  var RENKLER = [
    '#E30A17', '#3AA8E0', '#F2C14E', '#86DD6B',
    '#A05AD6', '#EF7FB0', '#1E6B5C', '#D94F70',
    '#7F8FD6', '#C98B3A', '#4FD6C8', '#9C9C5A'
  ];

  var TOPLAM_BOLUM = 250;
  var OZEL_ACILIS = 20;      /* ozel bolumler bu bolum gecilince acilir */

  /* Dokme animasyon sureleri (ms), aktarilan blok sayisina gore */
  var SURE = { 1: 600, 2: 800, 3: 1000, 4: 1000, 5: 1200 };

  var oyun = null;
  var secili = -1;
  var perdeModu = false;
  var KONFETI = ['#A78BFA', '#7F6BE8', '#C9A6FF', '#7FD8E6', '#E9D8FF', '#8B5FD6', '#FBE7AE'];
  var kutlanan = {};         /* konfetisi patlamis siseler */
  var sonKazanilan = 0;      /* haritaya donuste parlatilacak bolum */
  var doken = {};            /* o an egilmis, dokmekte olan siseler */
  var dolan = {};            /* o an dolmakta olan siseler */
  var akanSayisi = 0;        /* devam eden animasyon sayisi */
  var katmanYuksekligi = 30;

  /* ---------- Kisayollar ---------- */

  function $(id) { return document.getElementById(id); }

  function el(etiket, sinif, ana) {
    var d = document.createElement(etiket);
    if (sinif) d.className = sinif;
    if (ana) ana.appendChild(d);
    return d;
  }

  /* Konfeti: kapsayiciya gore (x, y) noktasindan sacilir */
  function konfetiPatlat(kapsayici, x, y, adet, gucCarpani) {
    if (!kapsayici) return;
    var kisik = document.querySelector('.phone.reduced-motion');
    adet = kisik ? Math.round((adet || 18) / 3) : (adet || 18);
    var guc = gucCarpani || 1;

    for (var i = 0; i < adet; i++) {
      var p = el('i', 'ss-konfeti', kapsayici);
      var aci = Math.random() * Math.PI * 2;
      var mesafe = (36 + Math.random() * 74) * guc;
      p.style.background = KONFETI[Math.floor(Math.random() * KONFETI.length)];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = (4 + Math.random() * 5).toFixed(1) + 'px';
      p.style.height = (6 + Math.random() * 7).toFixed(1) + 'px';
      p.style.setProperty('--dx', (Math.cos(aci) * mesafe).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(aci) * mesafe + 70 * guc).toFixed(1) + 'px');
      p.style.setProperty('--spin', Math.round(Math.random() * 900 - 450) + 'deg');
      p.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
      (function (nokta) {
        setTimeout(function () { if (nokta.parentNode) nokta.parentNode.removeChild(nokta); }, 1500);
      })(p);
    }
  }

  /* Bir sisede renk tamamlandiysa etrafinda konfeti patlat */
  function tamamlanmaKontrol(i) {
    var d = oyun.durum;
    var bitti = d.tupler[i].length > 0 && d.gizli[i] === 0 &&
                global.SuSirala.renkTamamlandiMi(d, i);
    if (!bitti) { delete kutlanan[i]; return; }
    if (kutlanan[i]) return;
    kutlanan[i] = true;

    var tup = tupElemani(i), tahta = $('ssTahta');
    if (!tup || !tahta) return;
    var r = tup.getBoundingClientRect(), tr = tahta.getBoundingClientRect();
    konfetiPatlat(tahta, r.left - tr.left + r.width / 2, r.top - tr.top + r.height / 2, 20, .85);
    tup.classList.remove('ss-tamamlandi');
    void tup.offsetWidth;
    tup.classList.add('ss-tamamlandi');
    ses('tamam');
  }

  function ilerleme() {
    var p = global.AppProgress || {};
    if (typeof p.ssAcik !== 'number') p.ssAcik = 1;
    if (!p.ssYildiz) p.ssYildiz = {};
    return p;
  }

  function ilerlemeKaydet(yama) {
    if (typeof global.AppSaveProgress === 'function') global.AppSaveProgress(yama);
  }

  function ses(tur) {
    if (!global.AppFX) return;
    if (tur === 'dok') global.AppFX.tone(320, 500, 0.16, 'sine', 0.16);
    else if (tur === 'tamam') global.AppFX.tone(660, 990, 0.22, 'triangle', 0.2);
    else if (tur === 'hata') { global.AppFX.tone(200, 130, 0.16, 'sawtooth', 0.14); global.AppFX.vibrate(28); }
    else if (tur === 'kazan') global.AppFX.seq([[523, .16, .2, 0], [659, .16, .2, 130], [784, .3, .22, 260]], 'triangle');
  }

  /* ============================================================
     1) MOD SECIM EKRANI
     ============================================================ */

  function modYenile() {
    var p = ilerleme();
    var gecilen = Math.max(0, (p.ssAcik || 1) - 1);

    var meta = $('ssModNormalMeta');
    if (meta) meta.textContent = gecilen > 0 ? (gecilen + ' bölüm tamamlandı') : 'Yeni başlıyorsun';

    var kart = $('ssModeOzel');
    var ozelMeta = $('ssModOzelMeta');
    if (kart) {
      var acik = gecilen >= OZEL_ACILIS;
      kart.classList.toggle('locked', !acik);
      if (ozelMeta) {
        /* acikken rozet hic gorunmesin; kilitliyse ne gerektigini yazsin */
        ozelMeta.style.display = acik ? 'none' : 'inline-flex';
        ozelMeta.textContent = acik ? '' : (OZEL_ACILIS + '. bölümü geç');
      }
    }
    if (global.AppGold) global.AppGold.render();
  }

  /* ============================================================
     2) BOLUM HARITASI - virajli yol
     ============================================================ */

  function haritaCiz() {
    var ic = $('ssPathInner');
    if (!ic) return;
    var p = ilerleme();
    var acik = p.ssAcik || 1;

    ic.innerHTML = '';

    var genislik = ic.clientWidth || 320;
    var aralik = 96;                     /* dugumler arasi dikey mesafe */
    var genlik = Math.min(genislik * 0.3, 96);
    var orta = genislik / 2;
    var ustBosluk = 60;
    var yukseklik = ustBosluk * 2 + (TOPLAM_BOLUM - 1) * aralik;
    ic.style.height = yukseklik + 'px';

    var noktalar = [];
    for (var i = 0; i < TOPLAM_BOLUM; i++) {
      var t = i * 0.62;
      var x = orta + Math.sin(t) * genlik + Math.sin(t * 0.37) * (genlik * 0.35);
      var y = yukseklik - ustBosluk - i * aralik;
      noktalar.push([x, y]);
    }

    /* Yol: noktalardan gecen yumusak egri */
    var d = 'M ' + noktalar[0][0].toFixed(1) + ' ' + noktalar[0][1].toFixed(1);
    for (var k = 1; k < noktalar.length; k++) {
      var onceki = noktalar[k - 1], simdi = noktalar[k];
      var ortaY = (onceki[1] + simdi[1]) / 2;
      d += ' C ' + onceki[0].toFixed(1) + ' ' + ortaY.toFixed(1) +
           ', ' + simdi[0].toFixed(1) + ' ' + ortaY.toFixed(1) +
           ', ' + simdi[0].toFixed(1) + ' ' + simdi[1].toFixed(1);
    }

    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ss-path-svg');
    svg.setAttribute('width', genislik);
    svg.setAttribute('height', yukseklik);

    var asfalt = document.createElementNS(ns, 'path');
    asfalt.setAttribute('class', 'ss-yol-asfalt');
    asfalt.setAttribute('d', d);
    svg.appendChild(asfalt);

    var kenar = document.createElementNS(ns, 'path');
    kenar.setAttribute('class', 'ss-yol-kenar');
    kenar.setAttribute('d', d);
    svg.appendChild(kenar);

    var serit = document.createElementNS(ns, 'path');
    serit.setAttribute('class', 'ss-yol-serit');
    serit.setAttribute('d', d);
    svg.appendChild(serit);

    ic.appendChild(svg);

    /* Dugumler */
    for (var n = 0; n < TOPLAM_BOLUM; n++) {
      var bolumNo = n + 1;
      var nokta = noktalar[n];
      var acikMi = bolumNo <= acik;
      var yildiz = p.ssYildiz[bolumNo] || 0;

      var dugum = el('div', 'ss-node' + (acikMi ? ' ss-node-acik' : ' ss-node-kilitli'), ic);
      dugum.style.left = nokta[0] + 'px';
      dugum.style.top = nokta[1] + 'px';
      dugum.textContent = acikMi ? bolumNo : '';

      if (!acikMi) {
        dugum.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
          'stroke-linecap="round" stroke-linejoin="round" class="ss-kilit-ikon">' +
          '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      } else {
        (function (no) {
          dugum.addEventListener('click', function () { bolumBaslat(no); });
        })(bolumNo);
      }

      if (bolumNo === sonKazanilan && acikMi) dugum.classList.add('ss-node-yeni');

      if (yildiz > 0) {
        var ys = el('div', 'ss-node-yildiz', ic);
        ys.style.left = nokta[0] + 'px';
        ys.style.top = (nokta[1] + 30) + 'px';
        var metin = '';
        for (var z = 0; z < 3; z++) metin += (z < yildiz ? '★' : '☆');
        ys.textContent = metin;
      }
    }

    /* Acik olan en ust bolume kaydir */
    var sarma = $('ssPathWrap');
    if (sarma) {
      var hedef = noktalar[Math.min(acik, TOPLAM_BOLUM) - 1];
      sarma.scrollTop = Math.max(0, hedef[1] - sarma.clientHeight * 0.55);
    }

    /* Yeni acilan bolum: dugum yerine oturur ve konfeti patlar */
    if (sonKazanilan) {
      var yeniNokta = noktalar[sonKazanilan - 1];
      if (yeniNokta) {
        setTimeout(function () {
          konfetiPatlat(ic, yeniNokta[0], yeniNokta[1], 26, 1.15);
        }, 420);
      }
      sonKazanilan = 0;
    }
    if (global.AppGold) global.AppGold.render();
  }

  /* ============================================================
     3) OYUN EKRANI
     ============================================================ */

  function bolumBaslat(bolumNo) {
    oyun = global.SuSirala.OyunOlustur(bolumNo);
    secili = -1;
    perdeModu = false;
    doken = {}; dolan = {}; akanSayisi = 0;

    var baslik = $('ssLevelTitle');
    if (baslik) baslik.textContent = 'Bölüm ' + bolumNo;

    var sonuc = $('ssSonuc');
    if (sonuc) sonuc.classList.remove('show');

    tahtaKur();
    barYenile();

    if (global.slideForward) global.slideForward('ssHarita', 'ssOyun');
    if (global.AppGold) global.AppGold.render();
  }

  function tahtaKur() {
    var tahta = $('ssTahta');
    if (!tahta) return;
    tahta.innerHTML = '';
    kutlanan = {};

    var d = oyun.durum;
    var enBuyuk = Math.max.apply(null, d.kaplar);
    var sise = d.tupler.length;

    /* Sise sayisina gore olcek: hepsi ekrana sigsin */
    katmanYuksekligi = sise > 10 ? 24 : (sise > 8 ? 27 : 30);
    var genislik = sise > 10 ? 36 : (sise > 8 ? 40 : 44);
    tahta.style.setProperty('--ss-tup-w', genislik + 'px');
    if (global.AppMarket && global.AppMarket.siseTemasiUygula) global.AppMarket.siseTemasiUygula(tahta);

    for (var i = 0; i < d.tupler.length; i++) {
      var yuva = el('div', 'ss-yuva', tahta);
      yuva.style.height = (enBuyuk * katmanYuksekligi + 12) + 'px';

      var tup = el('div', 'ss-tup', yuva);
      tup.dataset.i = i;
      tup.style.height = (d.kaplar[i] * katmanYuksekligi + 6) + 'px';

      (function (indeks) {
        tup.addEventListener('click', function () { tupTiklandi(indeks); });
      })(i);

      yuva.appendChild(tup);
      var kapak = el('div', 'ss-kapak', yuva);
kapak.style.bottom = tup.offsetHeight + 'px';
kapak.innerHTML = (global.AppMarket && global.AppMarket.siseKapakSvg ? global.AppMarket.siseKapakSvg() : '');
      sivilariCiz(tup, i);
    }
    isaretleriYenile();
  }

  function sivilariCiz(tup, i) {
    var d = oyun.durum;
    tup.innerHTML = '';
    for (var k = 0; k < d.tupler[i].length; k++) {
      var s = el('div', 'ss-sivi', tup);
      s.style.height = katmanYuksekligi + 'px';
      if (k < d.gizli[i]) {
        s.className += ' ss-perde';
        s.textContent = '?';
      } else {
        s.style.setProperty('--ss-renk', RENKLER[d.tupler[i][k] % RENKLER.length]);
      }
    }
  }

  function tupElemani(i) {
    return document.querySelector('#ssTahta .ss-tup[data-i="' + i + '"]');
  }

  function isaretleriYenile() {
    var d = oyun.durum;
    for (var i = 0; i < d.tupler.length; i++) {
      var t = tupElemani(i);
      if (!t) continue;
      t.classList.toggle('ss-secili', i === secili);
      var bitti = d.tupler[i].length > 0 && d.gizli[i] === 0 &&
                  global.SuSirala.renkTamamlandiMi(d, i);
      t.classList.toggle('ss-tamam', bitti);
    }
  }

  /* ---------- Ust bar ve jokerler ---------- */

  function barYenile() {
    var hamle = $('ssHamle');
    if (hamle) hamle.textContent = oyun.hamleSayisi;
    var hedef = $('ssHedef');
    if (hedef) hedef.textContent = oyun.bolum.yildizButce.uc;

    var J = global.SuSiralaJoker;
    if (!J) return;
    var kutu = $('ssJokerBar');
    if (!kutu) return;
    kutu.innerHTML = '';

    J.TURLER.forEach(function (tur) {
      var t = J.TANIM[tur];
      var sayi = J.adet(tur);
      var b = el('button', 'ss-joker', kutu);

      var ikon = el('span', 'ss-joker-ikon', b);
      jokerIkonuYerlestir(ikon, tur);

      var ad = el('span', 'ss-joker-ad', b);
      ad.textContent = t.ad;

      var rozet = el('span', 'ss-joker-sayi', b);
      if (sayi > 0) {
        rozet.textContent = sayi;
      } else {
        rozet.className += ' ss-joker-fiyat';
        rozet.innerHTML = (global.CoinSVG ? global.CoinSVG(true) : '') + t.fiyat;
      }

      if (akanSayisi > 0 || oyun.kazandiMi()) b.disabled = true;
      if (tur === 'geriAl' && oyun.gecmis.length === 0) b.disabled = true;
      if (tur === 'perdeAc' && oyun.perdeliTupler().length === 0) b.disabled = true;
      if (tur === 'siseEkle' && oyun.eklenenSise >= (t.bolumSiniri || 2)) b.disabled = true;
      if (tur === 'perdeAc' && perdeModu) b.className += ' ss-joker-aktif';

      b.addEventListener('click', function () { jokerTiklandi(tur); });
    });
  }

  /* Ikon dosyalari img/ klasorunde beklenir; bulunamazsa SVG devreye girer. */
  var JOKER_IKON = {
    geriAl:   'img/joker-gerial.png',
    perdeAc:  'img/joker-perde.png',
    siseEkle: 'img/joker-sise.png'
  };

  function jokerIkonuYerlestir(kutu, tur) {
    var img = document.createElement('img');
    img.alt = '';
    img.onerror = function () { kutu.innerHTML = jokerSvg(tur); };
    img.src = JOKER_IKON[tur];
    kutu.appendChild(img);
  }

  function jokerSvg(tur) {
    if (tur === 'geriAl') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11A8 8 0 1 0 18 17"/><path d="M20 5v6h-6"/></svg>';
    }
    if (tur === 'perdeAc') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v5L6 19a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3L14 8V3"/><path d="M19 6h4M21 4v4"/></svg>';
  }

  function mesajGoster(metin) {
    var m = $('ssMesaj');
    if (!m) return;
    m.textContent = metin || '';
    m.classList.toggle('show', !!metin);
    if (metin) {
      clearTimeout(mesajGoster._z);
      mesajGoster._z = setTimeout(function () { m.classList.remove('show'); }, 2200);
    }
  }

  function jokerTiklandi(tur) {
    if (akanSayisi > 0) return;
    var J = global.SuSiralaJoker;

    if (J.adet(tur) < 1) {
      var s = J.satinAl(tur);
      if (!s.ok) {
        mesajGoster(s.sebep === 'yetersizAltin' ? ('Yetersiz altın — ' + s.eksik + ' eksik') : 'Satın alınamadı');
        ses('hata');
        barYenile();
        return;
      }
      mesajGoster(J.TANIM[tur].ad + ' alındı');
    }

    if (tur === 'geriAl') {
      var g = J.geriAl(oyun);
      if (!g.ok) { mesajGoster('Geri alınacak hamle yok'); return; }
      secili = -1; perdeModu = false;
      tahtaKur(); barYenile();
    } else if (tur === 'siseEkle') {
      var e = J.siseEkle(oyun);
      if (!e.ok) {
        mesajGoster(e.sebep === 'bolumSiniri' ? ('Bu bölümde en fazla ' + e.sinir + ' şişe') : 'Şişe eklenemedi');
        return;
      }
      secili = -1; perdeModu = false;
      tahtaKur(); barYenile();
      ses('dok');
    } else if (tur === 'perdeAc') {
      perdeModu = !perdeModu;
      secili = -1;
      if (perdeModu) mesajGoster('Perdesini açmak istediğin şişeye dokun');
      isaretleriYenile();
      barYenile();
    }
  }

  /* ---------- Etkilesim ---------- */

  function tupTiklandi(i) {
    if (!oyun || oyun.kazandiMi()) return;
    /* Egilmis sise ne kaynak ne hedef olabilir */
    if (doken[i]) return;
    /* Dolmakta olan sise HEDEF olabilir ama kaynak olamaz */
    if (dolan[i] && secili === -1) return;

    if (perdeModu) {
      if (akanSayisi > 0) return;
      var s = global.SuSiralaJoker.perdeAc(oyun, i);
      perdeModu = false;
      if (!s.ok) { mesajGoster('Bu şişede perde yok'); ses('hata'); }
      else { var t = tupElemani(i); if (t) { sivilariCiz(t, i); t.classList.add('ss-acildi'); } }
      isaretleriYenile();
      barYenile();
      return;
    }

    if (secili === -1) {
      if (oyun.durum.tupler[i].length === 0) return;
      secili = i;
      isaretleriYenile();
      return;
    }
    if (secili === i) { secili = -1; isaretleriYenile(); return; }

    var kaynak = secili;
    if (!global.SuSirala.hamleGecerliMi(oyun.durum, kaynak, i)) {
      var hedefEl = tupElemani(i);
      if (hedefEl) {
        hedefEl.classList.add('ss-hatali');
        setTimeout(function () { hedefEl.classList.remove('ss-hatali'); }, 300);
      }
      ses('hata');
      secili = -1;
      isaretleriYenile();
      return;
    }

    dokmeAnimasyonu(kaynak, i);
  }

  /* ============================================================
     4) DOKME ANIMASYONU
     Sise, DOKME DUDAGI etrafinda donerek egilir; dudak hedefin
     agzinin tam ustune tasinir, sivi oradan akar.
     Hamle modele ANINDA islenir, animasyon ayri yurur; boylece
     oyuncu ayni anda baska siselere de dokunabilir.
     ============================================================ */

  function dokmeAnimasyonu(a, b) {
    var d = oyun.durum;
    var oncekiHedefUzunluk = d.tupler[b].length;
    var renk = d.tupler[a][d.tupler[a].length - 1];

    /* Hamleyi once modele isle: es zamanli hamleler cakismasin */
    var sonuc = oyun.dok(a, b);
    if (!sonuc) return;
    var adet = sonuc.adet;

    var toplam = SURE[adet] || SURE[5];
    var egilme = 190;
    var akisSuresi = Math.max(160, toplam - egilme * 2);
    var birim = akisSuresi / adet;

    doken[a] = true;
    dolan[b] = (dolan[b] || 0) + 1;
    akanSayisi++;
    secili = -1;
    isaretleriYenile();
    barYenile();

    var kaynakEl = tupElemani(a), hedefEl = tupElemani(b), tahta = $('ssTahta');
    if (!kaynakEl || !hedefEl || !tahta) { animasyonBitti(a, b, sonuc); return; }

    var kr = kaynakEl.getBoundingClientRect();
    var hr = hedefEl.getBoundingClientRect();
    var tr = tahta.getBoundingClientRect();

    var sagaMi = (hr.left + hr.width / 2) > (kr.left + kr.width / 2);
    var aci = sagaMi ? 68 : -68;

    /* Dokme dudagi: hedefe bakan ust kose */
    kaynakEl.style.transformOrigin = sagaMi ? '100% 0' : '0 0';
    var dudakX = sagaMi ? kr.right : kr.left;
    var dudakY = kr.top;

    /* Dudagin gitmesi gereken yer: hedefin agzinin tam ustu */
    var hedefDudakX = hr.left + hr.width / 2;
    var hedefDudakY = hr.top - 38;

    var dx = hedefDudakX - dudakX;
    var dy = hedefDudakY - dudakY;

    kaynakEl.classList.add('ss-dokuyor');
    kaynakEl.style.transition = 'transform ' + egilme + 'ms cubic-bezier(.35,.05,.25,1)';
    kaynakEl.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + aci + 'deg)';

    /* Akan sivi seridi: dudaktan hedefteki sivi yuzeyine kadar */
    var akisEl = el('div', 'ss-akis', tahta);
    akisEl.style.backgroundColor = RENKLER[renk % RENKLER.length];
    akisEl.style.left = (hedefDudakX - tr.left - 3) + 'px';
    akisEl.style.top = (hedefDudakY - tr.top) + 'px';

    function yuzeyY(doluKatman) {
      return hr.bottom - 3 - (doluKatman * katmanYuksekligi);
    }
    function akisBoyu(doluKatman) {
      return Math.max(10, yuzeyY(doluKatman) - hedefDudakY);
    }
    /* Sivinin yuzeye carptigi yerde kucuk bir sicrama */
    function sicrat(doluKatman) {
      var sp = el('div', 'ss-sicrama', tahta);
      sp.style.background = RENKLER[renk % RENKLER.length];
      sp.style.left = (hedefDudakX - tr.left - 11) + 'px';
      sp.style.top = (yuzeyY(doluKatman) - tr.top - 5) + 'px';
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 380);
    }

    setTimeout(function () {
      akisEl.style.height = akisBoyu(oncekiHedefUzunluk) + 'px';
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
            animasyonBitti(a, b, sonuc);
          }, egilme);
          return;
        }

        var sonKaynak = kaynakEl.lastElementChild;
        if (sonKaynak) sonKaynak.parentNode.removeChild(sonKaynak);

        var yeniKatman = el('div', 'ss-sivi ss-dolan', hedefEl);
        yeniKatman.style.height = katmanYuksekligi + 'px';
        yeniKatman.style.setProperty('--ss-renk', RENKLER[renk % RENKLER.length]);

        sicrat(oncekiHedefUzunluk + doldu);
        doldu++;
        akisEl.style.height = akisBoyu(oncekiHedefUzunluk + doldu) + 'px';
        ses('dok');
        setTimeout(birKatman, birim);
      }
      birKatman();
    }, egilme);
  }

  function animasyonBitti(a, b, sonuc) {
    delete doken[a];
    dolan[b] = (dolan[b] || 1) - 1;
    if (dolan[b] <= 0) delete dolan[b];
    akanSayisi = Math.max(0, akanSayisi - 1);

    /* Perde acilmis olabilir; kaynagi modele gore yeniden ciz.
       Hedefi ancak baska bir dokum ona akmiyorsa yeniden ciziyoruz. */
    var ka = tupElemani(a);
    if (ka) sivilariCiz(ka, a);
    if (!dolan[b]) { var hb = tupElemani(b); if (hb) sivilariCiz(hb, b); }

    isaretleriYenile();
    tamamlanmaKontrol(a);
    if (!dolan[b]) tamamlanmaKontrol(b);
    barYenile();

    if (akanSayisi > 0) return;   /* baska dokum suruyorsa sonu bekle */

    if (oyun.kazandiMi()) setTimeout(bolumBitti, 220);
    else if (!oyun.oynanabilirMi()) mesajGoster('Hamle kalmadı — geri al veya baştan başla');
  }

  /* ============================================================
     5) BOLUM SONU
     ============================================================ */

  function bolumBitti() {
    var p = ilerleme();
    var no = oyun.bolum.bolumNo;
    var yildiz = oyun.yildiz();
    var oncekiYildiz = p.ssYildiz[no] || 0;
    var ilkKez = oncekiYildiz === 0;

    if (yildiz > oncekiYildiz) p.ssYildiz[no] = yildiz;
    if (no + 1 > (p.ssAcik || 1)) p.ssAcik = Math.min(TOPLAM_BOLUM, no + 1);
    ilerlemeKaydet({ ssAcik: p.ssAcik, ssYildiz: p.ssYildiz });

    /* Altin odulu: sadece ilk tamamlamada, yildiza gore */
    var odul = 0;
    if (ilkKez) {
      odul = yildiz === 3 ? 30 : (yildiz === 2 ? 20 : 10);
      if (global.AppGold) global.AppGold.add(odul);
    }

    ses('kazan');

    var kutu = $('ssSonuc');
    if (!kutu) return;
    $('ssSonucYildiz').innerHTML =
      '<span class="' + (yildiz >= 1 ? 'dolu' : '') + '">★</span>' +
      '<span class="' + (yildiz >= 2 ? 'dolu' : '') + '">★</span>' +
      '<span class="' + (yildiz >= 3 ? 'dolu' : '') + '">★</span>';
    $('ssSonucMetin').textContent = oyun.hamleSayisi + ' hamlede tamamladın';
    var odulEl = $('ssSonucOdul');
    if (odul > 0) {
      odulEl.style.display = 'flex';
      odulEl.innerHTML = (global.CoinSVG ? global.CoinSVG(true) : '') + '<span>+' + odul + '</span>';
    } else {
      odulEl.style.display = 'none';
    }
    var sonrakiBtn = $('ssSonrakiBtn');
    if (sonrakiBtn) sonrakiBtn.style.display = no < TOPLAM_BOLUM ? 'block' : 'none';
    kutu.classList.add('show');

    sonKazanilan = Math.min(TOPLAM_BOLUM, no + 1);

    /* Kart acilirken konfeti: once merkezden, sonra iki yandan */
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
     6) BAGLANTILAR
     ============================================================ */

  function baglan() {
    var normal = $('ssModeNormal');
    if (normal) normal.addEventListener('click', function () {
      haritaCiz();
      if (global.slideForward) global.slideForward('ssMod', 'ssHarita');
    });

    var ozel = $('ssModeOzel');
    if (ozel) ozel.addEventListener('click', function () {
      if (ozel.classList.contains('locked')) {
        ozel.classList.remove('ss-shake');
        void ozel.offsetWidth;
        ozel.classList.add('ss-shake');
        ses('hata');
        return;
      }
      mesajGoster('Özel bölümler yakında');
    });

    var bastan = $('ssBastanBtn');
    if (bastan) bastan.addEventListener('click', function () {
      if (akanSayisi > 0 || !oyun) return;
      oyun.bastanBasla();
      secili = -1; perdeModu = false; doken = {}; dolan = {}; akanSayisi = 0;
      tahtaKur(); barYenile();
      var s = $('ssSonuc'); if (s) s.classList.remove('show');
    });

    var sonraki = $('ssSonrakiBtn');
    if (sonraki) sonraki.addEventListener('click', function () {
      if (!oyun) return;
      var no = oyun.bolum.bolumNo + 1;
      var s = $('ssSonuc'); if (s) s.classList.remove('show');
      if (no <= TOPLAM_BOLUM) bolumBaslat2(no);
    });

    var haritaya = $('ssHaritayaBtn');
    if (haritaya) haritaya.addEventListener('click', function () {
      var s = $('ssSonuc'); if (s) s.classList.remove('show');
      haritaCiz();
      if (global.slideBack) global.slideBack('ssOyun', 'ssHarita');
    });
  }

  /* Oyun ekranindan oyun ekranina gecis (kaydirma olmadan) */
  function bolumBaslat2(bolumNo) {
    oyun = global.SuSirala.OyunOlustur(bolumNo);
    secili = -1; perdeModu = false; doken = {}; dolan = {}; akanSayisi = 0;
    var baslik = $('ssLevelTitle');
    if (baslik) baslik.textContent = 'Bölüm ' + bolumNo;
    tahtaKur();
    barYenile();
  }

  /* ---------- Disa acilan arayuz ---------- */

  global.SuSiralaOyun = {
    modYenile: modYenile,
    haritaCiz: haritaCiz,
    bolumBaslat: bolumBaslat,
    baglan: baglan,
    TOPLAM_BOLUM: TOPLAM_BOLUM,
    OZEL_ACILIS: OZEL_ACILIS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baglan);
  } else {
    baglan();
  }

  /* Ilerleme sifirlanirsa harita da sifirlansin */
  if (global.AppReset && global.AppReset.push) {
    global.AppReset.push(function () {
      if (global.AppProgress) { global.AppProgress.ssAcik = 1; global.AppProgress.ssYildiz = {}; global.AppProgress.ssJoker = null; }
      oyun = null;
    });
  }

})(window);
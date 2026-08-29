// marketEkran.js — MARKET'in gorunen yuzu.  (v2: magaza / envanter bolunmesi)
// Sadece DOM isi yapar. Sahiplik/fiyat/vitrin/sandik sorularini AppMarket'e,
// urun gorsellerini AppMarketOnizleme'ye sorar.
//
// MAGAZA   : NO ADS -> gunluk hediye -> sandiklar -> gunun seckisi (4 saatte bir)
// ENVANTER : kategori sekmeleri -> sahip olunan urunler -> Kullan / Kullaniliyor
//
// Dogrudan satin alinabilen TEK yer gunun seckisidir. Geri kalan her sey
// sandiktan cikar.

window.MarketEkran = (function () {
  'use strict';

  var M = window.AppMarket;
  var O = window.AppMarketOnizleme;
  if (!M || !O) { console.error('marketEkran.js: market.js / marketOnizleme.js yuklenmemis'); return {}; }

  var mod = 'magaza';                 // 'magaza' | 'envanter'
  var aktifSekme = 'genel.arkaplan';
  var aktifNadirlik = 'hepsi';        // envanter nadirlik filtresi
  var NADIRLIK_SIRA = ['siradan', 'nadir', 'ender', 'efsanevi'];
  var kuruldu = false;
  var sayacId = null;
  var el = {};

  function q(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------
  // ARKA PLAN TEMASI
  // 1. tur: ana ekran + market. 2. turda ayni degisken oyun ekranlarina yayilacak.
  // ---------------------------------------------------------------
  function arkaplanUygula() {
    var telefon = document.querySelector('.phone');
    if (!telefon) return;
    var v = M.aktif('genel', 'arkaplan');

    if (!v || v.yerlesik) {
      telefon.classList.remove('temali');
      telefon.style.removeProperty('--tema-arka');
      telefon.removeAttribute('data-tema-anim');
      telefon.removeAttribute('data-tema-koyuluk');
      if (M.motifYaz) M.motifYaz(telefon, null);
      telefon.removeAttribute('data-parcacik');
      return;
    }
    telefon.style.setProperty('--tema-arka', v.css);
    telefon.classList.add('temali');
    telefon.setAttribute('data-tema-koyuluk', v.koyuluk || 'koyu');
    if (v.animasyon) telefon.setAttribute('data-tema-anim', v.animasyon);
    else telefon.removeAttribute('data-tema-anim');
    if (M.motifYaz) M.motifYaz(telefon, v.motif);
    if (v.parcacik) telefon.setAttribute('data-parcacik', v.parcacik);
    else telefon.removeAttribute('data-parcacik');
  }

  // ---------------------------------------------------------------
  // IKONLAR
  // ---------------------------------------------------------------
  var KAMERA_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7Z"/>' +
    '<rect x="1" y="5" width="15" height="14" rx="2"/></svg>';

  function koyulastir(hex) {
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);
    function d(x) { x = Math.round(x * 0.42); return (x < 16 ? '0' : '') + x.toString(16); }
    return '#' + d(r) + d(g) + d(b);
  }

  function sandikSVG(renk, koyu) {
    return '<svg class="mk-sandik-svg" viewBox="0 0 64 54" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="6" y="24" width="52" height="26" rx="3" fill="' + renk + '"/>' +
      '<path d="M6 24V17a26 26 0 0 1 52 0v7Z" fill="' + renk + '"/>' +
      '<path d="M12 21a20 20 0 0 1 21-14" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".4"/>' +
      '<rect x="27" y="17" width="10" height="33" fill="' + koyu + '" opacity=".55"/>' +
      '<rect x="6" y="24" width="52" height="26" rx="3" fill="none" stroke="' + koyu + '" stroke-width="2.4"/>' +
      '<path d="M6 24V17a26 26 0 0 1 52 0v7Z" fill="none" stroke="' + koyu + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<rect x="24" y="28" width="16" height="13" rx="2.5" fill="' + koyu + '"/>' +
      '<circle cx="32" cy="34" r="2.6" fill="' + renk + '"/>' +
      '</svg>';
  }

  // ---------------------------------------------------------------
  // KURULUM
  // ---------------------------------------------------------------
  function kur() {
    if (kuruldu) return;

    el.govde     = q('mkGovde');
    el.ustSekme  = q('mkUstSekme');
    el.magaza    = q('mkMagaza');
    el.envanter  = q('mkEnvanter');
    el.noads     = q('mkNoAds');
    el.hediye    = q('mkHediye');
    el.sandiklar = q('mkSandiklar');
    el.vitrin    = q('mkVitrin');
    el.sayac     = q('mkVitrinSayac');
    el.sekmeler  = q('mkSekmeler');
    el.filtre    = q('mkFiltre');
    el.izgara    = q('mkIzgara');
    el.sonuc     = q('mkSonuc');
    el.toast     = q('mkToast');
    if (!el.govde) { console.error('marketEkran: screen-market HTML bloklari eksik'); return; }

    el.ustSekme.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mod]');
      if (!b) return;
      modDegistir(b.getAttribute('data-mod'));
    });

   el.sekmeler.addEventListener('click', function (e) {
      var b = e.target.closest('.mk-sekme');
      if (!b) return;
      aktifSekme = b.getAttribute('data-sekme');
      sekmeleriCiz();
      filtreCiz();
      envanterCiz();
      el.govde.scrollTop = 0;
    });

    el.filtre.addEventListener('click', function (e) {
      var b = e.target.closest('.mk-filtre-btn');
      if (!b) return;
      aktifNadirlik = b.getAttribute('data-nadirlik');
      filtreCiz();
      envanterCiz();
    });

    // fare tekerlegi -> yatay kaydirma (masaustu)
    tekerlekBagla(el.sekmeler);
    tekerlekBagla(el.filtre);
    tekerlekBagla(el.ustSekme);

    el.govde.addEventListener('click', tikla);
    el.sonuc.addEventListener('click', function (e) {
      if (e.target.closest('[data-eylem="sonucKapat"]') || e.target === el.sonuc) sonucKapat();
    });

    var geri = q('marketBackBtn');
    if (geri) geri.addEventListener('click', kapat);

    var giris = q('marketRow');
    if (giris) {
      giris.addEventListener('click', ac);
      giris.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') ac();
      });
    }

    kuruldu = true;
  }

  function modDegistir(yeni) {
    mod = yeni;
    var b = el.ustSekme.querySelectorAll('[data-mod]'), i;
    for (i = 0; i < b.length; i++) b[i].classList.toggle('aktif', b[i].getAttribute('data-mod') === mod);
    el.magaza.style.display   = (mod === 'magaza') ? '' : 'none';
    el.envanter.style.display = (mod === 'envanter') ? '' : 'none';
    el.govde.scrollTop = 0;
    ciz();
  }

  // ---------------------------------------------------------------
  // TIKLAMA
  // ---------------------------------------------------------------
  function tikla(e) {
    var b = e.target.closest('[data-eylem]');
    if (!b || b.disabled) return;
    var eylem = b.getAttribute('data-eylem');
    var id = b.getAttribute('data-id');

    if (eylem === 'al') {
      if (M.satinAl(id)) {
        if (window.AppFX) window.AppFX.tone(660, 990, .18, 'triangle', .18);
        mesaj(M.bul(id).ad + ' alındı');
        ciz();
      } else {
        if (window.AppFX) window.AppFX.vibrate(28);
        mesaj('Jeton yetmiyor');
      }
      return;
    }

    if (eylem === 'sec') {
      if (M.sec(id)) {
        if (window.AppFX) window.AppFX.tone(520, 780, .14, 'triangle', .14);
        if (id.indexOf('genel.arkaplan') === 0) arkaplanUygula();
        if (id.indexOf('h2048.karo') === 0) M.karoTemasiUygula(document.getElementById('board'));
        if (id.indexOf('susirala.sise') === 0) {
          M.siseTemasiUygula(document.getElementById('ssTahta'));
          M.siseTemasiUygula(document.getElementById('ssoSiseler'));
        }
        ciz();
      }
      return;
    }

    if (eylem === 'indirim') {
      b.disabled = true;
      b.classList.add('bekliyor');
      M.indirimAc(id, function (oldu) {
        if (oldu) { mesaj('İndirim açıldı'); ciz(); }
        else { b.disabled = false; b.classList.remove('bekliyor'); mesaj('Reklam tamamlanmadı'); }
      });
      return;
    }

    if (eylem === 'sandik') {
      var s = M.sandikBul(id);
      if (!s) return;
      if (window.AppGold.get() < s.fiyat) {
        if (window.AppFX) window.AppFX.vibrate(28);
        mesaj('Jeton yetmiyor');
        return;
      }
      var sonuc = M.sandikAc(id);
      if (!sonuc) { mesaj('Kutu açılamadı'); return; }
      if (sonuc.tur === 'kapali') { mesaj('Her şeyi topladın, kutuda yeni bir şey yok'); return; }
      if (window.AppFX) window.AppFX.seq([[520, .12, .16, 0], [720, .12, .16, 110], [980, .22, .18, 220]], 'triangle');
      sonucGoster(sonuc);
      ciz();
      return;
    }

    if (eylem === 'hediye') {
      b.disabled = true;
      b.classList.add('bekliyor');
      M.hediyeAl(function (odul) {
        if (odul) {
          if (window.AppFX) window.AppFX.tone(700, 1050, .2, 'triangle', .18);
          sonucGoster({ tur: 'jeton', jeton: odul.jeton, sebep: 'hediye' });
        } else {
          mesaj('Reklam tamamlanmadı');
        }
        ciz();
      });
      return;
    }

    if (eylem === 'noads') {
      // TODO: gercek satin alma akisi. Odeme altyapisi baglaninca burasi degisecek.
      mesaj('Satın alma yakında eklenecek');
      return;
    }
  }

  var toastId = null;
  function mesaj(m) {
    if (!el.toast) return;
    el.toast.textContent = m;
    el.toast.classList.add('gorunur');
    clearTimeout(toastId);
    toastId = setTimeout(function () { el.toast.classList.remove('gorunur'); }, 1800);
  }

  // ---------------------------------------------------------------
  // SANDIK / HEDIYE SONUCU
  // ---------------------------------------------------------------
  function kategoriAdi(id) {
    var ak = id.split('.')[0] + '.' + id.split('.')[1];
    var k = M.kategoriler(), i;
    for (i = 0; i < k.length; i++) if (k[i].anahtar === ak) return k[i].ad;
    return '';
  }

  function sonucGoster(sonuc) {
    var ic;
    if (sonuc.tur === 'urun') {
      var u = sonuc.urun;
      var n = M.nadirlikBilgi(u.nadirlik);
      ic = '<div class="mk-sonuc-kart" data-nadirlik="' + u.nadirlik + '">' +
           '<div class="mk-sonuc-ust">' + n.ad + '</div>' +
           '<div class="mk-sonuc-onizleme">' + O.ciz(u) + '</div>' +
           '<div class="mk-sonuc-ad">' + u.ad + '</div>' +
           '<div class="mk-sonuc-kat">' + kategoriAdi(u.id) + '</div>' +
           '<button class="mk-sonuc-btn" data-eylem="sonucKapat">Harika</button></div>';
    } else {
      ic = '<div class="mk-sonuc-kart" data-nadirlik="efsanevi">' +
           '<div class="mk-sonuc-ust">' + (sonuc.sebep === 'hediye' ? 'Günlük Hediye' : 'Koleksiyon Tamam') + '</div>' +
           '<div class="mk-sonuc-jeton">' + window.CoinSVG(true) + '<span>+' + sonuc.jeton + '</span></div>' +
           '<div class="mk-sonuc-kat">' +
             (sonuc.sebep === 'hediye' ? 'Yarın yine bekleriz' : 'Her şeyi topladın, jeton iadesi') +
           '</div>' +
           '<button class="mk-sonuc-btn" data-eylem="sonucKapat">Tamam</button></div>';
    }
    el.sonuc.innerHTML = ic;
    el.sonuc.classList.add('gorunur');
  }

  function sonucKapat() {
    el.sonuc.classList.remove('gorunur');
    el.sonuc.innerHTML = '';
  }

  // ---------------------------------------------------------------
  // KART
  // ---------------------------------------------------------------
  function kart(urun, satilikMi) {
    var n = M.nadirlikBilgi(urun.nadirlik);
    var ak = urun.id.split('.')[0] + '.' + urun.id.split('.')[1];
    var sahip = M.sahipMi(urun.id);
    var secili = M.seciliId(ak) === urun.id;

    var s = '<div class="mk-kart' + (satilikMi ? ' vitrin' : '') + '" data-nadirlik="' + urun.nadirlik + '">';
    s += '<div class="mk-onizleme">' + O.ciz(urun) + '</div>';
    s += '<div class="mk-ad">' + urun.ad + '</div>';
    s += '<div class="mk-nadirlik">' + n.ad + '</div>';

    if (sahip && secili) {
      s += '<button class="mk-btn secili" disabled>Kullanılıyor</button>';
    } else if (sahip) {
      s += '<button class="mk-btn kullan" data-eylem="sec" data-id="' + urun.id + '">Kullan</button>';
    } else if (satilikMi) {
      var f = M.fiyat(urun.id), temel = M.temelFiyat(urun.id);
      var indirimli = M.indirimliMi(urun.id);
      var yeter = window.AppGold.get() >= f;
      s += '<button class="mk-btn fiyat' + (yeter ? '' : ' pasif') + '"' +
           (yeter ? ' data-eylem="al" data-id="' + urun.id + '"' : ' disabled') + '>' +
           window.CoinSVG(true) +
           (indirimli ? '<s>' + temel + '</s>' : '') +
           '<span>' + f + '</span></button>';
      if (indirimli) {
        s += '<div class="mk-indirim acik">' + KAMERA_SVG + '%50 indirim aktif</div>';
      } else {
        s += '<button class="mk-indirim" data-eylem="indirim" data-id="' + urun.id + '">' +
             KAMERA_SVG + 'İzle · %50 indirim</button>';
      }
    }

    s += '</div>';
    return s;
  }

  // ---------------------------------------------------------------
  // MAGAZA
  // ---------------------------------------------------------------
  function noAdsCiz() {
    if (M.reklamsizMi()) {
      el.noads.className = 'mk-noads alindi';
      el.noads.innerHTML = '<div class="mk-noads-metin"><b>Reklamsız</b>' +
        '<span>Reklamlar kaldırıldı, iyi oyunlar.</span></div><div class="mk-noads-tik">✓</div>';
      return;
    }
    el.noads.className = 'mk-noads';
    el.noads.innerHTML =
      '<div class="mk-noads-rozet">REKLAMSIZ</div>' +
      '<div class="mk-noads-metin"><b>Reklamları kaldır</b>' +
      '<span>Kesintisiz oyun deneyimi</span></div>' +
      '<button class="mk-noads-btn" data-eylem="noads">$2.99</button>';
  }

  function hediyeCiz() {
    if (M.hediyeHazirMi()) {
      el.hediye.className = 'mk-hediye';
      el.hediye.innerHTML =
        '<span class="mk-hediye-yazi">GÜNLÜK ÜCRETSİZ HEDİYE</span>' +
        '<button class="mk-hediye-btn" data-eylem="hediye">' + KAMERA_SVG + 'REKLAM İZLE &amp; AÇ</button>';
    } else {
      el.hediye.className = 'mk-hediye alindi';
      el.hediye.innerHTML =
        '<span class="mk-hediye-yazi">GÜNLÜK HEDİYE ALINDI</span>' +
        '<span class="mk-hediye-sayac" id="mkHediyeSayac">--:--:--</span>';
    }
  }

  function sandiklarCiz() {
    var liste = M.sandiklar(), i, s = '', k, yeter;
    for (i = 0; i < liste.length; i++) {
      k = liste[i];
      yeter = window.AppGold.get() >= k.fiyat && (!M.kalanVarMi || M.kalanVarMi());
      s += '<div class="mk-sandik" style="--sandik-renk:' + k.renk + ';">' +
           sandikSVG(k.renk, koyulastir(k.renk)) +
           '<button class="mk-sandik-btn' + (yeter ? '' : ' pasif') + '"' +
           (yeter ? ' data-eylem="sandik" data-id="' + k.id + '"' : ' disabled') + '>' +
           '<b>' + k.ad.toUpperCase() + '</b>' +
           '<span>' + window.CoinSVG(true) + k.fiyat + '</span></button></div>';
    }
    el.sandiklar.innerHTML = s;
  }

  function vitrinCiz() {
    var v = M.vitrin(), i, h = '';
    if (!v.length) {
      h = '<div class="mk-vitrin-bos">Bu seçkideki her şey sende. Kutulardan yenilerini deneyebilirsin.</div>';
    } else {
      for (i = 0; i < v.length; i++) h += kart(M.bul(v[i]), true);
    }
    el.vitrin.innerHTML = h;
  }

  // ---------------------------------------------------------------
  // ENVANTER
  // ---------------------------------------------------------------
  function sekmeleriCiz() {
    var kats = M.kategoriler(), i, t, h = '';
    for (i = 0; i < kats.length; i++) {
      t = M.toplama(kats[i].anahtar);
      h += '<button class="mk-sekme' + (kats[i].anahtar === aktifSekme ? ' aktif' : '') +
           '" data-sekme="' + kats[i].anahtar + '">' + kats[i].ad +
           '<em>' + t.sahip + '/' + t.toplam + '</em></button>';
    }
    el.sekmeler.innerHTML = h;
  }

  // fare tekerlegini yatay kaydirmaya cevir; dokunmatikte zaten calisiyor
  function tekerlekBagla(kutu) {
    if (!kutu) return;
    kutu.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (kutu.scrollWidth <= kutu.clientWidth + 1) return;
      e.preventDefault();
      kutu.scrollLeft += e.deltaY;
    }, { passive: false });
  }

  function filtreCiz() {
    var liste = M.envanter(aktifSekme);
    var sayim = { hepsi: liste.length }, i, n, h;
    for (i = 0; i < NADIRLIK_SIRA.length; i++) sayim[NADIRLIK_SIRA[i]] = 0;
    for (i = 0; i < liste.length; i++) sayim[liste[i].nadirlik]++;

    // secili filtre bu kategoride bos kaldiysa Hepsi'ye don
    if (aktifNadirlik !== 'hepsi' && !sayim[aktifNadirlik]) aktifNadirlik = 'hepsi';

    h = '<button class="mk-filtre-btn' + (aktifNadirlik === 'hepsi' ? ' aktif' : '') +
        '" data-nadirlik="hepsi">Hepsi<em>' + sayim.hepsi + '</em></button>';
    for (i = 0; i < NADIRLIK_SIRA.length; i++) {
      n = NADIRLIK_SIRA[i];
      h += '<button class="mk-filtre-btn' + (aktifNadirlik === n ? ' aktif' : '') +
           (sayim[n] ? '' : ' bos') + '" data-nadirlik="' + n + '">' +
           M.nadirlikBilgi(n).ad + '<em>' + sayim[n] + '</em></button>';
    }
    el.filtre.innerHTML = h;
  }

  function envanterCiz() {
    var liste = M.envanter(aktifSekme), i, h = '';
    if (aktifNadirlik !== 'hepsi') {
      liste = liste.filter(function (u) { return u.nadirlik === aktifNadirlik; });
    }
    if (!liste.length) {
      h = '<div class="mk-envanter-bos">' +
          (aktifNadirlik === 'hepsi'
            ? 'Bu oyun için henüz bir şeyin yok.<br>Kutulardan ya da günün seçkisinden edinebilirsin.'
            : 'Bu kademede bir şeyin yok.') + '</div>';
    } else {
      for (i = 0; i < liste.length; i++) h += kart(liste[i], false);
    }
    el.izgara.innerHTML = h;
  }

  // ---------------------------------------------------------------
  // CIZ
  // ---------------------------------------------------------------
  function ciz() {
    if (mod === 'magaza') {
      noAdsCiz();
      hediyeCiz();
      sandiklarCiz();
      vitrinCiz();
    } else {
      sekmeleriCiz();
      filtreCiz();
      envanterCiz();
    }
    if (window.AppGold) window.AppGold.render();
  }

  // ---------------------------------------------------------------
  // GERI SAYIMLAR
  // ---------------------------------------------------------------
  function sureYaz(ms) {
    var t = Math.max(0, Math.floor(ms / 1000));
    var sa = Math.floor(t / 3600), dk = Math.floor((t % 3600) / 60), sn = t % 60;
    return (sa < 10 ? '0' : '') + sa + ':' + (dk < 10 ? '0' : '') + dk + ':' + (sn < 10 ? '0' : '') + sn;
  }

  function sayacYaz() {
    if (mod !== 'magaza') return;
    var ms = M.vitrinKalanMs();
    if (ms <= 0) { ciz(); return; }
    if (el.sayac) el.sayac.textContent = sureYaz(ms);

    var hs = q('mkHediyeSayac');
    if (hs) {
      if (M.hediyeHazirMi()) hediyeCiz();
      else hs.textContent = sureYaz(M.hediyeKalanMs());
    }
  }

  // ---------------------------------------------------------------
  // AC / KAPAT
  // ---------------------------------------------------------------
  function ac() {
    kur();
    if (!kuruldu) return;
    modDegistir('magaza');
    sayacYaz();
    clearInterval(sayacId);
    sayacId = setInterval(sayacYaz, 1000);
    if (typeof slideForward === 'function') slideForward('home', 'market');
  }

  function kapat() {
    clearInterval(sayacId);
    sayacId = null;
    sonucKapat();
    if (typeof slideBack === 'function') slideBack('market', 'home');
  }

  // ---------------------------------------------------------------
  // ACILIS
  // ---------------------------------------------------------------
  kur();
  arkaplanUygula();

  if (window.AppReset instanceof Array) {
    window.AppReset.push(function () { arkaplanUygula(); });
  }

  return {
    ac: ac,
    kapat: kapat,
    ciz: ciz,
    arkaplanUygula: arkaplanUygula
  };
})();
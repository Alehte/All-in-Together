// market.js — MARKET mantik katmani.
// Sahiplik, satin alma, secim, gunluk vitrin ve dis API burada.
// Ekran cizimi marketEkran.js icinde, urun onizlemeleri marketOnizleme.js icinde.
//
// Yuklenme sirasi: core.js -> marketKatalog.js -> market.js -> marketOnizleme.js -> marketEkran.js
//
// KAYIT YERLESIMI
//   AppProgress.market = { s:[], a:{}, ri:[], v:{g:'',i:[]} }   -> ilerleme ile sifirlanir
//   AppStore 'ait_noads'                                        -> ilerleme ile SIFIRLANMAZ
// NO ADS gercek parayla alindigi icin ayri anahtarda tutuluyor; "Ilerlemeyi
// Sifirla" tusu ona dokunmaz.

window.AppMarket = (function () {
  'use strict';

  var K = window.AppMarketKatalog;
  if (!K) { console.error('market.js: marketKatalog.js yuklenmemis'); return {}; }

  var NOADS_ANAHTAR = 'ait_noads';
  var INDIRIM_ORANI = 0.5;        // reklam izleyince fiyat yarilanir
  var VITRIN_SAAT = 4;            // vitrin kac saatte bir yenilenir
  var TAMAMLANDI_IADE = 0.5;      // her sey toplanmissa sandik parasinin yarisi geri
  var HEDIYE_JETON = [150, 400];  // gunluk hediye jeton araligi

  // Vitrin slotlari. Her slotta iki nadirlik var, %50/%50 seciliyor.
  var SLOT_HAVUZLARI = [
    ['siradan', 'nadir'],
    ['nadir', 'ender'],
    ['ender', 'efsanevi']
  ];

  // ---------------------------------------------------------------
  // INDEKS + DOGRULAMA
  // ---------------------------------------------------------------
  var URUN = {};          // id -> urun
  var KATEGORI_URUN = {}; // 'oyun.tur' -> [urun]
  var VARSAYILAN = {};    // 'oyun.tur' -> varsayilan urun id

  function katAnahtari(id) {
    var p = id.split('.');
    return p[0] + '.' + p[1];
  }

  // Kacis derilerinde hedef (yesil) yilanin vurgu rengi gercekten yesil mi?
  // Yesil yilan her temada digerlerinden ayirt edilebilir kalmali.
  function yesilMi(hex) {
    if (!hex || hex.charAt(0) !== '#' || hex.length !== 7) return false;
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);
    return g > 90 && g > r + 30 && g > b + 20;
  }

  function indeksle() {
    var i, u, ak;
    for (i = 0; i < K.KATEGORILER.length; i++) {
      KATEGORI_URUN[K.KATEGORILER[i].anahtar] = [];
    }
    for (i = 0; i < K.URUNLER.length; i++) {
      u = K.URUNLER[i];
      ak = katAnahtari(u.id);

      if (!KATEGORI_URUN[ak]) {
        console.warn('market: bilinmeyen kategori, urun atlandi ->', u.id);
        continue;
      }
      if (URUN[u.id]) {
        console.warn('market: yinelenen id, ikincisi atlandi ->', u.id);
        continue;
      }
      // Kacis derisi kurali: hedef yilan tanimi ve yesil vurgu zorunlu.
      if (ak === 'kacis.deri' && !u.veri.yerlesik) {
        if (!u.veri.hedef || !yesilMi(u.veri.hedef.vurgu)) {
          console.warn('market: "' + u.id + '" hedef yilan icin yesil vurgu tanimlamamis, urun devre disi.');
          continue;
        }
      }

      URUN[u.id] = u;
      KATEGORI_URUN[ak].push(u);
      if (u.varsayilan) {
        if (VARSAYILAN[ak]) console.warn('market: "' + ak + '" icinde birden fazla varsayilan var.');
        VARSAYILAN[ak] = u.id;
      }
    }
    for (i = 0; i < K.KATEGORILER.length; i++) {
      ak = K.KATEGORILER[i].anahtar;
      if (!VARSAYILAN[ak]) console.error('market: "' + ak + '" kategorisinin varsayilan urunu yok.');
    }
  }
  indeksle();

  // ---------------------------------------------------------------
  // KAYIT
  // ---------------------------------------------------------------
  var kayit;

  function kayitKur() {
    var m = window.AppProgress.market;
    if (!m || typeof m !== 'object') m = {};
    if (!(m.s instanceof Array)) m.s = [];
    if (!m.a || typeof m.a !== 'object') m.a = {};
    if (!(m.ri instanceof Array)) m.ri = [];
    if (!m.v || typeof m.v !== 'object') m.v = { g: '', i: [] };
    if (typeof m.h !== 'string') m.h = '';   // gunluk hediyenin alindigi gun
    // Katalogdan kalkmis id'leri sessizce temizle.
    m.s = m.s.filter(function (id) { return !!URUN[id]; });
    m.ri = m.ri.filter(function (id) { return !!URUN[id]; });
    var ak;
    for (ak in m.a) {
      if (!URUN[m.a[ak]] || katAnahtari(m.a[ak]) !== ak) delete m.a[ak];
    }

    window.AppProgress.market = m;
    kayit = m;
    onbellegiTemizle();
  }

  function yaz() {
    window.AppSaveProgress({ market: kayit });
  }

  kayitKur();

  // "Ilerlemeyi Sifirla" sonrasi AppProgress bastan kuruluyor; market kaydini
  // yeniden olustur. (NO ADS ayri anahtarda oldugu icin etkilenmez.)
  if (window.AppReset instanceof Array) {
    window.AppReset.push(function () { kayitKur(); });
  }

  // ---------------------------------------------------------------
  // REKLAM KATMANI (taslak)
  // Gercek reklam SDK'si geldiginde SADECE window.AppReklam degisecek,
  // market kodu ayni kalacak. core.js icinde tanimlanirsa oradaki kullanilir.
  // ---------------------------------------------------------------
  if (!window.AppReklam) {
    window.AppReklam = {
      gercek: false,
      odulluIzle: function (bitti) {
        console.warn('AppReklam: gercek reklam altyapisi yok, odul dogrudan veriliyor.');
        setTimeout(function () { bitti(true); }, 1200);
      }
    };
  }

  function reklamsizMi() {
    return window.AppStore ? !!window.AppStore.get(NOADS_ANAHTAR, false) : false;
  }
  function reklamsizYap() {
    if (window.AppStore) window.AppStore.set(NOADS_ANAHTAR, true);
  }

  // ---------------------------------------------------------------
  // SAHIPLIK / FIYAT / SECIM
  // ---------------------------------------------------------------
  function bul(id) { return URUN[id] || null; }

  function sahipMi(id) {
    var u = URUN[id];
    if (!u) return false;
    if (u.varsayilan) return true;
    return kayit.s.indexOf(id) >= 0;
  }

  function indirimliMi(id) {
    return kayit.ri.indexOf(id) >= 0 && !sahipMi(id);
  }

  function fiyat(id) {
    var u = URUN[id];
    if (!u) return 0;
    if (u.varsayilan) return 0;
    var f = (typeof u.fiyat === 'number') ? u.fiyat : K.NADIRLIK[u.nadirlik].fiyat;
    if (indirimliMi(id)) f = Math.round(f * INDIRIM_ORANI);
    return f;
  }

  // Reklam izleyerek bu urune kalici indirim ac. Indirim satin alinana kadar durur.
  function indirimAc(id, bitti) {
    bitti = bitti || function () {};
    if (!URUN[id] || sahipMi(id) || indirimliMi(id)) { bitti(false); return; }
    window.AppReklam.odulluIzle(function (basarili) {
      if (!basarili) { bitti(false); return; }
      kayit.ri.push(id);
      yaz();
      bitti(true);
    });
  }

  function satinAl(id) {
    var u = URUN[id];
    if (!u || sahipMi(id)) return false;
    var f = fiyat(id);
    if (!window.AppGold.harca(f)) return false;

    kayit.s.push(id);
    var ix = kayit.ri.indexOf(id);
    if (ix >= 0) kayit.ri.splice(ix, 1);   // indirim kullanildi
    yaz();
    // Otomatik secmek istersen: sec(id);
    return true;
  }

  function sec(id) {
    if (!sahipMi(id)) return false;
    kayit.a[katAnahtari(id)] = id;
    onbellegiTemizle();
    yaz();
    return true;
  }

  function seciliId(anahtar) {
    return kayit.a[anahtar] || VARSAYILAN[anahtar] || null;
  }

  // ---------------------------------------------------------------
  // AKTIF TEMA — oyunlar cizim yaparken bunu okur.
  // Her karede cagrilabilir; sonuc kategori bazinda onbellege alinir.
  // Asla null donmez; en kotu ihtimalle varsayilan urunun verisi doner.
  // ---------------------------------------------------------------
  var onbellek = {};
  function onbellegiTemizle() { onbellek = {}; }

  function aktif(oyun, tur) {
    var ak = oyun + '.' + tur;
    if (onbellek[ak]) return onbellek[ak];
    var id = seciliId(ak);
    var u = id ? URUN[id] : null;
    var veri = u ? u.veri : { yerlesik: true };
    onbellek[ak] = veri;
    return veri;
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // MOTIF — tum kategorilerde ortak.
  // JS sadece isaretleri yazar, sekli style.css cizer.
  // Degiskenler miras alindigi icin motif tahtaya yazilinca
  // karolarina/hucrelerine de gecer.
  // ---------------------------------------------------------------
  // Zeminin parlakligi. Acik zeminli temalarda bos hucre kuyulari
  // beyaz uzerine beyaz kaliyordu; renk buna gore ters cevriliyor.
  function zeminAcikMi(hex) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length !== 7) return false;
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
  }

  // Kacis cikis animasyonu govde div'lerini gizleyip tek parca SVG cizgi
  // ciziyor; desen div'lere bagli oldugu icin kayboluyordu. Burasi ayni
  // deriyi ust uste polyline katmanlari olarak kurar ve noktalari birlikte
  // guncellenecek diziyi dondurur. Tema secili degilse null doner.
  function deriCizgileri(svg, hedefMi, kalinlik, govdeRengi) {
    var v = aktif('kacis', 'deri');
    if (!v || v.yerlesik) return null;
    var s = hedefMi ? v.hedef : v.govde;
    if (!s) return null;

    var NS = 'http://www.w3.org/2000/svg';
    var w = kalinlik;
    var renk = govdeRengi || (s.renkler && s.renkler[0]) || '#888888';
    var ikinci = (s.renkler && s.renkler[1]) || renk;
    var liste = [];

    function ekle(strok, kal, dash, opak, duzUc) {
      var p = document.createElementNS(NS, 'polyline');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', strok);
      p.setAttribute('stroke-width', kal);
      p.setAttribute('stroke-linecap', duzUc ? 'butt' : 'round');
      p.setAttribute('stroke-linejoin', 'round');
      if (dash) p.setAttribute('stroke-dasharray', dash);
      if (opak != null) p.setAttribute('opacity', opak);
      svg.appendChild(p);
      liste.push(p);
    }

    // 1) kontur / yesil vurgu konturu
    if (hedefMi && s.vurguTip === 'kontur') ekle(s.vurgu, w * 1.30);
    else if (s.kontur) ekle(s.kontur, w * 1.18);

    // 2) govde
    ekle(renk, w);

    // 3) desen
    if (s.tip === 'seritli')      ekle(ikinci, w, (w * 0.42) + ' ' + (w * 0.72), .5, true);
    else if (s.tip === 'benekli') ekle(ikinci, w * 0.42, '0 ' + (w * 0.8), .6);
    else if (s.tip === 'kristal') ekle('#FFFFFF', w * 0.40, (w * 0.5) + ' ' + (w * 0.6), .4);
    else if (s.tip === 'cizgili') ekle(hedefMi ? s.vurgu : ikinci, w * 0.24, null, .85);

    // 4) hedef yilanin yesil isareti
    if (hedefMi && s.vurguTip === 'cizgi' && s.tip !== 'cizgili') ekle(s.vurgu, w * 0.28);
    else if (hedefMi && s.vurguTip === 'damar') ekle(s.vurgu, w * 0.32, (w * 0.3) + ' ' + (w * 0.5), .95);

    return liste;
  }

  // Tema animasyonu: JS sadece adi yazar, hareketi style.css yapar.
  function animYaz(el, ad) {
    if (!el) return;
    if (ad) el.setAttribute('data-tema-anim', ad);
    else el.removeAttribute('data-tema-anim');
  }

  function motifYaz(el, m) {
    if (!el) return;
    if (!m || !m.tip) {
      el.removeAttribute('data-motif');
      el.style.removeProperty('--motif-renk');
      el.style.removeProperty('--motif-opaklik');
      el.style.removeProperty('--motif-boy');
      el.style.removeProperty('--motif-tekrar');
      el.style.removeProperty('--motif-konum');
      return;
    }
    el.setAttribute('data-motif', m.tip);
    // renkler[] verildiyse desen duz renk yerine gradyanla boyanir
    el.style.setProperty('--motif-renk',
      (m.renkler && m.renkler.length > 1)
        ? 'linear-gradient(180deg,' + m.renkler.join(',') + ')'
        : (m.renk || '#FFFFFF'));
    el.style.setProperty('--motif-opaklik', (m.opaklik == null) ? .22 : m.opaklik);
    el.style.setProperty('--motif-boy', m.boy || '22px');
    el.style.setProperty('--motif-tekrar', m.yerlesim === 'merkez' ? 'no-repeat' : 'repeat');
    el.style.setProperty('--motif-konum', m.yerlesim === 'merkez' ? 'center' : '0 0');
  }

  // ---------------------------------------------------------------
  // TEMPO KUP BLOK TEMASI
  // Renk secimini oyun her yeni parcada sorar; kenar/yaricap/doku
  // tahta ve tepsi kabina CSS degiskeni olarak yazilir.
  // ---------------------------------------------------------------
  function blokRengi() {
    var v = aktif('tempo', 'blok');
    if (!v || v.yerlesik || !v.renkler || !v.renkler.length) return null;
    return v.renkler[Math.floor(Math.random() * v.renkler.length)];
  }

  function blokTemasiUygula(el) {
    if (!el) return;
    var v = aktif('tempo', 'blok');
    // aktif() sonucu onbellege alinir, tema degismedikce ayni referansi dondurur.
    // Tempo'da paint() hamle basina birkac kez cagrildigi icin (yerlesim + hat
    // patlatma + afterMove) burasi da o kadar tekrarlaniyordu; --blok-kenar gibi
    // mirasli ozellikler her yazimda tum tahta/tepsiyi yeniden stil hesabina
    // sokuyordu. Tema gercekten degismediyse atla.
    if (el._temaRef === v) return;
    el._temaRef = v;

    if (!v || v.yerlesik || !v.renkler) {
      el.classList.remove('temali', 'blok-parlak');
      el.removeAttribute('data-doku');
      el.style.removeProperty('--blok-kenar');
      el.style.removeProperty('--blok-yaricap');
      motifYaz(el, null);
      animYaz(el, null);
      return;
    }
    el.style.setProperty('--blok-kenar', v.kenar || 'rgba(255,255,255,.2)');
    el.style.setProperty('--blok-yaricap', v.koseYaricap || '18%');
    if (v.doku) el.setAttribute('data-doku', v.doku); else el.removeAttribute('data-doku');
    el.classList.toggle('blok-parlak', !!v.parlama);
    motifYaz(el, v.motif);
    animYaz(el, v.animasyon);
    el.classList.add('temali');
  }

  // ---------------------------------------------------------------
  // SIRALA DUR KAPAK SEKILLERI
  // Her fonksiyon 24x16 viewBox'a gore kucuk bir SVG ikon dondurur.
  // Sekil adlari marketKatalog.js'teki kapakSekil alaniyla eslesir.
  // ---------------------------------------------------------------
  var KAPAK_SEKILLER = {
    duz: function (r) {
      return '<rect x="1" y="3" width="22" height="10" rx="3" fill="' + r + '"/>' +
             '<rect x="3" y="4.5" width="18" height="1.6" rx=".8" fill="#fff" opacity=".35"/>';
    },
    'duz-vida': function (r) {
      return '<rect x="1" y="3" width="22" height="10" rx="3" fill="' + r + '"/>' +
             '<rect x="3" y="4.5" width="18" height="1.4" rx=".7" fill="#fff" opacity=".3"/>' +
             '<path d="M4 9h16M4 11h16" stroke="rgba(0,0,0,.28)" stroke-width="1" stroke-linecap="round"/>';
    },
    mantar: function (r) {
      return '<path d="M6 2c0-1.6 1.4-2 6-2s6 .4 6 2v9c0 1.8-2.6 3-6 3s-6-1.2-6-3V2Z" fill="' + r + '"/>' +
             '<ellipse cx="12" cy="2" rx="6" ry="1.6" fill="#fff" opacity=".25"/>' +
             '<path d="M7 5h10M7 8h10" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>';
    },
    muhur: function (r) {
      return '<circle cx="12" cy="8" r="7" fill="' + r + '"/>' +
             '<circle cx="12" cy="8" r="7" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>' +
             '<circle cx="12" cy="8" r="2.4" fill="#fff" opacity=".55"/>';
    },
    kiraz: function (r) {
      return '<path d="M9 9c1.5-3 3-4.4 3.6-6.4M15 9c1.2-3.2 2.2-4.6 2.6-6.6" stroke="#3E6B32" ' +
             'stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
             '<circle cx="8.6" cy="10.2" r="3.6" fill="' + r + '"/>' +
             '<circle cx="15.6" cy="10.4" r="3.6" fill="' + r + '"/>' +
             '<circle cx="7.4" cy="8.8" r="1" fill="#fff" opacity=".4"/>' +
             '<circle cx="14.4" cy="9" r="1" fill="#fff" opacity=".4"/>';
    },
    fiyonk: function (r) {
      return '<path d="M12 8c-1-3-4-4.6-7-3.6-2 .7-2 3.4 0 4.6 2 1.2 5.6.6 7-1z" fill="' + r + '"/>' +
             '<path d="M12 8c1-3 4-4.6 7-3.6 2 .7 2 3.4 0 4.6-2 1.2-5.6.6-7-1z" fill="' + r + '"/>' +
             '<circle cx="12" cy="8" r="1.8" fill="' + r + '" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>';
    },
    petek: function (r) {
      return '<path d="M12 1.4 20 6v8l-8 4.6L4 14V6Z" fill="' + r + '"/>' +
             '<path d="M12 1.4 20 6v8l-8 4.6L4 14V6Z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>' +
             '<path d="M12 5 16.4 7.5v5L12 15l-4.4-2.5v-5Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".7"/>';
    },
    inci: function (r) {
      return '<circle cx="12" cy="8.6" r="6.2" fill="' + r + '"/>' +
             '<ellipse cx="9.6" cy="6.2" rx="2.2" ry="1.4" fill="#fff" opacity=".55"/>';
    },
    lale: function (r) {
      return '<path d="M12 2c1.7 0 3 1.5 3 3.6 0 2.4-1.3 4.2-3 5.6-1.7-1.4-3-3.2-3-5.6C9 3.5 10.3 2 12 2Z" fill="' + r + '"/>' +
             '<path d="M12 2c1.7 0 3 1.5 3 3.6 0 2.4-1.3 4.2-3 5.6" fill="none" stroke="rgba(0,0,0,.2)" stroke-width=".6"/>';
    },
    kristal: function (r) {
      return '<path d="M12 1 20 6l-3.4 8H7.4L4 6Z" fill="' + r + '"/>' +
             '<path d="M12 1 20 6l-3.4 8H7.4L4 6Z" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>' +
             '<path d="M12 1 12 14M4 6h16M7.4 14 9 6M16.6 14 15 6" stroke="rgba(255,255,255,.3)" stroke-width=".6"/>';
    },
    disli: function (r) {
      return '<path fill-rule="evenodd" d="M12 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2zm0 2.4a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z" fill="' + r + '"/>' +
             '<path d="M11 .8h2v2.6h-2zM11 10.6h2v2.6h-2zM.8 7h2.6v2H.8zM20.6 7h2.6v2h-2.6z" fill="' + r + '"/>';
    },
    aycicek: function (r) {
      return '<g fill="' + r + '">' +
             '<ellipse cx="12" cy="2.6" rx="1.8" ry="2.4"/><ellipse cx="12" cy="13.4" rx="1.8" ry="2.4"/>' +
             '<ellipse cx="4.2" cy="8" rx="2.4" ry="1.8"/><ellipse cx="19.8" cy="8" rx="2.4" ry="1.8"/>' +
             '<ellipse cx="6.6" cy="3.4" rx="1.8" ry="2.4" transform="rotate(-45 6.6 3.4)"/>' +
             '<ellipse cx="17.4" cy="12.6" rx="1.8" ry="2.4" transform="rotate(-45 17.4 12.6)"/>' +
             '<ellipse cx="17.4" cy="3.4" rx="1.8" ry="2.4" transform="rotate(45 17.4 3.4)"/>' +
             '<ellipse cx="6.6" cy="12.6" rx="1.8" ry="2.4" transform="rotate(45 6.6 12.6)"/></g>' +
             '<circle cx="12" cy="8" r="3.4" fill="#4A2E0E"/>';
    },
    alev: function (r) {
      return '<path d="M12 1c2.4 3 4.4 5.4 4.4 8.4a4.4 4.4 0 1 1-8.8 0c0-1 .3-1.8.8-2.6.2.9.9 1.5 1.6 1.5.8 0 1.2-.7 1-1.6C10.4 4.8 12 3 12 1Z" fill="' + r + '"/>' +
             '<path d="M12 6.4c1 1.6 1.8 2.8 1.8 4.2a1.8 1.8 0 1 1-3.6 0c0-.5.1-.9.3-1.3.2.5.5.8.9.8.5 0 .7-.4.6-.9C11.7 8.3 12 7.3 12 6.4Z" fill="#FFE29A"/>';
    }
  };

  function kapakSvgUret(sekil, renk) {
    var f = KAPAK_SEKILLER[sekil] || KAPAK_SEKILLER.duz;
    return '<svg class="ss-kapak-kapak" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg">' +
           f(renk || '#D93A3A') + '</svg>';
  }

  // Aktif sise temasinin kapak SVG'sini dondurur. Tema yoksa/varsayilansa
  // gorunmez zaten (CSS gizler) ama yine de guvenli bir varsayilan doner.
  function siseKapakSvg() {
    var v = aktif('susirala', 'sise');
    if (!v || v.yerlesik) return kapakSvgUret('duz', '#D93A3A');
    return kapakSvgUret(v.kapakSekil || 'duz', v.kapakRenk || '#D93A3A');
  }

  // ---------------------------------------------------------------
  // SIRALA DUR SISE + KAPAK TEMASI
  // Sise govde SILUETI (data-govde) ve kapak (kapakSekil/kapakRenk)
  // burada tahtaya isaretlenir; gercek cizim CSS (govde) ve yukaridaki
  // kapakSvgUret (kapak) tarafindan yapilir. Varsayilanda kapak
  // TAMAMEN gizlenir.
  // ---------------------------------------------------------------
  function siseTemasiUygula(el) {
    if (!el) return;
    var v = aktif('susirala', 'sise');

    if (!v || v.yerlesik) {
      el.classList.remove('temali');
      el.removeAttribute('data-sise-tema');
      el.removeAttribute('data-kapak-zorluk');
      el.removeAttribute('data-govde');
      el.style.removeProperty('--kapak-renk');
      motifYaz(el, null);
      animYaz(el, null);
      return;
    }

    el.setAttribute('data-sise-tema', '1');
    el.setAttribute('data-kapak-zorluk', v.kapakZorluk || 'basit');
    if (v.govde) el.setAttribute('data-govde', v.govde); else el.removeAttribute('data-govde');
    el.style.setProperty('--kapak-renk', v.kapakRenk || '#D93A3A');
    motifYaz(el, v.motif);
    animYaz(el, v.animasyon);
    el.classList.add('temali');
  }
  // ---------------------------------------------------------------
  // KACIS YILAN DERISI
  // JS sadece rengi ve tip/vurgu isaretlerini yazar; deseni CSS cizer.
  // ONEMLI: ozel bolumlerde cagrilmaz — cagrim kacis.js icinde kosullu.
  // ---------------------------------------------------------------
  function deriUygula(el, sira, hedefMi, varsayilanRenk) {
    if (!el) return false;
    var v = aktif('kacis', 'deri');

    // varsayilan deri: hicbir seyi ezme
    if (!v || v.yerlesik) {
      el.classList.remove('temali', 'deri-parlak');
      el.removeAttribute('data-deri');
      el.removeAttribute('data-vurgu');
      el.style.removeProperty('--deri-kontur');
      el.style.removeProperty('--deri-vurgu');
      if (varsayilanRenk) el.style.backgroundColor = varsayilanRenk;
      motifYaz(el, null);
      animYaz(el, null);
      return false;
    }

    var s = hedefMi ? v.hedef : v.govde;
    if (!s || !s.renkler || !s.renkler.length) return false;

    el.style.backgroundColor = s.renkler[(sira || 0) % s.renkler.length];
    el.style.setProperty('--deri-kontur', s.kontur || 'transparent');
    el.setAttribute('data-deri', s.tip || 'duz');

    if (hedefMi && s.vurgu) {
      el.style.setProperty('--deri-vurgu', s.vurgu);
      el.setAttribute('data-vurgu', s.vurguTip || 'cizgi');
    } else {
      el.removeAttribute('data-vurgu');
    }

    motifYaz(el, v.motif);
    animYaz(el, v.animasyon);
    el.classList.add('temali');
    el.classList.toggle('deri-parlak', !!s.parlak);
    return true;
  }

  // ---------------------------------------------------------------
  // 2048 KARO TEMASI
  // Renkler CSS'ten geliyor; burasi sadece degiskenleri .board uzerine yazar.
  // ---------------------------------------------------------------
  var KARO_DEGERLERI = ['2','4','8','16','32','64','128','256','512','1024','2048','wild','kilit','duvar'];

  function rgbUclusu(hex) {
    if (!hex || hex.charAt(0) !== '#' || hex.length !== 7) return '47 224 122';
    return parseInt(hex.substr(1, 2), 16) + ' ' +
           parseInt(hex.substr(3, 2), 16) + ' ' +
           parseInt(hex.substr(5, 2), 16);
  }

  function karoTemasiUygula(el) {
    if (!el) return;
    var v = aktif('h2048', 'karo'), i, d, p;

    // varsayilan tema: hicbir seyi ezme, CSS'teki mevcut renkler kalsin
    if (!v || v.yerlesik || !v.palet) {
      el.classList.remove('temali');
      for (i = 0; i < KARO_DEGERLERI.length; i++) {
        d = KARO_DEGERLERI[i];
        el.style.removeProperty('--tv-' + d + 'b');
        el.style.removeProperty('--tv-' + d + 'f');
      }
      el.style.removeProperty('--tema-zemin');
      el.style.removeProperty('--t-glow');
      el.style.removeProperty('--tema-glow');
      el.removeAttribute('data-koyuluk');
      motifYaz(el, null);
      animYaz(el, null);
      return;
    }

    for (i = 0; i < KARO_DEGERLERI.length; i++) {
      d = KARO_DEGERLERI[i];
      p = v.palet[d];
      if (!p) continue;
      el.style.setProperty('--tv-' + d + 'b', p[0]);
      el.style.setProperty('--tv-' + d + 'f', p[1]);
    }
    el.style.setProperty('--tema-zemin', v.zemin || '#182236');
    // parilti rengi temanin en parlak karosundan turetilir
    el.style.setProperty('--t-glow', rgbUclusu(v.palet['2048'] ? v.palet['2048'][0] : null));
    el.style.setProperty('--tema-bos', zeminAcikMi(v.zemin) ? 'rgba(0,0,0,.11)' : 'rgba(255,255,255,.055)');
    el.style.setProperty('--tema-glow', rgbUclusu(v.palet['2048'] ? v.palet['2048'][0] : null));
    el.setAttribute('data-koyuluk', zeminAcikMi(v.zemin) ? 'acik' : 'koyu');
    motifYaz(el, v.motif);
    animYaz(el, v.animasyon);
    el.classList.add('temali');
  }

  // ---------------------------------------------------------------
  // GUNLUK VITRIN
  // Tohum tarihten uretilir -> sayfa yenilense de gun icinde ayni vitrin cikar.
  // ---------------------------------------------------------------
  function bugun() {
    var d = new Date();
    var a = d.getMonth() + 1, g = d.getDate();
    return d.getFullYear() + '-' + (a < 10 ? '0' : '') + a + '-' + (g < 10 ? '0' : '') + g;
  }

  // Vitrin gunde VITRIN_SAAT saatte bir yenilenir: gun + o gunun kacinci dilimi
  function dilimAnahtari() {
    return bugun() + '-' + Math.floor(new Date().getHours() / VITRIN_SAAT);
  }

  function tohumla(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  function uretici(tohum) {
    var t = tohum >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Belirli nadirlikten, sahip olunmayan, vitrine uygun ve henuz secilmemis urunler
  function havuz(nadirlik, secilmisler) {
    var out = [], i, u;
    for (i = 0; i < K.URUNLER.length; i++) {
      u = K.URUNLER[i];
      if (!URUN[u.id]) continue;              // dogrulamada elenmis
      if (u.vitrinDisi || u.varsayilan) continue;
      if (nadirlik && u.nadirlik !== nadirlik) continue;
      if (sahipMi(u.id)) continue;
      if (secilmisler.indexOf(u.id) >= 0) continue;
      out.push(u.id);
    }
    return out;
  }

  function vitrinUret() {
    var rnd = uretici(tohumla('vitrin-' + dilimAnahtari()));
    var secilmisler = [], slot, ikili, n, h;

    for (slot = 0; slot < SLOT_HAVUZLARI.length; slot++) {
      ikili = SLOT_HAVUZLARI[slot];
      n = (rnd() < 0.5) ? ikili[0] : ikili[1];

      h = havuz(n, secilmisler);
      // O nadirlik tukendiyse slotun diger nadirligine, o da bostsa genel havuza dus.
      if (!h.length) h = havuz(n === ikili[0] ? ikili[1] : ikili[0], secilmisler);
      if (!h.length) h = havuz(null, secilmisler);
      if (!h.length) break;                    // her sey satin alinmis

      secilmisler.push(h[Math.floor(rnd() * h.length)]);
    }
    return secilmisler;
  }

  function vitrin() {
    if (kayit.v.g !== dilimAnahtari()) {
      kayit.v = { g: dilimAnahtari(), i: vitrinUret() };
      yaz();
    }
    // Katalogdan kalkmis id'leri gosterme
    return kayit.v.i.filter(function (id) { return !!URUN[id]; });
  }

  // Vitrinin yenilenmesine kalan sure (ms) — geri sayim icin
  function vitrinKalanMs() {
    var d = new Date();
    var sonraki = (Math.floor(d.getHours() / VITRIN_SAAT) + 1) * VITRIN_SAAT;
    var hedef = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    hedef.setHours(sonraki);
    return hedef.getTime() - d.getTime();
  }

  // ---------------------------------------------------------------
  // SANDIKLAR
  // Cekilis once nadirligi secer, sonra o nadirlikten SAHIP OLUNMAYAN bir
  // urun verir. Ayni urun iki kez cikmaz; bir nadirlik tukendiyse en yakin
  // dolu nadirlige duser. Her sey toplanmissa jeton iadesi yapilir.
  // ---------------------------------------------------------------
  var NADIRLIK_SIRA = ['siradan', 'nadir', 'ender', 'efsanevi'];

  function sandikBul(sid) {
    var i;
    for (i = 0; i < K.SANDIKLAR.length; i++) {
      if (K.SANDIKLAR[i].id === sid) return K.SANDIKLAR[i];
    }
    return null;
  }

  function nadirlikCek(ihtimal) {
    var r = Math.random(), t = 0, i, n;
    for (i = 0; i < NADIRLIK_SIRA.length; i++) {
      n = NADIRLIK_SIRA[i];
      t += (ihtimal[n] || 0);
      if (r < t) return n;
    }
    return 'siradan';
  }

  // Istenen nadirlik bossa en yakin dolu nadirligi bul
  function enYakinHavuz(n) {
    var ix = NADIRLIK_SIRA.indexOf(n), mesafe, i, aday, h;
    for (mesafe = 1; mesafe < NADIRLIK_SIRA.length; mesafe++) {
      for (i = 0; i < 2; i++) {
        aday = NADIRLIK_SIRA[ix + (i === 0 ? -mesafe : mesafe)];
        if (!aday) continue;
        h = havuz(aday, []);
        if (h.length) return h;
      }
    }
    return [];
  }

  // { tur:'urun', urun:{...} }  ya da  { tur:'jeton', jeton:n }  ya da null
  // Toplanacak bir sey kalmadiysa kutu hic acilmasin — jeton da harcanmasin.
  function kalanVarMi() {
    var id, u;
    for (id in URUN) {
      if (!URUN.hasOwnProperty(id)) continue;
      u = URUN[id];
      if (u.varsayilan) continue;
      if (!sahipMi(id)) return true;
    }
    return false;
  }

  function sandikAc(sid) {
    var s = sandikBul(sid);
    if (!s) return null;
    if (!kalanVarMi()) return { tur: 'kapali' };
    if (!window.AppGold.harca(s.fiyat)) return null;

    // Nadirlik bir kez cekilir; o kademe bossa en yakin dolu kademeye dusulur.
    var kademe = nadirlikCek(s.ihtimal);
    var h = havuz(kademe, []);
    if (!h.length) h = enYakinHavuz(kademe);

    if (!h.length) {
      window.AppGold.add(s.fiyat);   // beklenmedik durum: parayi geri ver
      return { tur: 'kapali' };
    }

    var id = h[Math.floor(Math.random() * h.length)];
    kayit.s.push(id);
    var ix = kayit.ri.indexOf(id);
    if (ix >= 0) kayit.ri.splice(ix, 1);
    yaz();
    return { tur: 'urun', urun: URUN[id] };
  }

  // ---------------------------------------------------------------
  // GUNLUK HEDIYE — reklam izleyerek gunde bir kez
  // ---------------------------------------------------------------
  function hediyeHazirMi() { return kayit.h !== bugun(); }

  function hediyeAl(bitti) {
    bitti = bitti || function () {};
    if (!hediyeHazirMi()) { bitti(null); return; }
    window.AppReklam.odulluIzle(function (basarili) {
      if (!basarili) { bitti(null); return; }
      var j = HEDIYE_JETON[0] + Math.floor(Math.random() * (HEDIYE_JETON[1] - HEDIYE_JETON[0] + 1));
      j = Math.round(j / 10) * 10;
      window.AppGold.add(j);
      kayit.h = bugun();
      yaz();
      bitti({ jeton: j });
    });
  }

  // Bir sonraki hediyeye kalan sure (ms)
  function hediyeKalanMs() {
    if (hediyeHazirMi()) return 0;
    var d = new Date();
    var yarin = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return yarin.getTime() - d.getTime();
  }

  // ---------------------------------------------------------------
  // ENVANTER
  // ---------------------------------------------------------------
  function envanter(anahtar) {
    return (KATEGORI_URUN[anahtar] || []).filter(function (u) { return sahipMi(u.id); });
  }

  function toplama(anahtar) {
    var t = KATEGORI_URUN[anahtar] || [];
    return { sahip: envanter(anahtar).length, toplam: t.length };
  }

  // ---------------------------------------------------------------
  // EKRAN
  // ---------------------------------------------------------------
  function ekraniAc() {
    if (window.MarketEkran && window.MarketEkran.ac) window.MarketEkran.ac();
    else console.warn('market: marketEkran.js yuklenmemis');
  }

  // ---------------------------------------------------------------
  // DIS API
  // ---------------------------------------------------------------
  return {
    // istenen cekirdek API
    sahipMi: sahipMi,
    satinAl: satinAl,
    sec: sec,
    aktif: aktif,
    ekraniAc: ekraniAc,

    // ekranin kullandigi yardimcilar
    bul: bul,
    kategoriler: function () { return K.KATEGORILER; },
    urunler: function (anahtar) { return KATEGORI_URUN[anahtar] || []; },
    nadirlikBilgi: function (n) { return K.NADIRLIK[n]; },
    seciliId: seciliId,
    fiyat: fiyat,
    temelFiyat: function (id) {
      var u = URUN[id];
      if (!u || u.varsayilan) return 0;
      return (typeof u.fiyat === 'number') ? u.fiyat : K.NADIRLIK[u.nadirlik].fiyat;
    },
    indirimliMi: indirimliMi,
    indirimAc: indirimAc,
    alinabilirMi: function (id) { return !sahipMi(id) && window.AppGold.get() >= fiyat(id); },
    vitrin: vitrin,
    vitrinKalanMs: vitrinKalanMs,
    reklamsizMi: reklamsizMi,
    reklamsizYap: reklamsizYap,

    // oyun baglantilari
    karoTemasiUygula: karoTemasiUygula,
    deriUygula: deriUygula,
    blokRengi: blokRengi,
    siseTemasiUygula: siseTemasiUygula,
    siseKapakSvg: siseKapakSvg,
    blokTemasiUygula: blokTemasiUygula,
    motifYaz: motifYaz,
    animYaz: animYaz,
    deriCizgileri: deriCizgileri,
    kapakSvgUret: kapakSvgUret,
    sandiklar: function () { return K.SANDIKLAR; },
    sandikBul: sandikBul,
    sandikAc: sandikAc,
    hediyeHazirMi: hediyeHazirMi,
    hediyeAl: hediyeAl,
    hediyeKalanMs: hediyeKalanMs,
    envanter: envanter,
    toplama: toplama
  };
})();
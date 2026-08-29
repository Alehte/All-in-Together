// marketOnizleme.js — market kartlarindaki mini urun gorselleri.  (v2)
// Tek is yapar: bir urun nesnesi alir, HTML metni dondurur. DOM'a dokunmaz,
// kayit okumaz. marketEkran.js bunu cagirip kartin icine basar.
//
// Yuklenme sirasi: core.js -> marketKatalog.js -> market.js -> marketOnizleme.js -> marketEkran.js
//
// v2'de degisen:
//   - her onizleme kendi renklerinden turetilen gradyanlar kullaniyor (duz fill bitti)
//   - ortak "sahne" katmani: ustten isik + kenarlarda vinyet -> derinlik hissi
//   - yilanin kafasi ayri ciziliyor (goz + dil), altinda golge var
//   - 2048 tahtasi kuyulu: bos hucre + karo + ust isik seridi, 2048'de halka
//   - bloklar kabarik: alt koyu serit + ust gloss + golge
//   - urun verisinde `gorsel:'img/...'` varsa SVG yerine o gorsel basiliyor
//
// Onizlemeler kasitli olarak "kural gosterir":
//   - yilan derisinde ustte normal, altta hedef (yesil) yilan yan yana durur.
//   - sisede uc dolu katman cizilir, katman sinirlari gorunur kalmali.
//   - karoda 2 / 8 / 64 / 2048 birlikte cizilir, sayi okunurlugu gorunur.

window.AppMarketOnizleme = (function () {
  'use strict';

  var sayac = 0;   // gradyan / clipPath id'leri icin

  // ---------------------------------------------------------------
  // VARSAYILAN GORUNUMLER
  // Katalogda varsayilan urunlerin verisi { yerlesik:true }. Oyun onlari
  // ezmez ama onizlemede bir sey cizmek gerekiyor.
  // NOT: kacis.deri.varsayilan ve tempo.blok.varsayilan renkleri tahmini.
  // ---------------------------------------------------------------
  var YERLESIK = {
    'genel.arkaplan': {
      css: 'url(img/home-bg.jpg) center/cover no-repeat'
    },
    'kacis.deri': {
      govde: { tip: 'duz', renkler: ['#5E9BD8', '#C4645E', '#8A5EC4'], kontur: '#1B2437' },
      hedef: { tip: 'duz', renkler: ['#7FDB98'], kontur: '#2E7D46', vurgu: '#2FE07A', vurguTip: 'kontur' }
    },
    'susirala.sise': {},
    'h2048.karo': {
      zemin: '#182236',
      palet: {
        '2': ['#16281F', '#7FE8A8'], '8': ['#184023', '#98F7BC'],
        '64': ['#146A31', '#BEFFDA'], '2048': ['#2FE07A', '#04240F']
      }
    },
    'tempo.blok': {
      renkler: ['#6FD3FF', '#B78BFF', '#FFD166', '#4FE0A0', '#FF8FA3'],
      kenar: null, koseYaricap: '18%', doku: null, parlama: false
    }
  };

  function katAnahtari(id) {
    var p = id.split('.');
    return p[0] + '.' + p[1];
  }

  function veriAl(urun) {
    var ak = katAnahtari(urun.id);
    return (urun.veri && urun.veri.yerlesik) ? YERLESIK[ak] : urun.veri;
  }

  // ---------------------------------------------------------------
  // RENK YARDIMCILARI
  // hex olmayan degerler (rgba, isim) oldugu gibi geri doner.
  // ---------------------------------------------------------------
  function hexMi(c) { return typeof c === 'string' && c.charAt(0) === '#' && c.length === 7; }

  function ikiHane(x) {
    x = Math.max(0, Math.min(255, Math.round(x)));
    return (x < 16 ? '0' : '') + x.toString(16);
  }

  function kar(hex, hr, hg, hb, oran) {
    if (!hexMi(hex)) return hex;
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);
    return '#' + ikiHane(r + (hr - r) * oran) +
                 ikiHane(g + (hg - g) * oran) +
                 ikiHane(b + (hb - b) * oran);
  }
  function acik(hex, o) { return kar(hex, 255, 255, 255, o); }
  function koyu(hex, o) { return kar(hex, 0, 0, 0, o); }

  // ---------------------------------------------------------------
  // SVG ISKELETI + ORTAK SAHNE
  // ---------------------------------------------------------------
  function yeniId(on) { sayac++; return 'mo' + on + sayac; }

  function svgAc(ekSinif) {
    return '<svg class="mo-svg ' + (ekSinif || '') + '" viewBox="0 0 100 70" ' +
           'preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">';
  }

  function dikeyGrad(id, ust, alt) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0" stop-color="' + ust + '"/>' +
           '<stop offset="1" stop-color="' + alt + '"/></linearGradient>';
  }

  // ustten gelen isik + kenar vinyeti. Ikisi de icerigin USTUNE cizilir.
  function sahneDefs(vid, lid) {
    return '<radialGradient id="' + vid + '" cx="50%" cy="38%" r="78%">' +
           '<stop offset="42%" stop-color="#000000" stop-opacity="0"/>' +
           '<stop offset="100%" stop-color="#000000" stop-opacity=".42"/></radialGradient>' +
           '<linearGradient id="' + lid + '" x1="0" y1="0" x2="1" y2="1">' +
           '<stop offset="0" stop-color="#FFFFFF" stop-opacity=".15"/>' +
           '<stop offset="52%" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>';
  }

  function sahneUst(vid, lid) {
    return '<rect x="0" y="0" width="100" height="70" fill="url(#' + lid + ')"/>' +
           '<rect x="0" y="0" width="100" height="70" fill="url(#' + vid + ')"/>';
  }

  // ---------------------------------------------------------------
  // MOTIF
  // Sekiller style.css'te mask olarak da tanimli; burasi ayni sekli
  // SVG pattern'i olarak kuruyor. Tip adlari iki yerde AYNI olmali.
  // ---------------------------------------------------------------
  var MOTIF = {
    lale:  { tip: 'dolu',
             d: 'M12 3c1.8 0 3.2 1.6 3.2 3.9 0 2.6-1.4 4.6-3.2 6.2-1.8-1.6-3.2-3.6-3.2-6.2C8.8 4.6 10.2 3 12 3z M11.4 13.6h1.2V21h-1.2z' },
    bolme: { tip: 'cizgi', kalinlik: 1.6,
             d: 'M0 12 12 0 24 12 12 24Z M12 0V24 M0 12H24' },
    disli: { tip: 'dolu', kural: 'evenodd',
             d: 'M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2zm0 3.4a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z M11 1.4h2v3.4h-2z M11 19.2h2v3.4h-2z M1.4 11h3.4v2H1.4z M19.2 11h3.4v2h-3.4z' },
    yay:   { tip: 'cizgi', kalinlik: 1.4,
             d: 'M-2 22a14 14 0 0 1 28 0 M2 22a10 10 0 0 1 20 0 M6 22a6 6 0 0 1 12 0' },
    cini:  { tip: 'ham',
             ham: '<path fill="none" stroke="%R%" stroke-width="1.1" d="M2.4 3.8h19.2v16.4H2.4z"/>' +
                  '<path fill="none" stroke="%R%" stroke-width=".8" d="M4.6 6h14.8v12H4.6z"/>' +
                  '<g fill="%R%"><circle cx="12" cy="8.8" r="2"/><circle cx="12" cy="15.2" r="2"/>' +
                  '<circle cx="8.8" cy="12" r="2"/><circle cx="15.2" cy="12" r="2"/>' +
                  '<circle cx="12" cy="12" r="1.4"/></g>' },
    yildiz:{ tip: 'dolu',
             d: 'M12 1.6c.7 5.4 4.3 9 9.7 9.7-5.4.7-9 4.3-9.7 9.7-.7-5.4-4.3-9-9.7-9.7 5.4-.7 9-4.3 9.7-9.7z' },
    catlak:{ tip: 'cizgi', kalinlik: 1.5,
             d: 'M4 1 L9 8 L6 13 L11 19 L9 23 M9 8 L16 6 M11 19 L18 21 M16 6 L21 11 L18 16' }
  };

  // { defs, ust } dondurur; ikisi de bos olabilir.
  function motifKatmani(m) {
    if (!m || !m.tip || !MOTIF[m.tip]) return { defs: '', ust: '' };
    var mo = MOTIF[m.tip];
    var pid = yeniId('mot');
    var renk = m.renk || '#FFFFFF';
    var gradDef = '';
    if (m.renkler && m.renkler.length > 1) {
      var gid = yeniId('mgrad'), gi, oran;
      gradDef = '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">';
      for (gi = 0; gi < m.renkler.length; gi++) {
        oran = (gi / (m.renkler.length - 1)).toFixed(3);
        gradDef += '<stop offset="' + oran + '" stop-color="' + m.renkler[gi] + '"/>';
      }
      gradDef += '</linearGradient>';
      renk = 'url(#' + gid + ')';
    }
    var boy = parseFloat(m.boy || '22');
    if (!(boy > 0)) boy = 22;
    var yuzdeMi = (typeof m.boy === 'string' && m.boy.indexOf('%') > 0);
    // yuzde: elemanin boyutuna oranli. px: dogrudan olcek.
    var b = Math.max(9, Math.min(34, yuzdeMi ? boy * 0.34 : boy * 0.6));
    var o = (m.opaklik == null) ? 0.22 : m.opaklik;
    var ic;

    if (mo.tip === 'ham') {
      ic = mo.ham.replace(/%R%/g, renk);
    } else if (mo.tip === 'cizgi') {
      ic = '<path d="' + mo.d + '" fill="none" stroke="' + renk +
           '" stroke-width="' + (mo.kalinlik || 1.5) + '" stroke-linecap="round"/>';
    } else {
      ic = '<path d="' + mo.d + '" fill="' + renk + '"' +
           (mo.kural ? ' fill-rule="' + mo.kural + '"' : '') + '/>';
    }

    return {
      defs: gradDef +
            '<pattern id="' + pid + '" width="' + b + '" height="' + b + '" patternUnits="userSpaceOnUse">' +
            '<g transform="scale(' + (b / 24) + ')">' + ic + '</g></pattern>',
      ust: '<rect x="0" y="0" width="100" height="70" fill="url(#' + pid + ')" opacity="' + o + '"/>'
    };
  }

  // ===============================================================
  // ARKA PLAN — SVG degil, CSS zemini olan bir kutu.
  // Isik, vinyet ve motif katmanlari style.css icinde.
  // ===============================================================
  function arkaplanCiz(v) {
    var sinif = 'mo-arkaplan', m = v.motif, ek = '';
    if (v.animasyon) sinif += ' mo-anim-' + v.animasyon;
    if (m && m.tip) {
      ek = '<span class="mo-ap-motif" data-motif="' + m.tip + '" style="' +
           '--motif-renk:' + (m.renk || '#FFFFFF') + ';' +
           '--motif-opaklik:' + ((m.opaklik == null) ? .22 : m.opaklik) + ';' +
           '--motif-boy:' + (m.boy || '22px') + ';' +
           '--motif-tekrar:' + (m.yerlesim === 'merkez' ? 'no-repeat' : 'repeat') + ';' +
           '--motif-konum:' + (m.yerlesim === 'merkez' ? 'center' : '0 0') + ';"></span>';
    }
    return '<div class="' + sinif + '" style="background:' + v.css + ';">' +
           ek + '<span class="mo-ap-isik"></span><span class="mo-ap-vinyet"></span></div>';
  }

  // ===============================================================
  // KACIS — YILAN DERISI
  // ustte govde derisi, altta hedef (yesil) yilan
  // ===============================================================
  function poly(yol, renk, kalinlik, ek) {
    return '<polyline points="' + yol + '" fill="none" stroke="' + renk +
           '" stroke-width="' + kalinlik + '" stroke-linecap="round" stroke-linejoin="round"' +
           (ek || '') + '/>';
  }

  function yilan(s, yol, bas, hedefMi) {
    var w = 10;
    var temel = (s.renkler && s.renkler[0]) || '#888888';
    var ikinci = (s.renkler && s.renkler[1]) || temel;
    var gid = yeniId('deri');
    var kontur = s.kontur || 'transparent';
    var g = '';

    g += '<defs>' + dikeyGrad(gid, acik(temel, .30), koyu(temel, .20)) + '</defs>';

    // 0) zemine dusen golge
    g += '<g transform="translate(0 2.6)" opacity=".32">' +
         poly(yol, '#000000', w + 1) +
         '<circle cx="' + bas[0] + '" cy="' + bas[1] + '" r="6.4" fill="#000000"/></g>';

    // 1) kontur / yesil vurgu konturu
    if (hedefMi && s.vurguTip === 'kontur') {
      g += poly(yol, s.vurgu, w + 5);
      g += '<circle cx="' + bas[0] + '" cy="' + bas[1] + '" r="8.6" fill="' + s.vurgu + '"/>';
    } else if (s.kontur) {
      g += poly(yol, kontur, w + 3);
      g += '<circle cx="' + bas[0] + '" cy="' + bas[1] + '" r="7.6" fill="' + kontur + '"/>';
    }

    // 2) govde
    g += poly(yol, 'url(#' + gid + ')', w);

    // 3) desen
    if (s.tip === 'seritli') {
      g += poly(yol, koyu(ikinci, .10), w, ' stroke-dasharray="4 7" stroke-linecap="butt" opacity=".55"');
    } else if (s.tip === 'benekli') {
      g += poly(yol, koyu(ikinci, .12), w * 0.42, ' stroke-dasharray="0 8" opacity=".65"');
    } else if (s.tip === 'kristal') {
      g += poly(yol, '#FFFFFF', w * 0.4, ' stroke-dasharray="5 6" opacity=".42"');
    } else if (s.tip === 'cizgili') {
      g += poly(yol, (hedefMi ? s.vurgu : acik(ikinci, .18)), w * 0.24);
    }

    // 4) hedef yilanin yesil isareti (kontur disindaki tipler)
    if (hedefMi && s.vurguTip === 'cizgi' && s.tip !== 'cizgili') {
      g += poly(yol, s.vurgu, w * 0.26);
    } else if (hedefMi && s.vurguTip === 'damar') {
      g += poly(yol, s.vurgu, w * 0.32, ' stroke-dasharray="3 5" opacity=".95"');
    }

    // 5) kafa
    g += '<circle cx="' + bas[0] + '" cy="' + bas[1] + '" r="6.2" fill="url(#' + gid + ')"/>';
    g += '<path d="M' + (bas[0] - 4.6) + ' ' + (bas[1] - 3.6) +
         ' a6.2 6.2 0 0 1 8.4 1.2" fill="none" stroke="#FFFFFF" stroke-width="1.1" ' +
         'stroke-linecap="round" opacity=".28"/>';
    // dil
    g += '<path d="M' + (bas[0] + 6) + ' ' + bas[1] + ' h4 m0 0 l2.6 -1.8 m-2.6 1.8 l2.6 1.8" ' +
         'fill="none" stroke="#E4536B" stroke-width="1.1" stroke-linecap="round"/>';
    // gozler
    g += '<circle cx="' + (bas[0] + 1.4) + '" cy="' + (bas[1] - 2.7) + '" r="1.7" fill="#FFFFFF"/>';
    g += '<circle cx="' + (bas[0] + 1.4) + '" cy="' + (bas[1] + 2.7) + '" r="1.7" fill="#FFFFFF"/>';
    g += '<circle cx="' + (bas[0] + 2.1) + '" cy="' + (bas[1] - 2.7) + '" r="0.85" fill="#101820"/>';
    g += '<circle cx="' + (bas[0] + 2.1) + '" cy="' + (bas[1] + 2.7) + '" r="0.85" fill="#101820"/>';
    return g;
  }

  function deriCiz(v) {
    var vid = yeniId('v'), lid = yeniId('l');
    var yolUst = '13,21 42,21 42,14 73,14';
    var yolAlt = '13,57 42,57 42,50 73,50';
    return svgAc('mo-deri' + (v.animasyon ? ' mo-anim-' + v.animasyon : '')) +
      '<defs>' + sahneDefs(vid, lid) + '</defs>' +
      yilan(v.govde, yolUst, [73, 14], false) +
      yilan(v.hedef, yolAlt, [73, 50], true) +
      sahneUst(vid, lid) +
      '</svg>';
  }

  // ===============================================================
  // SIRALA DUR — SISE
  // uc dolu katman cizilir; sinirlarin okunur kalmasi temanin sinavi
  // ===============================================================
  var KATMAN_RENK = ['#6FD3E0', '#F2C14E', '#A05AD6'];

  // style.css'teki #ssTahta[data-govde=...] clip-path yuzdeleriyle BIREBIR ayni olmali.
  var GOVDE_POLY = {
    'hafif-omuz':       [[9,0],[91,0],[100,9],[100,91],[94,100],[6,100],[0,91],[0,9]],
    'omuzlu':           [[14,0],[86,0],[100,18],[100,90],[93,100],[7,100],[0,90],[0,18]],
    'bombeli':          [[8,0],[92,0],[100,15],[104,50],[100,85],[93,100],[7,100],[0,85],[-4,50],[0,15]],
    'kadeh':            [[0,0],[100,0],[100,20],[86,55],[78,92],[74,100],[26,100],[22,92],[14,55],[0,20]],
    'kadeh-derin':      [[0,0],[100,0],[100,24],[82,58],[68,90],[62,100],[38,100],[32,90],[18,58],[0,24]],
    'kum-saati':        [[6,0],[94,0],[100,8],[100,38],[84,50],[100,62],[100,90],[93,100],[7,100],[0,90],[0,62],[16,50],[0,38],[0,8]],
    'kum-saati-keskin': [[6,0],[94,0],[100,8],[100,40],[73,50],[100,60],[100,90],[93,100],[7,100],[0,90],[0,60],[27,50],[0,40],[0,8]]
  };

  // Govde adina gore SVG yolu uretir. 'duz' (ya da bilinmeyen govde) eskisi
  // gibi: duz kenarli, sadece alt kosesi yuvarlak.
  function govdeYolu(govde, x, y, w, h) {
    var poly = GOVDE_POLY[govde], i, px, py, d, r;
    if (!poly) {
      r = 9;
      return 'M' + x + ' ' + y + ' h' + w + ' v' + (h - r) +
        ' a' + r + ' ' + r + ' 0 0 1 -' + r + ' ' + r +
        ' h-' + (w - r * 2) + ' a' + r + ' ' + r + ' 0 0 1 -' + r + ' -' + r + ' Z';
    }
    d = '';
    for (i = 0; i < poly.length; i++) {
      px = x + (poly[i][0] / 100) * w;
      py = y + (poly[i][1] / 100) * h;
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
    }
    return d + 'Z';
  }

  // market.js'teki KAPAK_SEKILLER kutuphanesini aynen kullanir; oyun ici
  // kapakla onizleme kartindaki kapak BIREBIR ayni sekil olsun diye.
  function kapakIcerik(sekil, renk) {
    if (!window.AppMarket || !window.AppMarket.kapakSvgUret) return '';
    var tam = window.AppMarket.kapakSvgUret(sekil, renk);
    var i = tam.indexOf('>'), j = tam.lastIndexOf('</svg>');
    if (i < 0 || j < 0) return '';
    return tam.slice(i + 1, j);
  }

  // Oyun-ici .ss-tup ile ayni dil: govde temaya gore siluet degistirir.
  // Kapak yalniz kapakSekil+kapakRenk taniмliysa cizilir (varsayilanda yok).
  function siseCiz(v) {
    var vid = yeniId('v'), lid = yeniId('l'), cid = yeniId('c');
    var gx = 36, gTop = 16, gw = 28, gh = 42, gBot = gTop + gh;
    var govdeYol = govdeYolu(v.govde, gx, gTop, gw, gh);
    var mot = motifKatmani(v.motif);
    var i, y, s = '';

    s += svgAc('mo-sise' + (v.animasyon ? ' mo-anim-' + v.animasyon : ''));
    s += '<defs><clipPath id="' + cid + '"><path d="' + govdeYol + '"/></clipPath>';
    for (i = 0; i < 3; i++) {
      s += dikeyGrad('k' + cid + i, acik(KATMAN_RENK[i], .22), koyu(KATMAN_RENK[i], .18));
    }
    s += mot.defs + sahneDefs(vid, lid) + '</defs>';

    // zemine dusen golge
    s += '<ellipse cx="50" cy="' + (gBot + 3) + '" rx="15" ry="3" fill="#000000" opacity=".3"/>';

    // efsanevi/animasyonlu temalarda kapagin arkasinda yumusak bir aura
    if (v.animasyon && v.kapakRenk) {
      s += '<circle cx="50" cy="' + gTop + '" r="13" fill="' + v.kapakRenk + '" opacity=".28"/>';
    }

    // govde (cam)
    s += '<path d="' + govdeYol + '" fill="rgba(226,236,255,.08)"/>';

    // sivi katmanlari
    s += '<g clip-path="url(#' + cid + ')">';
    for (i = 0; i < 3; i++) {
      y = gBot - (i + 1) * (gh / 3);
      s += '<rect x="' + gx + '" y="' + y + '" width="' + gw + '" height="' + (gh / 3) + '" fill="url(#k' + cid + i + ')"/>';
      s += '<rect x="' + gx + '" y="' + y + '" width="' + gw + '" height="1" fill="#000000" opacity=".28"/>';
    }
    if (mot.ust) {
      s += mot.ust.replace('x="0" y="0" width="100" height="70"',
        'x="' + gx + '" y="' + gTop + '" width="' + gw + '" height="' + gh + '"');
    }
    s += '</g>';

    // govde konturu
    s += '<path d="' + govdeYol + '" fill="none" stroke="rgba(226,236,255,.5)" stroke-width="2"/>';

    // kapak — sadece kapakSekil+kapakRenk taniмliysa (varsayilanda hic yok)
    if (v.kapakSekil && v.kapakRenk) {
      var boynW = gw * 0.96;
      s += '<rect x="' + (50 - boynW / 2) + '" y="' + (gTop - 8) + '" width="' + boynW +
           '" height="8" rx="1.4" fill="rgba(226,236,255,.28)"/>';
      s += '<g transform="translate(' + (50 - boynW / 2) + ' ' + (gTop - 11) + ') scale(' + (boynW / 24) + ')">' +
           kapakIcerik(v.kapakSekil, v.kapakRenk) + '</g>';
    }

    s += sahneUst(vid, lid);
    s += '</svg>';
    return s;
  }
  // ===============================================================
  // HEDEF 2048 — KARO
  // 2 / 8 / 64 / 2048 birlikte: sayi okunurlugu tek bakista gorunur
  // ===============================================================
  function karoCiz(v) {
    var degerler = ['2', '8', '64', '2048'];
    var yer = [[9, 6], [52, 6], [9, 37], [52, 37]];
    var vid = yeniId('v'), lid = yeniId('l'), zid = yeniId('z');
    var zemin = v.zemin || '#182236';
    var mot = motifKatmani(v.motif);
    var i, d, p, c, gid;
    var s = svgAc('mo-karo' + (v.animasyon ? ' mo-anim-' + v.animasyon : ''));

    s += '<defs>' + dikeyGrad(zid, acik(zemin, .07), koyu(zemin, .12));
    for (i = 0; i < 4; i++) {
      c = (v.palet && v.palet[degerler[i]]) || ['#2B3547', '#93A6BE'];
      s += dikeyGrad('t' + zid + i, acik(c[0], .20), koyu(c[0], .14));
    }
    s += mot.defs + sahneDefs(vid, lid) + '</defs>';

    // tahta zemini
    s += '<rect x="0" y="0" width="100" height="70" rx="7" fill="url(#' + zid + ')"/>';

    for (i = 0; i < 4; i++) {
      d = degerler[i];
      p = yer[i];
      c = (v.palet && v.palet[d]) || ['#2B3547', '#93A6BE'];
      gid = 't' + zid + i;

      // bos hucre kuyusu
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="39" height="27" rx="5.5" fill="#000000" opacity=".22"/>';
      // karo
      s += '<rect x="' + (p[0] + 1.5) + '" y="' + (p[1] + 1.5) + '" width="36" height="24" rx="4.5" fill="url(#' + gid + ')"/>';
      // ust isik seridi
      s += '<rect x="' + (p[0] + 3.5) + '" y="' + (p[1] + 3) + '" width="32" height="6" rx="3" fill="#FFFFFF" opacity=".13"/>';
      if (v.izgara) {
        s += '<rect x="' + (p[0] + 1.5) + '" y="' + (p[1] + 1.5) + '" width="36" height="24" rx="4.5" fill="none" stroke="' +
             v.izgara + '" stroke-width="1"/>';
      }
      // en buyuk karoya halka
      if (d === '2048') {
        s += '<rect x="' + (p[0] + 0.4) + '" y="' + (p[1] + 0.4) + '" width="38.2" height="26.2" rx="6" fill="none" stroke="' +
             acik(c[0], .45) + '" stroke-width="1.3" opacity=".85"/>';
      }
      s += '<text x="' + (p[0] + 19.5) + '" y="' + (p[1] + 18.5) + '" text-anchor="middle" ' +
           'font-family="Fredoka, sans-serif" font-weight="600" font-size="' + (d.length > 3 ? 12 : 15) +
           '" fill="' + c[1] + '">' + d + '</text>';
    }
    s += mot.ust;
    s += sahneUst(vid, lid);
    s += '</svg>';
    return s;
  }

  // ===============================================================
  // TEMPO KUP — BLOK
  // ===============================================================
  function blokCiz(v) {
    var hucre = [[22, 12], [40, 12], [40, 30], [58, 30], [58, 48]];
    var b = 18, en = b - 2;
    var vid = yeniId('v'), lid = yeniId('l'), bid = yeniId('b');
    var mot = motifKatmani(v.motif);
    var i, p, renk, r;
    var s = svgAc('mo-blok' + (v.animasyon ? ' mo-anim-' + v.animasyon : ''));

    r = 4;
    if (typeof v.koseYaricap === 'string' && v.koseYaricap.indexOf('%') > 0) {
      r = en * (parseFloat(v.koseYaricap) / 100);
    }

    s += '<defs>';
    for (i = 0; i < hucre.length; i++) {
      renk = v.renkler[i % v.renkler.length];
      s += dikeyGrad(bid + i, acik(renk, .24), koyu(renk, .18));
    }
    s += mot.defs + sahneDefs(vid, lid) + '</defs>';

    // golgeler once — bloklarin arkasinda kalsin
    for (i = 0; i < hucre.length; i++) {
      p = hucre[i];
      s += '<rect x="' + (p[0] + 1.4) + '" y="' + (p[1] + 2.4) + '" width="' + en + '" height="' + en +
           '" rx="' + r + '" fill="#000000" opacity=".28"/>';
    }

    for (i = 0; i < hucre.length; i++) {
      p = hucre[i];
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + en + '" height="' + en +
           '" rx="' + r + '" fill="url(#' + bid + i + ')"' +
           (v.kenar ? ' stroke="' + v.kenar + '" stroke-width="1.4"' : '') + '/>';

      // alt koyu serit — blok kabarik dursun
      s += '<rect x="' + (p[0] + 2) + '" y="' + (p[1] + en - 4.2) + '" width="' + (en - 4) +
           '" height="2.6" rx="1.3" fill="#000000" opacity=".20"/>';
      // ust gloss
      s += '<rect x="' + (p[0] + 2.4) + '" y="' + (p[1] + 2.2) + '" width="' + (en - 4.8) +
           '" height="' + (en * 0.30) + '" rx="' + (r * 0.6) + '" fill="#FFFFFF" opacity="' +
           (v.parlama ? '.30' : '.16') + '"/>';

      if (v.doku === 'ahsap') {
        s += '<path d="M' + (p[0] + 3) + ' ' + (p[1] + 6) + ' h' + (en - 6) +
             ' M' + (p[0] + 3) + ' ' + (p[1] + 11) + ' h' + (en - 6) +
             '" stroke="#000000" stroke-opacity=".22" stroke-width="1"/>';
      } else if (v.doku === 'devre') {
        s += '<path d="M' + (p[0] + 4) + ' ' + (p[1] + 8) + ' h5 v5 h5" fill="none" ' +
             'stroke="#000000" stroke-opacity=".35" stroke-width="1.2"/>';
      } else if (v.doku === 'prizma') {
        s += '<path d="M' + (p[0] + 1) + ' ' + (p[1] + en - 1) + ' L' + (p[0] + en - 1) + ' ' + (p[1] + 1) +
             '" stroke="#FFFFFF" stroke-opacity=".22" stroke-width="2.4"/>';
      }
    }
    s += mot.ust;
    s += sahneUst(vid, lid);
    s += '</svg>';
    return s;
  }

  // ===============================================================
  // GIRIS NOKTASI
  // Urunun verisinde `gorsel` varsa SVG cizilmez, o dosya basilir.
  // (Efsanevi temalar icin elle hazirlanmis gorsel kullanilabilsin diye.)
  // ===============================================================
  function ciz(urun) {
    if (!urun) return '';
    var ak = katAnahtari(urun.id);
    var v = veriAl(urun);
    if (!v) return '';

    var gorsel = urun.gorsel || (urun.veri && urun.veri.gorsel);
    if (gorsel) {
      return '<img class="mo-gorsel" src="' + gorsel + '" alt="" loading="lazy">';
    }

    if (ak === 'genel.arkaplan') return arkaplanCiz(v);
    if (ak === 'kacis.deri')     return deriCiz(v);
    if (ak === 'susirala.sise')  return siseCiz(v);
    if (ak === 'h2048.karo')     return karoCiz(v);
    if (ak === 'tempo.blok')     return blokCiz(v);
    return '';
  }

  return {
    ciz: ciz,
    yerlesikGorunum: function (anahtar) { return YERLESIK[anahtar]; }
  };
})();
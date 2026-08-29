/* =======================================================
   SU SIRALAMA — ÖZEL BÖLÜMLER (renk karışımı)
   js/suSiralaOzel.js  —  suSirala.js'ten SONRA yüklenmeli.

   Renk sistemi:
     0 MAVİ  1 KIRMIZI  2 SARI          (ham)
     3 MOR   4 TURUNCU  5 YEŞİL         (ikili karışım)
     6 ÇAMUR                            (hata ürünü)

   Kurallar:
     - Normal şişeler: eski kural (aynı renk üstüne dökülür)
     - Karışım kabı: her şey dökülebilir, orada karışır
     - Karışım kabından GERİ DÖKÜLEMEZ
     - Eşleşmeyen artan miktar üstte kendi rengiyle kalır
     - Kazanma: hedef renkler kaplarda saf + ham renk artmamış
     - Çamur oluşursa bölüm ölü (hacim bütçesi tutmaz)
   ======================================================= */

(function (global) {
  'use strict';

  var HAM = [0, 1, 2];
  var CAMUR = 6;
  var KIRLI = [7, 8, 9];        /* gri, kahverengi, siyah — tepkimeye girmez */

  var RENK_AD = ['Mavi', 'Kırmızı', 'Sarı', 'Mor', 'Turuncu', 'Yeşil', 'Çamur',
                 'Gri', 'Kahverengi', 'Siyah'];
  /* 0 mavi  1 kirmizi  2 sari | 3 mor  4 turuncu  5 yesil | 6 camur
     Her cift arasindaki algisal fark (CIE dE) en az 30; onceki palette
     kirmizi-turuncu 18, mavi-mor 25 idi ve ayni sisede karisiyorlardi. */
  var RENK_HEX = ['#2C7BE5', '#E30A17', '#F5C518', '#8B3FD4', '#EE6A12', '#57A32A',
                  '#514E45', '#C8CFD8', '#A66C2E', '#0E1014'];

  /* karisim[a][b] = ikisi karışınca çıkan renk */
  var KARISIM = {};
  KARISIM[0] = {}; KARISIM[0][1] = 3; KARISIM[0][2] = 5;
  KARISIM[1] = {}; KARISIM[1][0] = 3; KARISIM[1][2] = 4;
  KARISIM[2] = {}; KARISIM[2][0] = 5; KARISIM[2][1] = 4;

  /* bilesen[karisimRengi] = [ham, ham] */
  var BILESEN = { 3: [0, 1], 4: [1, 2], 5: [0, 2] };

  function kirliMi(r) { return r >= 7; }

  function kirliVarMi(kap) {
    for (var i = 0; i < kap.length; i++) if (kirliMi(kap[i])) return true;
    return false;
  }

  function karisimSonucu(a, b) {
    if (a === b) return a;
    if (kirliMi(a) || kirliMi(b)) return CAMUR;   /* gri/kahve/siyah her seyi bozar */
    if (KARISIM[a] && KARISIM[a][b] !== undefined) return KARISIM[a][b];
    return CAMUR;
  }

  /* ---------- 1) DURUM ----------
     durum = {
       tupler:  [[renk,...]],      // [0] = dip
       kaplar:  [kapasite,...],
       kapMi:   [bool,...],        // true = erlenmayer (karışım kabı)
       hedefler:[{renk:3, adet:4},...]
     } */

  function klonla(d) {
    return {
      tupler: d.tupler.map(function (t) { return t.slice(); }),
      kaplar: d.kaplar,
      kapMi: d.kapMi,
      hedefler: d.hedefler
    };
  }

  function tekRenkMi(t) {
    for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false;
    return t.length > 0;
  }

  function ustBlok(t) {
    if (!t.length) return 0;
    var r = t[t.length - 1], n = 1;
    for (var i = t.length - 2; i >= 0 && t[i] === r; i--) n++;
    return n;
  }

  function camurVarMi(d) {
    for (var i = 0; i < d.tupler.length; i++) {
      for (var j = 0; j < d.tupler[i].length; j++) {
        if (d.tupler[i][j] === CAMUR) return true;
      }
    }
    return false;
  }

  /* ---------- 2) KAZANMA ----------
     Her hedef, bir kapta saf ve tam adette olmalı.
     Normal şişelerde hiç ham renk kalmamalı. */

  function kazanildiMi(d) {
    if (camurVarMi(d)) return false;

    var kalan = d.hedefler.map(function (h) { return { renk: h.renk, adet: h.adet }; });
    var gorulen = {};

    for (var i = 0; i < d.tupler.length; i++) {
      var t = d.tupler[i];
      if (!t.length) continue;
      if (!tekRenkMi(t)) return false;

      if (d.kapMi[i]) {
        /* Erlenmayer: bir hedefe tam olarak karsilik gelmeli */
        var eslesti = false;
        for (var k = 0; k < kalan.length; k++) {
          if (kalan[k] && kalan[k].renk === t[0] && kalan[k].adet === t.length) {
            kalan[k] = null; eslesti = true; break;
          }
        }
        if (!eslesti) return false;
      } else {
        /* Normal sise: artan ham renk, klasik kural — her renk tek siseden */
        if (gorulen[t[0]]) return false;
        gorulen[t[0]] = true;
      }
    }

    for (var m = 0; m < kalan.length; m++) if (kalan[m]) return false;
    return true;
  }

  /* ---------- 3) HAMLE ---------- */

  function hamleGecerliMi(d, a, b) {
    if (a === b) return false;
    var kaynak = d.tupler[a], hedef = d.tupler[b];
    if (!kaynak.length) return false;
    if (d.kapMi[a]) return false;                    /* kaptan geri dökülemez */
    if (hedef.length >= d.kaplar[b]) return false;

    if (d.kapMi[b]) return true;                     /* kaba her şey dökülür */

    /* normal şişe: eski kural */
    if (!hedef.length) {
      /* tamamlanmış tek rengi boş şişeye taşımak anlamsız (sonsuz döngü) */
      if (tekRenkMi(kaynak) && kaynak.length === ustBlok(kaynak)) {
        return d.kaplar[b] < d.kaplar[a] && d.kaplar[b] >= kaynak.length;
      }
      return true;
    }
    return hedef[hedef.length - 1] === kaynak[kaynak.length - 1];
  }

  /* Kaba döküm KARIŞTIRMAZ — sadece üst üste yığar.
     Karışım ancak oyuncu cam bagetle karıştırınca olur. */
  function hamleUygula(d, a, b) {
    var kaynak = d.tupler[a], hedef = d.tupler[b];
    var renk = kaynak[kaynak.length - 1];
    var adet = Math.min(ustBlok(kaynak), d.kaplar[b] - hedef.length);
    for (var i = 0; i < adet; i++) { kaynak.pop(); hedef.push(renk); }
    return { adet: adet, renk: renk };
  }

  /* ---------- KARIŞTIRMA (cam baget) ----------
     Ham renkler (mavi/kirmizi/sari) birbiriyle birlesir; zaten karismis
     renkler (mor/turuncu/yesil) karisima girmez, oldugu gibi kalir.

     CAMUR BULASICIDIR: uc ham renk bir arada karistirilirsa ya da kapta
     zaten camur varsa, kabin TAMAMI camura doner.

       2 mavi + 1 sari                        -> 2 yesil + 1 mavi
       2 yesil + 1 mavi + 1 kirmizi + 1 sari  -> 5 camur              */

  function hamSayimi(kap) {
    var s = [0, 0, 0];
    for (var i = 0; i < kap.length; i++) {
      if (kap[i] < 3) s[kap[i]]++;
    }
    return s;
  }

  function camurluMuKap(kap) {
    for (var i = 0; i < kap.length; i++) if (kap[i] === CAMUR) return true;
    return false;
  }

  function karistirilabilirMi(d, i) {
    if (!d.kapMi[i]) return false;
    var kap = d.tupler[i];
    if (!kap.length) return false;
    if (camurluMuKap(kap)) return false;      /* zaten camur, karistirmanin anlami yok */
    if (kirliVarMi(kap)) return true;         /* karistirirsa kap camura doner */
    var s = hamSayimi(kap);
    return (s[0] > 0 ? 1 : 0) + (s[1] > 0 ? 1 : 0) + (s[2] > 0 ? 1 : 0) >= 2;
  }

  function karistir(d, i) {
    if (!karistirilabilirMi(d, i)) return null;

    var kap = d.tupler[i];
    var yeni = [];
    /* karismis renkler (mor/turuncu/yesil) karisima girmez, oldugu gibi kalir */
    for (var j = 0; j < kap.length; j++) if (kap[j] > 2 && !kirliMi(kap[j])) yeni.push(kap[j]);

    var s = hamSayimi(kap);
    var varOlan = [];
    for (var r = 0; r < 3; r++) if (s[r] > 0) varOlan.push(r);

    var camurOldu = false;
    if (varOlan.length === 3 || camurluMuKap(kap) || kirliVarMi(kap)) {
      /* Camur bulasicidir: kabin tamami camura doner */
      yeni = [];
      for (var c = 0; c < kap.length; c++) yeni.push(CAMUR);
      camurOldu = true;
    } else {
      var a = varOlan[0], b = varOlan[1];
      var cift = Math.min(s[a], s[b]);
      var sonuc = karisimSonucu(a, b);
      for (var k = 0; k < cift * 2; k++) yeni.push(sonuc);
      var fazlaRenk = (s[a] > s[b]) ? a : b;
      var fazla = Math.abs(s[a] - s[b]);
      for (var f = 0; f < fazla; f++) yeni.push(fazlaRenk);
    }

    d.tupler[i] = yeni;
    return { camur: camurOldu, uzunluk: yeni.length };
  }

  function gecerliHamleler(d) {
    var liste = [];
    for (var a = 0; a < d.tupler.length; a++) {
      for (var b = 0; b < d.tupler.length; b++) {
        if (hamleGecerliMi(d, a, b)) liste.push([a, b]);
      }
    }
    /* [i, -1] = i numarali kabi karistir */
    for (var i = 0; i < d.tupler.length; i++) {
      if (karistirilabilirMi(d, i)) liste.push([i, -1]);
    }
    return liste;
  }

  /* Cozucu ve oturum ayni yoldan gecsin diye tek giris noktasi */
  function hamleIsle(d, a, b) {
    if (b === -1) {
      var k = karistir(d, a);
      return { adet: 0, karistirma: true, camur: !!(k && k.camur) };
    }
    var h = hamleUygula(d, a, b);
    return { adet: h.adet, renk: h.renk, karistirma: false, camur: false };
  }

  /* ---------- 4) ÇÖZÜCÜ ---------- */

  function anahtar(d) {
    var par = [];
    for (var i = 0; i < d.tupler.length; i++) {
      par.push((d.kapMi[i] ? 'K' : 'S') + d.kaplar[i] + ':' + d.tupler[i].join(','));
    }
    return par.sort().join('|');
  }

  function hamlePuani(d, a, b) {
    if (b === -1) {
      /* Karistirma: hedefe tam oturan karisim en degerli, camur en kotu */
      var sy = hamSayimi(d.tupler[a]);
      var vo = [];
      for (var r = 0; r < 3; r++) if (sy[r] > 0) vo.push(r);
      if (vo.length === 3) return -80;
      var cift = Math.min(sy[vo[0]], sy[vo[1]]);
      var sonuc = karisimSonucu(vo[0], vo[1]);
      var puan = 12 + cift * 2;
      for (var h = 0; h < d.hedefler.length; h++) {
        if (d.hedefler[h].renk === sonuc && d.hedefler[h].adet === cift * 2) puan += 20;
      }
      if (sy[vo[0]] !== sy[vo[1]]) puan -= 6;   /* artan ham renk kapta kalir */
      return puan;
    }

    var kaynak = d.tupler[a], hedef = d.tupler[b];
    var blok = ustBlok(kaynak);
    var puan = 0;
    if (d.kapMi[b]) {
      puan += 10;
      if (hedef.length + blok <= d.kaplar[b]) puan += 4;
    } else {
      if (hedef.length > 0) puan += 8;
      if (blok === kaynak.length) puan += 6;
      if (hedef.length + blok === d.kaplar[b]) puan += 8;
    }
    return puan;
  }

  function siraliHamleler(d) {
    var h = gecerliHamleler(d);
    h.sort(function (x, y) { return hamlePuani(d, y[0], y[1]) - hamlePuani(d, x[0], x[1]); });
    return h;
  }

  function CozucuOlustur(limit) {
    var memo = {}, sayac = 0, tavan = limit || 300000, tasti = false;

    function coz(d) {
      if (tasti) return false;
      if (camurVarMi(d)) return false;
      var k = anahtar(d);
      if (memo[k] !== undefined) return memo[k];
      if (kazanildiMi(d)) { memo[k] = true; return true; }
      if (++sayac > tavan) { tasti = true; return false; }
      memo[k] = false;

      var h = siraliHamleler(d);
      for (var i = 0; i < h.length; i++) {
        var yeni = klonla(d);
        hamleIsle(yeni, h[i][0], h[i][1]);
        if (coz(yeni)) { memo[k] = true; return true; }
        if (tasti) return false;
      }
      return false;
    }

    return {
      cozulurMu: function (d) { return coz(klonla(d)); },
      tastiMi: function () { return tasti; },
      sifirla: function () { tasti = false; sayac = 0; memo = {}; }
    };
  }

  /* Çözüm yolu — hem doğrulama hem "nasıl çözülüyor" için */
  function cozumYolu(d, limit) {
    var memo = {}, sayac = 0, tavan = limit || 1500000, yol = [];
    var tasti = false;

    function ara(durum) {
      if (tasti) return false;
      if (camurVarMi(durum)) return false;
      if (kazanildiMi(durum)) return true;
      if (++sayac > tavan) { tasti = true; return false; }
      var k = anahtar(durum);
      if (memo[k]) return false;
      memo[k] = true;

      var h = siraliHamleler(durum);
      for (var i = 0; i < h.length; i++) {
        var yeni = klonla(durum);
        var kay = durum.tupler[h[i][0]];
        var renk = (h[i][1] === -1) ? -1 : kay[kay.length - 1];
        var s = hamleIsle(yeni, h[i][0], h[i][1]);
        yol.push({ a: h[i][0], b: h[i][1], renk: renk, adet: s.adet,
                   karistirma: s.karistirma });
        if (ara(yeni)) return true;
        yol.pop();
        if (tasti) return false;
      }
      return false;
    }

    var bulundu = ara(klonla(d));
    cozumYolu.tastiMi = tasti;      /* limit taştıysa "çözümsüz" sanma */
    return bulundu ? yol : null;
  }

  /* Tuzak oranı: kaç geçerli hamle bölümü öldürüyor */
  function tuzakOrani(d) {
    var h = gecerliHamleler(d);
    if (!h.length) return -1;
    var tuzak = 0;
    for (var i = 0; i < h.length; i++) {
      var yeni = klonla(d);
      hamleIsle(yeni, h[i][0], h[i][1]);
      var c = CozucuOlustur();          /* her hamle için taze memo */
      if (!c.cozulurMu(yeni)) tuzak++;
      if (c.tastiMi()) return -1;
    }
    return Math.round((tuzak / h.length) * 100);
  }

  /* ---------- 5) BÖLÜM PROFİLİ ---------- */

  function ozelProfil(n) {
    var p = {
      bolumNo: n,
      hedefSayisi: 2,
      hedefAdet: 4,          /* hedefin birim sayisi (cift olmali) */
      hamKapasite: [1, 1, 0],/* artik siseler icin [2'lik, 3'luk, 4'luk] agirlik */
      artikSise: 1,          /* celdirici ham renk sisesi */
      kirliSise: 0,          /* gri/kahve/siyah — kaba girerse camur */
      calismaSise: 2,        /* bozarken kullanilabilen bos sise */
      serbestBos: 1,         /* baslangicta GARANTI bos kalan sise */
      karisHamle: 6,         /* kac ters hamleyle bozulacak = cozum uzunlugu */
      asimetrik: false,
      tanitim: null
    };

    if (n === 1) { p.hedefSayisi = 1; p.hedefAdet = 4; p.artikSise = 0;
                   p.calismaSise = 1; p.serbestBos = 1; p.karisHamle = 3;
                   p.tanitim = 'karisim'; return p; }
    if (n === 2) { p.hedefSayisi = 1; p.hedefAdet = 4; p.artikSise = 0;
                   p.calismaSise = 1; p.serbestBos = 1; p.karisHamle = 4; return p; }
    /* Kirli renklerin tanitildigi bolum: tek hedef, tek kirli sise, sade tahta */
    if (n === 5) { p.hedefSayisi = 1; p.hedefAdet = 4; p.artikSise = 0; p.kirliSise = 1;
                   p.calismaSise = 2; p.serbestBos = 1; p.karisHamle = 6;
                   p.tanitim = 'kirli'; return p; }

    if (n <= 3)       { p.hedefSayisi = 1; p.hedefAdet = 4; }
    else if (n <= 25) { p.hedefSayisi = 2; }
    else              { p.hedefSayisi = 3; }

    /* Celdirici sise butcesi: kirli renkler ham celdiricilerin yerini alir,
       yoksa ekrandaki sise sayisi 15'i asiyor. */
    if (n <= 2)       { p.artikSise = 0; p.kirliSise = 0; }
    else if (n <= 4)  { p.artikSise = 1; p.kirliSise = 0; }
    else if (n <= 15) { p.artikSise = 1; p.kirliSise = 1; }
    else if (n <= 25) { p.artikSise = 1; p.kirliSise = 2; }
    else              { p.artikSise = 0; p.kirliSise = 2; }

    /* Hedef adetleri esit olmak zorunda degil: "4 mor + 6 yesil" gibi
       asimetrik istekler bolumu daha okunakli ve ilginc yapiyor. */
    p.asimetrik = (n >= 6);

    if (n < 16)      p.hamKapasite = [1, 2, 0];
    else if (n < 31) p.hamKapasite = [2, 2, 1];
    else             p.hamKapasite = [3, 1, 2];

    p.calismaSise = (n <= 3) ? 1 : 2;
    p.serbestBos  = (n <= 25) ? 1 : 2;

    /* Bozma derinligi = cozum uzunlugu. Tahta doydugunda kendiliginden
       durur, bu yuzden ust sinir gercek bir tavan degil hedeftir. */
    p.karisHamle = Math.min(30, 3 + Math.round(n * 0.6));
    return p;
  }

  /* ---------- 6) TAHTA KURULUMU ----------
     HEDEFTEN GERİYE üretim: önce ne isteneceğine karar ver, sonra
     tam o kadar ham malzemeyi tahtaya dağıt. Bölüm tanım gereği
     çözülebilir olur; çözücü sadece zorluğu ölçer. */

  function ustBlokSay(t) {
    if (!t.length) return 0;
    var r = t[t.length - 1], n = 1;
    for (var i = t.length - 2; i >= 0 && t[i] === r; i--) n++;
    return n;
  }

  function hamKapasiteSec(rng, agirlik) {
    var toplam = agirlik[0] + agirlik[1] + agirlik[2];
    var r = rng() * toplam;
    if (r < agirlik[0]) return 2;
    if (r < agirlik[0] + agirlik[1]) return 3;
    return 4;
  }

  /* TERS HAMLE URETIMI
     Once COZULMUS tahtayi kur, sonra gecerli ters hamlelerle boz.
     Her ters hamlenin tersi gecerli bir ileri hamle oldugundan bolum
     tanim geregi cozulebilir; cozucu calistirmaya gerek yok.

     Ters hamle: B'nin ustundeki c blogundan j birim al, A'ya koy.
       - A bos ya da A'nin ustu != c   -> ileri oynarken ustBlok(A) tam j olur
       - j < ustBlok(B)                -> B'nin ustu c kalir, ileri dokum gecerli
       - ya da B tamamen tek renkse hepsi alinir (A dolu olmak sartiyla)   */

  function ozelTahtaKur(bolumNo, tohum) {
    var p = ozelProfil(bolumNo);
    var rng = global.SuSirala.rngOlustur(tohum);

    function karis(dizi) {
      for (var i = dizi.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = dizi[i]; dizi[i] = dizi[j]; dizi[j] = t;
      }
      return dizi;
    }

    /* --- 1) hedefler --- */
    var aday = karis([3, 4, 5]);
    var hedefler = [];
    for (var h = 0; h < p.hedefSayisi; h++) {
      hedefler.push({
        renk: aday[h],
        adet: p.asimetrik ? (rng() < 0.55 ? 4 : 6) : p.hedefAdet
      });
    }

    /* --- 2) porsiyonlar: cozulmus durumda her biri tam bir siseyi doldurur.
       Hedefin iki bileseni adet/2'ser birim; oyuncu ikisini de kaba dokup
       karistirinca hedef tam tutar. --- */
    var pors = [];
    for (var i = 0; i < hedefler.length; i++) {
      var b = BILESEN[hedefler[i].renk];
      pors.push({ renk: b[0], adet: hedefler[i].adet / 2 });
      pors.push({ renk: b[1], adet: hedefler[i].adet / 2 });
    }
    var artikRenk = karis([0, 1, 2]);
    for (var a = 0; a < p.artikSise; a++) {
      pors.push({ renk: artikRenk[a % 3], adet: hamKapasiteSec(rng, p.hamKapasite) });
    }
    /* Kirli renkler: klasik kuralla kendi sisesinde toplanirlar. Kaba dokulup
       karistirilirsa kap camur olur — bu yuzden tahtayi gercekten kilitliyorlar. */
    var kirliRenk = karis(KIRLI.slice());
    for (var kr = 0; kr < p.kirliSise; kr++) {
      pors.push({ renk: kirliRenk[kr % 3], adet: hamKapasiteSec(rng, p.hamKapasite) });
    }

    /* --- 3) cozulmus tahta --- */
    var tupler = [], kaplar = [], kapMi = [];
    for (var q = 0; q < pors.length; q++) {
      var t = [];
      for (var k = 0; k < pors[q].adet; k++) t.push(pors[q].renk);
      tupler.push(t); kaplar.push(pors[q].adet); kapMi.push(false);
    }
    var enBuyuk = Math.max.apply(null, kaplar);
    for (var e = 0; e < p.calismaSise + p.serbestBos; e++) {
      tupler.push([]); kaplar.push(enBuyuk); kapMi.push(false);
    }
    var normalSayisi = tupler.length;
    var kullanilir = normalSayisi - p.serbestBos;   /* son siseler hep bos kalir */

    /* --- 4) bozma --- */
    var hamleler = [], son = null;
    for (var adim = 0; adim < p.karisHamle; adim++) {
      var secenek = [];
      for (var B = 0; B < kullanilir; B++) {
        var tb = tupler[B];
        if (!tb.length) continue;
        var c = tb[tb.length - 1], uB = ustBlokSay(tb);
        for (var A = 0; A < kullanilir; A++) {
          if (A === B) continue;
          if (son && son[0] === B && son[1] === A) continue;   /* ileri-geri dongu */
          var ta = tupler[A];
          if (ta.length && ta[ta.length - 1] === c) continue;
          var bosluk = kaplar[A] - ta.length;
          if (bosluk < 1) continue;
          var ustSinir = Math.min(uB - 1, bosluk);
          for (var j = 1; j <= ustSinir; j++) secenek.push([A, B, j]);
          if (uB === tb.length && ta.length && tb.length <= bosluk) {
            secenek.push([A, B, tb.length]);
          }
        }
      }
      if (!secenek.length) break;              /* tahta doydu */
      var m = secenek[Math.floor(rng() * secenek.length)];
      var renk = tupler[m[1]][tupler[m[1]].length - 1];
      for (var z = 0; z < m[2]; z++) { tupler[m[1]].pop(); tupler[m[0]].push(renk); }
      hamleler.push([m[0], m[1]]);
      son = [m[0], m[1]];
    }

    /* --- 5) erlenmayerler --- */
    for (var g = 0; g < hedefler.length; g++) {
      tupler.push([]); kaplar.push(hedefler[g].adet); kapMi.push(true);
    }

    return {
      tupler: tupler, kaplar: kaplar, kapMi: kapMi,
      hedefler: hedefler, profil: p,
      normalSayisi: normalSayisi,
      bozmaHamleleri: hamleler,      /* ters sirada oynanirsa cozume goturur */
      /* bozma hamleleri geri alinir + her hedef icin 2 dokum ve 1 karistirma */
      cozumHamle: hamleler.length + hedefler.length * 3
    };
  }

  /* Eski tohum tarayici artik gerekmiyor — bolumler tanim geregi cozulebilir.
     Gelistirme sirasinda zorluk olcmek isterse diye duruyor. */
  function tohumAra(bolumNo, deneme) {
    var enFazla = deneme || 400;
    for (var i = 0; i < enFazla; i++) {
      var tohum = (bolumNo * 2246822519 + i * 2654435761 + 7919) >>> 0;
      var d = ozelTahtaKur(bolumNo, tohum);
      return [tohum, -1, d.cozumHamle];
    }
    return null;
  }

  /* ---------- 7) BÖLÜM ÜRETİMİ ---------- */

  function ozelBolumUret(bolumNo) {
    var tohum = (bolumNo * 2246822519 + 7919) >>> 0;
    var d = ozelTahtaKur(bolumNo, tohum);
    var cozum = d.cozumHamle;

    return {
      bolumNo: bolumNo,
      tupler: d.tupler,
      kaplar: d.kaplar,
      kapMi: d.kapMi,
      hedefler: d.hedefler,
      profil: d.profil,
      tuzakOrani: -1,
      cozumHamle: cozum,
      /* uretilen cozum en kisa olmak zorunda degil, uc yildiz icin bir pay birak */
      yildizButce: {
        uc: cozum + 1,
        iki: Math.ceil(cozum * 1.4),
        bir: Math.ceil(cozum * 1.9)
      }
    };
  }

  /* ---------- 8) OYUN OTURUMU ---------- */

  function OzelOyunOlustur(bolumNo) {
    var bolum = ozelBolumUret(bolumNo);
    var baslangic = {
      tupler: bolum.tupler.map(function (t) { return t.slice(); }),
      kaplar: bolum.kaplar,
      kapMi: bolum.kapMi,
      hedefler: bolum.hedefler
    };

    return {
      bolum: bolum,
      durum: klonla(baslangic),
      hamleSayisi: 0,
      gecmis: [],

      oynanabilirMi: function () { return gecerliHamleler(this.durum).length > 0; },
      camurluMu: function () { return camurVarMi(this.durum); },
      kazandiMi: function () { return kazanildiMi(this.durum); },

      dok: function (a, b) {
        if (!hamleGecerliMi(this.durum, a, b)) return null;
        this.gecmis.push(klonla(this.durum));
        if (this.gecmis.length > 60) this.gecmis.shift();
        var oncekiUzunluk = this.durum.tupler[b].length;
        var s = hamleUygula(this.durum, a, b);
        this.hamleSayisi++;
        return {
          kaynak: a, hedef: b, adet: s.adet, bas: oncekiUzunluk,
          renk: s.renk, kazandi: kazanildiMi(this.durum)
        };
      },

      /* --- cam baget: kabin icindekileri karistir --- */
      karistirilabilirMi: function (i) { return karistirilabilirMi(this.durum, i); },

      karistir: function (i) {
        if (!karistirilabilirMi(this.durum, i)) return null;
        this.gecmis.push(klonla(this.durum));
        if (this.gecmis.length > 60) this.gecmis.shift();
        var oncekiler = this.durum.tupler[i].slice();
        var r = karistir(this.durum, i);
        this.hamleSayisi++;
        return {
          kap: i, oncesi: oncekiler, sonrasi: this.durum.tupler[i].slice(),
          camur: r.camur, kazandi: kazanildiMi(this.durum)
        };
      },

      geriAl: function () {
        if (!this.gecmis.length) return false;
        this.durum = this.gecmis.pop();
        this.hamleSayisi++;
        return true;
      },

      bastanBasla: function () {
        this.durum = klonla(baslangic);
        this.hamleSayisi = 0;
        this.gecmis = [];
      },

      yildiz: function () {
        var y = this.bolum.yildizButce;
        if (this.hamleSayisi <= y.uc) return 3;
        if (this.hamleSayisi <= y.iki) return 2;
        return 1;
      }
    };
  }

  /* ---------- 9) DIŞA AÇILAN ARAYÜZ ---------- */

  global.SuSiralaOzel = {
    HAM: HAM,
    CAMUR: CAMUR,
    KIRLI: KIRLI,
    kirliMi: kirliMi,
    RENK_AD: RENK_AD,
    RENK_HEX: RENK_HEX,
    KARISIM: KARISIM,
    BILESEN: BILESEN,
    karisimSonucu: karisimSonucu,

    ozelProfil: ozelProfil,
    ozelTahtaKur: ozelTahtaKur,
    tohumAra: tohumAra,
    ozelBolumUret: ozelBolumUret,
    OzelOyunOlustur: OzelOyunOlustur,

    klonla: klonla,
    hamleGecerliMi: hamleGecerliMi,
    hamleUygula: hamleUygula,
    hamleIsle: hamleIsle,
    karistir: karistir,
    karistirilabilirMi: karistirilabilirMi,
    gecerliHamleler: gecerliHamleler,
    kazanildiMi: kazanildiMi,
    camurVarMi: camurVarMi,

    CozucuOlustur: CozucuOlustur,
    cozumYolu: cozumYolu,
    tuzakOrani: tuzakOrani
  };

})(window);

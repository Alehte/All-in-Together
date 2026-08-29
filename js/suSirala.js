/* ============================================================
   SU SIRALAMA - ÇEKİRDEK MODÜL (UI yok)
   Kural: her rengin birim sayisi bir sisenin kapasitesine esittir.
   Kazanma: hicbir sisede karisik renk kalmamasi.
   Bolumler tohum tablosundan (suSiralaBolumler.js) uretilir.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- 1) DETERMİNİSTİK RASTGELE ---------- */

  function rngOlustur(tohum) {
    var t = tohum >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function karistir(dizi, rng) {
    for (var i = dizi.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var g = dizi[i]; dizi[i] = dizi[j]; dizi[j] = g;
    }
    return dizi;
  }

  /* ---------- 2) ZORLUK EĞRİSİ ---------- */

  function bolumProfili(n) {
    var p = {
      bolumNo: n,
      renk: 6,
      bos: 2,
      kapasiteAgirlik: [0, 1, 0],  /* [3'luk, 4'luk, 5'lik] gorece agirlik */
      gizliTup: 0,
      gizliTam: false,
      tuzakAlt: 0,
      tuzakUst: 10,
      tanitim: null
    };

    /* Tanitim bolumleri: her yeni mekanik once kolay haliyle gorunur */
    if (n === 5)  { p.renk = 3; p.gizliTup = 1; p.gizliTam = true; p.tuzakUst = 0; p.tanitim = 'gizli'; return p; }
    if (n === 12) { p.renk = 5; p.kapasiteAgirlik = [1, 1, 0]; p.tuzakUst = 5; p.tanitim = 'uclu'; return p; }
    if (n === 22) { p.renk = 5; p.kapasiteAgirlik = [1, 1, 1]; p.tuzakUst = 5; p.tanitim = 'besli'; return p; }
    if (n === 38) { p.renk = 6; p.bos = 1; p.tuzakUst = 15; p.tanitim = 'tekBos'; return p; }

    /* Renk sayisi: 23. bolumde tavana vurur */
    if (n <= 4)        p.renk = 2 + n;
    else if (n <= 11)  p.renk = Math.min(9, 5 + (n - 5));
    else if (n <= 120) p.renk = 9;
    else               p.renk = 10;

    /* Sise boylari */
    if (n < 12)        p.kapasiteAgirlik = [0, 1, 0];
    else if (n < 22)   p.kapasiteAgirlik = [1, 3, 0];
    else if (n < 121)  p.kapasiteAgirlik = [2, 3, 2];
    else if (n < 161)  p.kapasiteAgirlik = [3, 1, 3];
    else               p.kapasiteAgirlik = [1, 0, 1];

    /* Bos sise: olcumler 6+ renkte tek bos sisenin bolumu cozumsuz
       yaptigini gosterdi. Bu yuzden tek bos sise sadece renk sayisi
       dusurulmus "dar bolum"lerde kullaniliyor, seyrek araliklarla. */
    if (n >= 45 && n % 25 === 20) { p.bos = 1; p.renk = 5; }

    /* Gizli bolum sikligi */
    var gizliVar = false;
    if (n >= 161)      gizliVar = true;
    else if (n >= 121) gizliVar = (n % 4 !== 0);
    else if (n >= 71)  gizliVar = (n % 2 === 0);
    else if (n >= 39)  gizliVar = (n % 3 === 0);
    else if (n >= 23)  gizliVar = (n % 4 === 0);
    else if (n >= 13)  gizliVar = (n % 5 === 0);

    if (gizliVar) {
      p.gizliTam = true;
      if (n >= 161)      p.gizliTup = 7 + Math.floor((n - 161) / 40);
      else if (n >= 121) p.gizliTup = 5 + Math.floor((n - 121) / 20);
      else if (n >= 71)  p.gizliTup = 3 + Math.floor((n - 71) / 25);
      else if (n >= 39)  p.gizliTup = 2 + Math.floor((n - 39) / 32);
      else if (n >= 23)  p.gizliTup = 1 + Math.floor((n - 23) / 16);
      else               p.gizliTup = 1;
      p.gizliTup = Math.min(p.gizliTup, p.renk);
    }

    /* Tuzak orani: cozume giden yol boyunca olculur (sadece ilk hamlede
       degil). Bantlar gercek olcumlere gore ayarlandi. */
    var t = [[11, 0, 12], [21, 5, 20], [37, 15, 32], [70, 25, 42],
             [120, 32, 50], [160, 38, 56], [99999, 42, 62]];
    for (var i = 0; i < t.length; i++) {
      if (n <= t[i][0]) { p.tuzakAlt = t[i][1]; p.tuzakUst = t[i][2]; break; }
    }

    /* Tam gizli sise sayisi arttikca oyuncu planlayamaz, yoklar.
       Tuzak oranini geri cekiyoruz ki bolum kumara donmesin. */
    if (p.gizliTup > 0) {
      var telafi = 4 + p.gizliTup * 2;
      p.tuzakAlt = Math.max(0, p.tuzakAlt - telafi);
      p.tuzakUst = Math.max(10, p.tuzakUst - telafi);
    }

    return p;
  }

  /* ---------- 3) DURUM VE HAMLE KURALLARI ----------
     durum = { tupler: [[renk,...]], kaplar: [kapasite,...], gizli: [adet,...] }
     tupler[i][0] tupun DIBI. gizli[i] = alttan kac katman ortulu. */

  function klonla(d) {
    return {
      tupler: d.tupler.map(function (t) { return t.slice(); }),
      kaplar: d.kaplar,
      gizli: d.gizli ? d.gizli.slice() : null
    };
  }

  function tekRenkMi(tup) {
    for (var i = 1; i < tup.length; i++) if (tup[i] !== tup[0]) return false;
    return tup.length > 0;
  }

  function ustBlokUzunlugu(tup) {
    if (tup.length === 0) return 0;
    var renk = tup[tup.length - 1], n = 1;
    for (var i = tup.length - 2; i >= 0 && tup[i] === renk; i--) n++;
    return n;
  }

  function gizliAdet(d, i) {
    return d.gizli ? d.gizli[i] : 0;
  }

  /* Kazanma: hicbir tupte karisik renk yok VE her renk tek tupte */
  function kazanildiMi(d) {
    var gorulen = {};
    for (var i = 0; i < d.tupler.length; i++) {
      var t = d.tupler[i];
      if (t.length === 0) continue;
      if (!tekRenkMi(t)) return false;
      if (gorulen[t[0]]) return false;
      gorulen[t[0]] = true;
    }
    return true;
  }

  /* Bu tupte o rengin TUM birimleri var mi?
     Farkli kapasitelerde "tek renk + tam dolu" olmak yetmez:
     ayni renk baska bir tupte de duruyor olabilir. */
  function renkTamamlandiMi(d, i) {
    var t = d.tupler[i];
    if (t.length === 0 || !tekRenkMi(t)) return false;
    var renk = t[0];
    for (var j = 0; j < d.tupler.length; j++) {
      if (j === i) continue;
      var u = d.tupler[j];
      for (var k = 0; k < u.length; k++) if (u[k] === renk) return false;
    }
    return true;
  }

  function hamleGecerliMi(d, a, b) {
    if (a === b) return false;
    var kaynak = d.tupler[a], hedef = d.tupler[b];
    if (kaynak.length === 0) return false;
    if (hedef.length >= d.kaplar[b]) return false;

    /* Gizli katmanli tuplerde "olu hamle" kisitlarini uygulamiyoruz:
       aksi halde oyuncunun goremedigi bilgiye gore hamle engellenir. */
    var gizliYok = gizliAdet(d, a) === 0;
    var renkTamam = gizliYok && renkTamamlandiMi(d, a);

    if (hedef.length === 0) {
      /* Tamamlanmis rengi bos tupe tasimak sadece daha KUCUK bir kaba
         gecerken anlamli; aksi halde sonsuz dongu uretir. */
      if (renkTamam) return d.kaplar[b] < d.kaplar[a] && d.kaplar[b] >= kaynak.length;
      return true;
    }
    if (renkTamam) return false;
    return hedef[hedef.length - 1] === kaynak[kaynak.length - 1];
  }

  function hamleUygula(d, a, b) {
    var kaynak = d.tupler[a], hedef = d.tupler[b];
    var renk = kaynak[kaynak.length - 1];
    var adet = Math.min(ustBlokUzunlugu(kaynak), d.kaplar[b] - hedef.length);
    for (var i = 0; i < adet; i++) { kaynak.pop(); hedef.push(renk); }
    /* Ust katman her zaman gorunur: dokulunce alttakiler acilir */
    if (d.gizli && d.gizli[a] > kaynak.length - 1) {
      d.gizli[a] = Math.max(0, kaynak.length - 1);
    }
    return adet;
  }

  function gecerliHamleler(d) {
    var liste = [];
    for (var a = 0; a < d.tupler.length; a++) {
      for (var b = 0; b < d.tupler.length; b++) {
        if (hamleGecerliMi(d, a, b)) liste.push([a, b]);
      }
    }
    return liste;
  }

  /* ---------- 4) ÇÖZÜCÜ ----------
     Cozucu gizli katmanlari YOK SAYAR (her seyi bilir). Gizli katman
     cozulebilirligi degistirmez, sadece oyuncunun bilgisini kisitlar. */

  function anahtar(d) {
    var par = [];
    for (var i = 0; i < d.tupler.length; i++) {
      par.push(d.kaplar[i] + ':' + d.tupler[i].join(','));
    }
    return par.sort().join('|');
  }

  function acikDurum(d) {
    return { tupler: d.tupler.map(function (t) { return t.slice(); }), kaplar: d.kaplar, gizli: null };
  }

  /* Hamle siralama sezgiseli: iyi hamleyi one al, cozum hizli bulunsun */
  function hamlePuani(d, a, b) {
    var kaynak = d.tupler[a], hedef = d.tupler[b];
    var blok = ustBlokUzunlugu(kaynak);
    var puan = 0;
    if (hedef.length > 0) puan += 10;
    if (blok === kaynak.length) puan += 8;
    if (hedef.length + blok === d.kaplar[b]) puan += 12;
    puan -= Math.abs(d.kaplar[b] - (hedef.length + blok));
    return puan;
  }

  function siraliHamleler(d) {
    var h = gecerliHamleler(d);
    h.sort(function (x, y) { return hamlePuani(d, y[0], y[1]) - hamlePuani(d, x[0], x[1]); });
    return h;
  }

  /* Cozulebilirlik: DFS + hafiza */
  function CozucuOlustur(limit) {
    var memo = {};
    var sayac = 0;
    var tavan = limit || 400000;
    var tasti = false;

    function coz(d) {
      if (tasti) return false;
      var k = anahtar(d);
      if (memo[k] !== undefined) return memo[k];
      if (kazanildiMi(d)) { memo[k] = true; return true; }
      if (++sayac > tavan) { tasti = true; return false; }
      memo[k] = false;
      var hamleler = siraliHamleler(d);
      for (var i = 0; i < hamleler.length; i++) {
        var yeni = klonla(d);
        hamleUygula(yeni, hamleler[i][0], hamleler[i][1]);
        if (coz(yeni)) { memo[k] = true; return true; }
        if (tasti) return false;
      }
      return false;
    }

    return {
      cozulurMu: function (d) { return coz(acikDurum(d)); },
      tastiMi: function () { return tasti; },
      sifirla: function () { tasti = false; sayac = 0; }
    };
  }

  /* Referans cozum uzunlugu: sezgisel DFS ile bulunan iyi bir cozum.
     Kesin minimum degil; yildiz butcesi icin yeterli. */
  function cozumUzunlugu(d, limit) {
    var enIyi = -1;
    var gorulen = {};
    var sayac = 0;
    var tavan = limit || 120000;

    function dfs(durum, derinlik) {
      if (sayac > tavan) return;
      if (enIyi !== -1 && derinlik >= enIyi) return;
      if (kazanildiMi(durum)) { enIyi = derinlik; return; }
      sayac++;
      var k = anahtar(durum);
      if (gorulen[k] !== undefined && gorulen[k] <= derinlik) return;
      gorulen[k] = derinlik;
      var hamleler = siraliHamleler(durum);
      var sinir = Math.min(hamleler.length, 6);
      for (var i = 0; i < sinir; i++) {
        var yeni = klonla(durum);
        hamleUygula(yeni, hamleler[i][0], hamleler[i][1]);
        dfs(yeni, derinlik + 1);
      }
    }

    dfs(acikDurum(d), 0);
    return enIyi;
  }

  /* Tuzak orani: ilk hamlelerden kaci bolumu cozulemez hale getiriyor */
  function tuzakOrani(d, cozucu) {
    var hamleler = gecerliHamleler(acikDurum(d));
    if (hamleler.length === 0) return -1;
    var tuzak = 0;
    for (var i = 0; i < hamleler.length; i++) {
      var yeni = acikDurum(d);
      hamleUygula(yeni, hamleler[i][0], hamleler[i][1]);
      if (!cozucu.cozulurMu(yeni)) tuzak++;
      if (cozucu.tastiMi()) return -1;
    }
    return Math.round((tuzak / hamleler.length) * 100);
  }

  /* ---------- 5) TAHTA KURULUMU ---------- */

  function kapasiteSec(rng, agirlik) {
    var toplam = agirlik[0] + agirlik[1] + agirlik[2];
    var r = rng() * toplam;
    if (r < agirlik[0]) return 3;
    if (r < agirlik[0] + agirlik[1]) return 4;
    return 5;
  }

  /* Bolum numarasi + tohum -> tahta. Tamamen deterministik. */
  function tahtaKur(bolumNo, tohum) {
    var p = bolumProfili(bolumNo);
    var rng = rngOlustur(tohum);

    /* Her rengin birim sayisi = kendi "ev sisesinin" kapasitesi */
    var kaplar = [];
    for (var i = 0; i < p.renk; i++) kaplar.push(kapasiteSec(rng, p.kapasiteAgirlik));

    var havuz = [];
    for (var r = 0; r < p.renk; r++) {
      for (var k = 0; k < kaplar[r]; k++) havuz.push(r);
    }
    karistir(havuz, rng);

    var tupler = [];
    var idx = 0;
    for (var t = 0; t < p.renk; t++) {
      var tup = [];
      for (var j = 0; j < kaplar[t]; j++) tup.push(havuz[idx++]);
      tupler.push(tup);
    }

    /* Bos siseler: her rengi barindirabilsin diye en buyuk kapasitede */
    var enBuyuk = Math.max.apply(null, kaplar);
    for (var b = 0; b < p.bos; b++) { tupler.push([]); kaplar.push(enBuyuk); }

    return { tupler: tupler, kaplar: kaplar, gizli: bosGizli(tupler.length), profil: p };
  }

  function bosGizli(n) {
    var g = [];
    for (var i = 0; i < n; i++) g.push(0);
    return g;
  }

  /* ---------- 5b) PERDE KATMANI ----------
     Gizlilik tahtanin cozumunu DEGISTIRMEZ, sadece oyuncunun ne
     gordugunu belirler. Bu yuzden tahtadan bagimsiz uretilir:
     bolum tablosunu yeniden uretmeden perde dozu ayarlanabilir. */

  function perdeKur(tupler, p, tohum) {
    var gizli = bosGizli(tupler.length);
    if (!p.gizliTup || p.gizliTup < 1) return gizli;

    var rng = rngOlustur((tohum ^ 0x9E3779B9) >>> 0);
    var adaylar = [];
    for (var i = 0; i < tupler.length; i++) {
      if (tupler[i].length >= 2) adaylar.push(i);
    }
    karistir(adaylar, rng);

    var adet = Math.min(p.gizliTup, adaylar.length);
    for (var s = 0; s < adet; s++) {
      var t = adaylar[s];
      /* Ust katman gorunur, altindakilerin hepsi perdeli */
      gizli[t] = tupler[t].length - 1;
    }
    return gizli;
  }

  /* Baslangicta hazir gelen renk varsa bolum bedavaya geliyor demektir */
  function bedavaMi(d) {
    for (var i = 0; i < d.tupler.length; i++) {
      if (d.tupler[i].length > 0 && tekRenkMi(d.tupler[i])) return true;
    }
    return false;
  }

  /* ---------- 6) BÖLÜM ÜRETİMİ ---------- */

  function bolumUret(bolumNo) {
    var tablo = global.SuSiralaBolumler;
    var kayit = tablo ? tablo[bolumNo - 1] : null;

    var tohum, cozum, tuzak;
    if (kayit) {
      tohum = kayit[0]; tuzak = kayit[1]; cozum = kayit[2];
    } else {
      tohum = (bolumNo * 2654435761 + 12345) >>> 0;
      tuzak = -1; cozum = -1;
    }

    var d = tahtaKur(bolumNo, tohum);
    d.gizli = perdeKur(d.tupler, d.profil, tohum);
    if (cozum < 0) cozum = Math.max(6, d.profil.renk * 2);

    var gizliVar = false;
    for (var i = 0; i < d.gizli.length; i++) if (d.gizli[i] > 0) gizliVar = true;
    var ucYildiz = gizliVar ? Math.ceil(cozum * 1.25) : cozum;

    return {
      bolumNo: bolumNo,
      tupler: d.tupler,
      kaplar: d.kaplar,
      gizli: d.gizli,
      profil: d.profil,
      renkSayisi: d.profil.renk,
      bosTup: d.profil.bos,
      tuzakOrani: tuzak,
      cozumHamle: cozum,
      yildizButce: {
        uc: ucYildiz,
        iki: Math.ceil(ucYildiz * 1.35),
        bir: Math.ceil(ucYildiz * 1.85)
      }
    };
  }

  function yildizHesapla(bolum, yapilanHamle) {
    var b = bolum.yildizButce;
    if (yapilanHamle <= b.uc) return 3;
    if (yapilanHamle <= b.iki) return 2;
    return 1;
  }

  /* ---------- 7) OYUN OTURUMU ---------- */

  function OyunOlustur(bolumNo) {
    var bolum = bolumUret(bolumNo);
    var baslangic = {
      tupler: bolum.tupler.map(function (t) { return t.slice(); }),
      kaplar: bolum.kaplar,
      gizli: bolum.gizli.slice()
    };

    return {
      bolum: bolum,
      durum: klonla(baslangic),
      hamleSayisi: 0,
      gecmis: [],
      eklenenSise: 0,
      acilanPerde: 0,

      oynanabilirMi: function () { return gecerliHamleler(this.durum).length > 0; },

      /* --- Joker: bos sise ekle. Tahtanin dengesini en cok degistiren
         mudahale oldugu icin bolum basina sinirli. --- */
      siseEkle: function (enFazla) {
        var sinir = (enFazla === undefined) ? 2 : enFazla;
        if (this.eklenenSise >= sinir) return false;
        if (this.kazandiMi()) return false;
        this.gecmis.push(klonla(this.durum));
        var enBuyuk = Math.max.apply(null, this.durum.kaplar);
        this.durum.kaplar = this.durum.kaplar.slice();
        this.durum.kaplar.push(enBuyuk);
        this.durum.tupler.push([]);
        this.durum.gizli.push(0);
        this.eklenenSise++;
        return true;
      },

      /* --- Joker: bir sisenin perdesini kaldir --- */
      perdeliTupler: function () {
        var liste = [];
        for (var i = 0; i < this.durum.gizli.length; i++) {
          if (this.durum.gizli[i] > 0) liste.push(i);
        }
        return liste;
      },

      perdeAc: function (i) {
        if (!this.durum.gizli[i]) return false;
        this.gecmis.push(klonla(this.durum));
        this.durum.gizli[i] = 0;
        this.acilanPerde++;
        return true;
      },

      dok: function (a, b) {
        if (!hamleGecerliMi(this.durum, a, b)) return null;
        this.gecmis.push(klonla(this.durum));
        if (this.gecmis.length > 60) this.gecmis.shift();
        var oncekiUzunluk = this.durum.tupler[b].length;
        var adet = hamleUygula(this.durum, a, b);
        this.hamleSayisi++;
        return { kaynak: a, hedef: b, adet: adet, bas: oncekiUzunluk, kazandi: kazanildiMi(this.durum) };
      },

      geriAl: function () {
        if (this.gecmis.length === 0) return false;
        this.durum = this.gecmis.pop();
        this.hamleSayisi++;
        return true;
      },

      bastanBasla: function () {
        this.durum = klonla(baslangic);
        this.hamleSayisi = 0;
        this.gecmis = [];
        this.eklenenSise = 0;
        this.acilanPerde = 0;
      },

      kazandiMi: function () { return kazanildiMi(this.durum); },
      yildiz: function () { return yildizHesapla(this.bolum, this.hamleSayisi); }
    };
  }

  /* ---------- 8) DIŞA AÇILAN ARAYÜZ ---------- */

  global.SuSirala = {
    bolumProfili: bolumProfili,
    tahtaKur: tahtaKur,
    perdeKur: perdeKur,
    bolumUret: bolumUret,
    OyunOlustur: OyunOlustur,
    hamleGecerliMi: hamleGecerliMi,
    hamleUygula: hamleUygula,
    gecerliHamleler: gecerliHamleler,
    kazanildiMi: kazanildiMi,
    renkTamamlandiMi: renkTamamlandiMi,
    klonla: klonla,
    bedavaMi: bedavaMi,
    CozucuOlustur: CozucuOlustur,
    cozumUzunlugu: cozumUzunlugu,
    tuzakOrani: tuzakOrani,
    yildizHesapla: yildizHesapla,
    rngOlustur: rngOlustur
  };
  
  window.git = function (n) {
  AppProgress.ssAcik = Math.max(AppProgress.ssAcik, n);
  AppSaveProgress();
  location.reload();
};
 window.ssCozum = function (bolumNo) {
    var kayit = SuSiralaBolumler[bolumNo - 1];
    var d = tahtaKur(bolumNo, kayit[0]);
    var baslangic = acikDurum(d);

    var memo = {};
    var yol = [];
    var sayac = 0;

    function ara(durum) {
      if (kazanildiMi(durum)) return true;
      if (++sayac > 400000) return false;
      var k = anahtar(durum);
      if (memo[k]) return false;
      memo[k] = true;

      var hamleler = siraliHamleler(durum);
      for (var i = 0; i < hamleler.length; i++) {
        var a = hamleler[i][0], b = hamleler[i][1];
        var yeni = klonla(durum);
        var renk = durum.tupler[a][durum.tupler[a].length - 1];
        var adet = hamleUygula(yeni, a, b);
        yol.push([a, b, renk, adet]);
        if (ara(yeni)) return true;
        yol.pop();
      }
      return false;
    }

    if (!ara(baslangic)) { console.log('Çözüm bulunamadı'); return null; }

    console.log('Bölüm ' + bolumNo + ' — ' + yol.length + ' hamle');
    console.log('Kapasiteler: ' + d.kaplar.join(', '));
    console.log('Başlangıç:');
    baslangic.tupler.forEach(function (t, i) {
      console.log('  ' + i + ' (' + d.kaplar[i] + '): ' + (t.length ? t.join(',') : '—'));
    });
    console.log('Hamleler (tüp no -> tüp no, renk x adet):');
    yol.forEach(function (h, n) {
      console.log('  ' + (n + 1) + '. ' + h[0] + ' -> ' + h[1] + '  renk ' + h[2] + ' x' + h[3]);
    });
    return yol;
  };

})(typeof window !== 'undefined' ? window : global);
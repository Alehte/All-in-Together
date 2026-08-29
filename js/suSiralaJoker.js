/* ============================================================
   SU SIRALAMA - JOKER SİSTEMİ
   Envanter, fiyatlar, satin alma ve kalici kayit.
   suSirala.js'ten SONRA yuklenmeli.

   PROJEYE BAGLAMA: asagidaki "KOPRULER" bolumundeki iki nesneyi
   kendi altyapina baglaman yeterli (AppGold / AppSaveProgress).
   Baglamazsan localStorage ile kendi basina calisir.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- 1) TANIMLAR VE FİYATLAR ----------
     Fiyat mantigi: bir jokerin bedeli, bolumu ne kadar
     kolaylastirdigiyla orantili.
       geriAl   - tek hamleyi duzeltir, yildiz butcesinden zaten yiyor
       perdeAc  - bir sisenin bilgisini acar, sadece perdeli bolumde ise yarar
       siseEkle - tahtanin tum dengesini degistirir, en guclusu */

  var TANIM = {
    geriAl: {
      ad: 'Geri Al',
      aciklama: 'Son hamleyi geri alır.',
      fiyat: 25,
      paket: { adet: 5, fiyat: 100 },
      baslangic: 10
    },
    perdeAc: {
      ad: 'Perde Aç',
      aciklama: 'Bir şişenin üstündeki perdeyi kaldırır.',
      fiyat: 60,
      paket: { adet: 3, fiyat: 150 },
      baslangic: 0
    },
    siseEkle: {
      ad: 'Şişe Ekle',
      aciklama: 'Tahtaya boş bir şişe ekler.',
      fiyat: 150,
      paket: { adet: 3, fiyat: 400 },
      baslangic: 3,
      bolumSiniri: 2
    }
  };

  var TURLER = ['geriAl', 'perdeAc', 'siseEkle'];

  /* ---------- 2) KÖPRÜLER ----------
     core.js'teki AppGold ve AppProgress/AppSaveProgress'e baglidir.
     Envanter ait_progress kaydinin icinde ssJoker alaninda durur,
     yani "Ilerlemeyi Sifirla" ile birlikte sifirlanir. */

  var altin = {
    oku: function () {
      if (global.AppGold && typeof global.AppGold.get === 'function') return global.AppGold.get();
      return 0;
    },
    harca: function (miktar) {
      if (!global.AppGold || typeof global.AppGold.add !== 'function') return false;
      if (global.AppGold.get() < miktar) return false;
      global.AppGold.add(-miktar);
      return true;
    },
    kazan: function (miktar) {
      if (global.AppGold && typeof global.AppGold.add === 'function') global.AppGold.add(miktar);
    }
  };

  /* Envanter ortak ilerleme kaydinda tutulur: ait_progress icinde ssJoker */
  var depo = {
    oku: function () {
      if (global.AppProgress && global.AppProgress.ssJoker) return global.AppProgress.ssJoker;
      return null;
    },
    yaz: function (veri) {
      if (global.AppProgress) global.AppProgress.ssJoker = veri;
      if (typeof global.AppSaveProgress === 'function') global.AppSaveProgress({ ssJoker: veri });
    }
  };

  /* ---------- 3) ENVANTER ---------- */

  var envanter = null;

  function varsayilan() {
    var e = {};
    for (var i = 0; i < TURLER.length; i++) {
      e[TURLER[i]] = TANIM[TURLER[i]].baslangic;
    }
    return e;
  }

  function yukle() {
    if (envanter) return envanter;
    var kayit = null;
    try { kayit = api.depo.oku(); } catch (e) { kayit = null; }

    if (!kayit || typeof kayit !== 'object') {
      envanter = varsayilan();
      kaydet();
      return envanter;
    }
    /* Eksik alanlari tamamla: yeni joker eklenirse eski kayit bozulmasin */
    envanter = {};
    for (var i = 0; i < TURLER.length; i++) {
      var t = TURLER[i];
      var v = parseInt(kayit[t], 10);
      envanter[t] = isNaN(v) ? (kayit.ilkVerildi ? 0 : TANIM[t].baslangic) : v;
    }
    envanter.ilkVerildi = true;
    return envanter;
  }

  function kaydet() {
    if (!envanter) return;
    envanter.ilkVerildi = true;
    try { api.depo.yaz(envanter); } catch (e) {}
  }

  function adet(tur) {
    var e = yukle();
    return e[tur] || 0;
  }

  function ekle(tur, sayi) {
    if (!TANIM[tur]) return 0;
    var e = yukle();
    e[tur] = Math.max(0, (e[tur] || 0) + (sayi || 1));
    kaydet();
    return e[tur];
  }

  function kullan(tur) {
    var e = yukle();
    if (!e[tur] || e[tur] < 1) return false;
    e[tur]--;
    kaydet();
    return true;
  }

  /* ---------- 4) SATIN ALMA ---------- */

  function fiyat(tur, paketMi) {
    var t = TANIM[tur];
    if (!t) return 0;
    return paketMi && t.paket ? t.paket.fiyat : t.fiyat;
  }

  function satinAl(tur, paketMi) {
    var t = TANIM[tur];
    if (!t) return { ok: false, sebep: 'bilinmeyen' };
    var bedel = fiyat(tur, paketMi);
    var kasa = api.altin.oku();
    if (kasa < bedel) return { ok: false, sebep: 'yetersizAltin', eksik: bedel - kasa };
    if (!api.altin.harca(bedel)) return { ok: false, sebep: 'harcamaBasarisiz' };
    var kazanilan = paketMi && t.paket ? t.paket.adet : 1;
    ekle(tur, kazanilan);
    return { ok: true, adet: adet(tur), harcanan: bedel, kazanilan: kazanilan };
  }

  /* ---------- 5) OYUN İÇİ KULLANIM ----------
     Bu fonksiyonlar hem envanteri hem tahtayi gunceller.
     Donen deger: { ok, sebep } */

  function jokerGeriAl(oyun) {
    if (!oyun || oyun.gecmis.length === 0) return { ok: false, sebep: 'gecmisYok' };
    if (adet('geriAl') < 1) return { ok: false, sebep: 'stokYok' };
    if (!oyun.geriAl()) return { ok: false, sebep: 'basarisiz' };
    kullan('geriAl');
    return { ok: true, kalan: adet('geriAl') };
  }

  function jokerSiseEkle(oyun) {
    if (!oyun) return { ok: false, sebep: 'oyunYok' };
    var sinir = TANIM.siseEkle.bolumSiniri;
    if (oyun.eklenenSise >= sinir) return { ok: false, sebep: 'bolumSiniri', sinir: sinir };
    if (adet('siseEkle') < 1) return { ok: false, sebep: 'stokYok' };
    if (!oyun.siseEkle(sinir)) return { ok: false, sebep: 'basarisiz' };
    kullan('siseEkle');
    return { ok: true, kalan: adet('siseEkle') };
  }

  function jokerPerdeAc(oyun, tupIndeksi) {
    if (!oyun) return { ok: false, sebep: 'oyunYok' };
    var perdeliler = oyun.perdeliTupler();
    if (perdeliler.length === 0) return { ok: false, sebep: 'perdeYok' };
    if (adet('perdeAc') < 1) return { ok: false, sebep: 'stokYok' };
    var hedef = (tupIndeksi === undefined) ? perdeliler[0] : tupIndeksi;
    if (!oyun.perdeAc(hedef)) return { ok: false, sebep: 'basarisiz' };
    kullan('perdeAc');
    return { ok: true, kalan: adet('perdeAc') };
  }

  /* ---------- 6) DIŞA AÇILAN ARAYÜZ ---------- */

  var api = {
    TANIM: TANIM,
    TURLER: TURLER,
    altin: altin,
    depo: depo,
    adet: adet,
    ekle: ekle,
    kullan: kullan,
    fiyat: fiyat,
    satinAl: satinAl,
    geriAl: jokerGeriAl,
    siseEkle: jokerSiseEkle,
    perdeAc: jokerPerdeAc,
    envanterOku: function () {
      var e = yukle(), c = {};
      for (var i = 0; i < TURLER.length; i++) c[TURLER[i]] = e[TURLER[i]] || 0;
      return c;
    },
    sifirla: function () {
      envanter = varsayilan();
      kaydet();
      return api.envanterOku();
    }
  };

  global.SuSiralaJoker = api;

})(window);

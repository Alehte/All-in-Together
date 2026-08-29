/* ============================================================
   ÖZEL BÖLÜM TABLOSU ÜRETİCİ  —  bir kez çalıştırılır

   Kullanım (proje klasöründe, Node kurulu olmalı):
       node uretOzelBolumler.js 100

   Çıktı: js/suSiralaOzelBolumler.js
   Profil ayarlarını (ozelProfil) her değiştirdiğinde yeniden çalıştır.

   Her bölüm için çözülebilir + zorluk bandına uyan bir tohum aranır.
   Ara sonuçlar sürekli kaydedilir; kapatıp tekrar başlatırsan kaldığı
   yerden devam eder.
   ============================================================ */

var fs = require('fs');
var yol = require('path');

/* --- tarayıcı ortamını taklit et --- */
global.window = global;
window.SuSirala = {
  rngOlustur: function (tohum) {
    var s = tohum >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
};

var modulYolu = fs.existsSync('./js/suSiralaOzel.js')
  ? './js/suSiralaOzel.js' : './suSiralaOzel.js';
require(yol.resolve(modulYolu));
var O = window.SuSiralaOzel;

/*  node UretozelBolumler.js <bas> <son> [deneme]
    Ornek — dort komut isteminde ayni anda:
        node UretozelBolumler.js 41 55
        node UretozelBolumler.js 56 70
        node UretozelBolumler.js 71 85
        node UretozelBolumler.js 86 100                    */
var TOPLAM = 100;                     /* tablonun toplam boyu, sabit */
var BAS    = parseInt(process.argv[2] || '1', 10);
var SON    = parseInt(process.argv[3] || String(TOPLAM), 10);
var DENEME = parseInt(process.argv[4] || '150', 10);
var ARA = './_ozelTabloAra_' + BAS + '-' + SON + '.json';
var CIKTI = fs.existsSync('./js') ? './js/suSiralaOzelBolumler.js'
                                  : './suSiralaOzelBolumler.js';

var tablo = fs.existsSync(ARA) ? JSON.parse(fs.readFileSync(ARA, 'utf8')) : {};
var basladi = Date.now();
var bulunamayan = [];

for (var n = BAS; n <= SON; n++) {
  if (tablo[n]) continue;                       /* kaldığı yerden devam */

  var t0 = Date.now();
  var r = O.tohumAra(n, DENEME);
  tablo[n] = r || [0, -1, -1];
  fs.writeFileSync(ARA, JSON.stringify(tablo));

  var sn = ((Date.now() - t0) / 1000).toFixed(1);
  var toplamSn = ((Date.now() - basladi) / 1000).toFixed(0);
  if (r) {
    console.log('  ' + n + '/' + TOPLAM + '  tuzak %' + r[1] +
                '  ' + r[2] + ' hamle   (' + sn + 's, toplam ' + toplamSn + 's)');
  } else {
    console.log('  ' + n + '/' + TOPLAM + '  BULUNAMADI   (' + sn + 's)');
    bulunamayan.push(n);
  }
}

/* Butun ara dosyalari birlestir — paralel calisan komutlarin sonuclari
   tek tabloda toplansin. Eski _ozelTabloAra.json da bu kalibla eslesir. */
var hepsi = {};
fs.readdirSync('.').forEach(function (ad) {
  if (!/^_ozelTabloAra.*\.json$/.test(ad)) return;
  var p = JSON.parse(fs.readFileSync(ad, 'utf8'));
  for (var a in p) if (p[a] && p[a][0]) hepsi[a] = p[a];
});

var eksik = [];
var satirlar = [];
for (var i = 1; i <= TOPLAM; i++) {
  var k = hepsi[i] || [0, -1, -1];
  if (!k[0]) eksik.push(i);
  satirlar.push('  [' + k[0] + ',' + k[1] + ',' + k[2] + ']');
}

fs.writeFileSync(CIKTI,
  '/* Su Sıralama — ÖZEL BÖLÜMLER tablosu\n' +
  '   [tohum, tuzakOrani, cozumHamle]  —  çözücüyle doğrulandı\n' +
  '   Üretim: node uretOzelBolumler.js ' + TOPLAM + '\n' +
  '   ELLE DÜZENLEME — profil değişirse betiği yeniden çalıştır. */\n\n' +
  'window.SuSiralaOzelBolumler = [\n' + satirlar.join(',\n') + '\n];\n');

console.log('\nYazıldı: ' + CIKTI);
if (bulunamayan.length) {
  console.log('Tohum bulunamayan bölümler: ' + bulunamayan.join(', '));
  console.log('Bu bölümlerin profil ayarları çok dar olabilir (tuzakAlt/tuzakUst).');
} else {
  console.log('Tüm bölümler doğrulandı.');
}
console.log('\nYazıldı: ' + CIKTI);
if (eksik.length) console.log('Tabloda hâlâ boş olan bölümler: ' + eksik.join(', '));
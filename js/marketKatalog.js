// marketKatalog.js — MARKET urun tablosu. SAF VERI, mantik yok.
//
// TAM SET MANTIGI
// Bir tema = 5 parca: arka plan + Kacis derisi + Sirala Dur sisesi +
// 2048 karolari + Tempo Kup bloklari. Bes parca ayni konsepti tasir ama
// oyuncuya AYRI AYRI satilir / sandiktan ayri ayri cikar.
// Nadirlik temanin tamamina aittir: "Toprak" siradan bir temaysa bes
// parcasi da siradan.
//
// Her parcada `aile` alani vardir; ayni ailenin parcalari envanterde ve
// koleksiyon sayacinda birlikte gosterilebilir.
//
// KURAL: her kategoride bir tane varsayilan urun vardir. Varsayilan
// urunlerin verisi { yerlesik:true } seklindedir; bu "oyun hicbir seyi
// ezmesin, mevcut cizim aynen kalsin" demektir.

window.AppMarketKatalog = (function () {
  'use strict';

  // ---------------------------------------------------------------
  // NADIRLIK KADEMELERI
  // ---------------------------------------------------------------
  var NADIRLIK = {
    siradan:  { ad: 'Sıradan',  renk: '#8A8F98', parlak: '#B9BEC7', fiyat: 400,  sira: 0 },
    nadir:    { ad: 'Nadir',    renk: '#3B82F6', parlak: '#7DAEFF', fiyat: 900,  sira: 1 },
    ender:    { ad: 'Ender',    renk: '#A855F7', parlak: '#CB93FF', fiyat: 2000, sira: 2 },
    efsanevi: { ad: 'Efsanevi', renk: '#FBBF24', parlak: '#FFDA7A', fiyat: 4000, sira: 3 }
  };

  // ---------------------------------------------------------------
  // SANDIKLAR
  // ihtimal toplami 1.00 olmali. Cekilis once nadirligi secer, sonra o
  // nadirlikten sahip OLUNMAYAN bir urun verir.
  // ---------------------------------------------------------------
  var SANDIKLAR = [
    {
      id: 'gumus',
      ad: 'Gümüş Kutu',
      fiyat: 1000,
      renk: '#B8C4D4',
      ihtimal: { siradan: 0.50, nadir: 0.30, ender: 0.15, efsanevi: 0.05 }
    },
    {
      id: 'altin',
      ad: 'Altın Kutu',
      fiyat: 3500,
      renk: '#F0B93C',
      ihtimal: { siradan: 0.19, nadir: 0.38, ender: 0.28, efsanevi: 0.15 }
    }
  ];

  // ---------------------------------------------------------------
  // KATEGORILER
  // ---------------------------------------------------------------
  var KATEGORILER = [
    { anahtar: 'genel.arkaplan',  ad: 'Arka Plan',  oyun: 'genel',    tur: 'arkaplan' },
    { anahtar: 'kacis.deri',      ad: 'Kaçış?',     oyun: 'kacis',    tur: 'deri'     },
    { anahtar: 'susirala.sise',   ad: 'Sırala Dur', oyun: 'susirala', tur: 'sise'     },
    { anahtar: 'h2048.karo',      ad: 'Hedef 2048', oyun: 'h2048',    tur: 'karo'     },
    { anahtar: 'tempo.blok',      ad: 'Tempo Küp',  oyun: 'tempo',    tur: 'blok'     }
  ];

  var URUNLER = [

    // =============================================================
    // VARSAYILANLAR — ucretsiz, bastan sahip, vitrine/sandiga girmez
    // =============================================================
    { id: 'genel.arkaplan.varsayilan', ad: 'Varsayılan', nadirlik: 'siradan',
      fiyat: 0, varsayilan: true, vitrinDisi: true, veri: { yerlesik: true } },
    { id: 'kacis.deri.varsayilan', ad: 'Varsayılan', nadirlik: 'siradan',
      fiyat: 0, varsayilan: true, vitrinDisi: true, veri: { yerlesik: true } },
    { id: 'susirala.sise.varsayilan', ad: 'Varsayılan', nadirlik: 'siradan',
      fiyat: 0, varsayilan: true, vitrinDisi: true, veri: { yerlesik: true } },
    { id: 'h2048.karo.varsayilan', ad: 'Varsayılan', nadirlik: 'siradan',
      fiyat: 0, varsayilan: true, vitrinDisi: true, veri: { yerlesik: true } },
    { id: 'tempo.blok.varsayilan', ad: 'Varsayılan', nadirlik: 'siradan',
      fiyat: 0, varsayilan: true, vitrinDisi: true, veri: { yerlesik: true } },

    // #############################################################
    // TEMA 1 — TOPRAK  (siradan)
    // Islak kakao toprak, kuru kil, yosun. Sicak ve mat; hicbir yerde
    // parlaklik yok. Hedef yilan topragin altindaki yasayan kok.
    // #############################################################
    {
      id: 'genel.arkaplan.toprak', ad: 'Toprak', aile: 'toprak',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        css: 'radial-gradient(70% 45% at 22% 12%, rgba(94,68,42,.50) 0%, rgba(94,68,42,0) 68%),' +
             'radial-gradient(60% 40% at 82% 86%, rgba(46,32,20,.60) 0%, rgba(46,32,20,0) 70%),' +
             'linear-gradient(175deg, #14100C 0%, #1E1811 58%, #120E0A 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.toprak', ad: 'Toprak', aile: 'toprak',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        govde: { tip: 'benekli', renkler: ['#9C7A55', '#7E5F3E', '#B69572', '#6A4C30'],
                 kontur: '#3B2A1B', parlak: false },
        // hedef: toprak altindaki canli kok — kesintili yesil damar
        hedef: { tip: 'benekli', renkler: ['#6B7350'], kontur: '#2F3524',
                 vurgu: '#4E9E5C', vurguTip: 'damar', parlak: false }
      }
    },
    {
      id: 'h2048.karo.toprak', ad: 'Toprak', aile: 'toprak',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        zemin: '#17120D', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#241A12', '#A8926F'],
          '4':    ['#2C2016', '#B49C77'],
          '8':    ['#35271A', '#C0A67F'],
          '16':   ['#3F2E1E', '#CCB088'],
          '32':   ['#4A3722', '#D8BA90'],
          '64':   ['#574026', '#E4C499'],
          '128':  ['#654A2A', '#EFCFA3'],
          '256':  ['#75552E', '#FADAAE'],
          '512':  ['#876132', '#FFE6BE'],
          '1024': ['#9B7038', '#FFEFD2'],
          '2048': ['#C9A25A', '#241705'],
          'wild': ['#E8C46A', '#3A2A08'],
          'kilit':['#33302B', '#8C8578'],
          'duvar':['#1E1A14', '#453E33']
        }
      }
    },
    {
      id: 'tempo.blok.toprak', ad: 'Toprak', aile: 'toprak',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        renkler: ['#B4623A', '#7E8C4E', '#D2B78A', '#9C6B45', '#5F8A5C', '#6E4A30', '#C99A4E'],
        kenar: null, koseYaricap: '22%', doku: null, parlama: false, icDetay: null
      }
    },

    // #############################################################
    // TEMA 2 — KUMSAL  (siradan)
    // Acik kum ve sig deniz. Alt tarafi sicak kum, ust tarafi turkuaz.
    // 2048'de sayi buyudukce kumdan denize gecer.
    // #############################################################
    {
      id: 'genel.arkaplan.kumsal', ad: 'Kumsal', aile: 'kumsal',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        css: 'radial-gradient(85% 38% at 50% 102%, rgba(214,188,142,.30) 0%, rgba(214,188,142,0) 72%),' +
             'radial-gradient(70% 45% at 20% 6%, rgba(66,134,128,.34) 0%, rgba(66,134,128,0) 68%),' +
             'linear-gradient(180deg, #0F1D22 0%, #16262A 52%, #241F18 100%)',
        koyuluk: 'orta', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.kumsal', ad: 'Kumsal', aile: 'kumsal',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        govde: { tip: 'duz', renkler: ['#E0C79B', '#C9A87A', '#8FC7C2', '#EFDCBC'],
                 kontur: '#6E5B41', parlak: false },
        // hedef: govdeye sarilmis deniz yosunu seridi
        hedef: { tip: 'duz', renkler: ['#CBBE96'], kontur: '#3E5245',
                 vurgu: '#3FB98C', vurguTip: 'cizgi', parlak: false }
      }
    },
    {
      id: 'h2048.karo.kumsal', ad: 'Kumsal', aile: 'kumsal',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        zemin: '#141C1E', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#23201A', '#9F9078'],
          '4':    ['#2D291F', '#B0A085'],
          '8':    ['#383124', '#C1B092'],
          '16':   ['#443B29', '#D2C0A0'],
          '32':   ['#51462E', '#E3D0AD'],
          '64':   ['#5F5233', '#F0DEBB'],
          '128':  ['#6F5F38', '#FBEBC9'],
          '256':  ['#80703E', '#FFF4D8'],
          '512':  ['#2F6E6A', '#BEEDE6'],
          '1024': ['#3A8C84', '#D6F5EF'],
          '2048': ['#58C4B4', '#04241F'],
          'wild': ['#F0CE7A', '#3A2C08'],
          'kilit':['#33302A', '#8A8375'],
          'duvar':['#1E1B16', '#464036']
        }
      }
    },
    {
      id: 'tempo.blok.kumsal', ad: 'Kumsal', aile: 'kumsal',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        renkler: ['#E2C99C', '#E89A78', '#5CC4B4', '#F2D06A', '#A89070', '#7FB8D4', '#2F8E86'],
        kenar: null, koseYaricap: '26%', doku: null, parlama: false, icDetay: null
      }
    },

    // #############################################################
    // TEMA 3 — BUZ  (siradan)
    // Donmus gol, buzun icine hapsolmus hava kabarciklari. Tek soguk
    // tema. Hedef yilanin yesili buzun altindan sizan tek renk.
    // #############################################################
    {
      id: 'genel.arkaplan.buz', ad: 'Buz', aile: 'buz',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        css: 'radial-gradient(66% 40% at 26% 12%, rgba(96,150,190,.36) 0%, rgba(96,150,190,0) 68%),' +
             'radial-gradient(58% 38% at 80% 88%, rgba(48,88,124,.42) 0%, rgba(48,88,124,0) 70%),' +
             'linear-gradient(178deg, #0A121C 0%, #101E2C 56%, #0C1622 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.buz', ad: 'Buz', aile: 'buz',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        govde: { tip: 'duz', renkler: ['#BBD4E4', '#9CBBD0', '#D8E9F2', '#8AA9C0'],
                 kontur: '#3E5C74', parlak: true },
        // hedef: buzun altindan gorunen tek canli renk — parlak yesil kontur
        hedef: { tip: 'duz', renkler: ['#A9CFD4'], kontur: '#2FA97A',
                 vurgu: '#35D98A', vurguTip: 'kontur', parlak: true }
      }
    },
    {
      id: 'h2048.karo.buz', ad: 'Buz', aile: 'buz',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        zemin: '#0E1620', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#17222E', '#7A97AE'],
          '4':    ['#1B2A38', '#86A5BC'],
          '8':    ['#203243', '#92B2C9'],
          '16':   ['#253B4E', '#9FC0D6'],
          '32':   ['#2B455A', '#ACCEE3'],
          '64':   ['#325067', '#B9DCEF'],
          '128':  ['#395C75', '#C7EAFA'],
          '256':  ['#416984', '#D6F3FF'],
          '512':  ['#4A7894', '#E6F9FF'],
          '1024': ['#5A8FAC', '#F2FDFF'],
          '2048': ['#A8DFF0', '#0B2230'],
          'wild': ['#E8CE7A', '#2E2408'],
          'kilit':['#2A3038', '#808C99'],
          'duvar':['#161C24', '#3A4550']
        }
      }
    },
    {
      id: 'tempo.blok.buz', ad: 'Buz', aile: 'buz',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        renkler: ['#BBD4E4', '#7FB4CC', '#D8E9F2', '#8FD0C4', '#9C8FD0', '#5E93B2', '#A6B8D8'],
        kenar: '#41627C', koseYaricap: '14%', doku: null, parlama: true, icDetay: null
      }
    },

    // #############################################################
    // TEMA 4 — PAS  (siradan)
    // Oksitlenmis demir. Hedef yilanin yesili bakir pasi (verdigris) —
    // konseptin kendi icinden cikan, zorlanmadan yesil bir cozum.
    // #############################################################
    {
      id: 'genel.arkaplan.pas', ad: 'Pas', aile: 'pas',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        css: 'radial-gradient(64% 42% at 18% 14%, rgba(150,72,36,.42) 0%, rgba(150,72,36,0) 66%),' +
             'radial-gradient(56% 36% at 84% 82%, rgba(74,34,18,.58) 0%, rgba(74,34,18,0) 70%),' +
             'linear-gradient(172deg, #150E0B 0%, #221410 60%, #130D0A 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.pas', ad: 'Pas', aile: 'pas',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        govde: { tip: 'benekli', renkler: ['#B4623A', '#8E4526', '#C98A5E', '#6E3A22'],
                 kontur: '#3A1D11', parlak: false },
        // hedef: bakir pasi tutmus govde, kontur tamamen verdigris yesili
        hedef: { tip: 'benekli', renkler: ['#8A5A3C'], kontur: '#4FC08A',
                 vurgu: '#4FC08A', vurguTip: 'kontur', parlak: false }
      }
    },
    {
      id: 'h2048.karo.pas', ad: 'Pas', aile: 'pas',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        zemin: '#18100C', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#251710', '#A87A5C'],
          '4':    ['#2E1C13', '#B58363'],
          '8':    ['#382116', '#C28C6A'],
          '16':   ['#432619', '#CF9571'],
          '32':   ['#4F2C1C', '#DC9E78'],
          '64':   ['#5C321F', '#E9A77F'],
          '128':  ['#6A3822', '#F5B187'],
          '256':  ['#7A3F25', '#FFBC91'],
          '512':  ['#8C4728', '#FFC9A2'],
          '1024': ['#A3522C', '#FFD8B6'],
          '2048': ['#D97B3A', '#2A1206'],
          'wild': ['#E8C46A', '#3A2A08'],
          'kilit':['#302B28', '#8A817B'],
          'duvar':['#1C1512', '#423630']
        }
      }
    },
    {
      id: 'tempo.blok.pas', ad: 'Pas', aile: 'pas',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        renkler: ['#B4623A', '#8E4526', '#C99A5E', '#5E9E82', '#7A6E66', '#D9884C', '#4A3A34'],
        kenar: '#2E1A12', koseYaricap: '10%', doku: null, parlama: false, icDetay: null
      }
    },

    // #############################################################
    // TEMA 5 — DUMAN  (siradan)
    // Notr gri-mor sis. Digerlerinden palet ailesi olarak tamamen ayri.
    // Hedef yilan sisin icinden sizan tek renkli isik.
    // #############################################################
    {
      id: 'genel.arkaplan.duman', ad: 'Duman', aile: 'duman',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        css: 'radial-gradient(90% 30% at 50% 34%, rgba(150,150,180,.20) 0%, rgba(150,150,180,0) 72%),' +
             'radial-gradient(62% 40% at 16% 8%, rgba(108,100,140,.34) 0%, rgba(108,100,140,0) 68%),' +
             'linear-gradient(176deg, #0E0E14 0%, #17161F 55%, #0B0B11 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.duman', ad: 'Duman', aile: 'duman',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        govde: { tip: 'seritli', renkler: ['#8A8A9C', '#6E6E80', '#A6A6B8', '#585866'],
                 kontur: '#2E2E38', parlak: false },
        // hedef: sisin icinden sizan tek renk — kesintili yesil damar
        hedef: { tip: 'seritli', renkler: ['#6E7A78'], kontur: '#33403A',
                 vurgu: '#54C48E', vurguTip: 'damar', parlak: false }
      }
    },
    {
      id: 'h2048.karo.duman', ad: 'Duman', aile: 'duman',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        zemin: '#111118', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#1A1A20', '#83839A'],
          '4':    ['#202028', '#8E8EA5'],
          '8':    ['#262630', '#9999B0'],
          '16':   ['#2D2D39', '#A5A5BB'],
          '32':   ['#353542', '#B1B1C6'],
          '64':   ['#3D3D4C', '#BDBDD1'],
          '128':  ['#464657', '#C9C9DC'],
          '256':  ['#505063', '#D6D6E7'],
          '512':  ['#5B5B70', '#E3E3F1'],
          '1024': ['#68687E', '#F0F0FB'],
          '2048': ['#B6B6D0', '#1A1A24'],
          'wild': ['#E0C878', '#2E2608'],
          'kilit':['#2A2A32', '#82828F'],
          'duvar':['#171720', '#3C3C4A']
        }
      }
    },
    {
      id: 'tempo.blok.duman', ad: 'Duman', aile: 'duman',
      nadirlik: 'siradan', fiyat: 400,
      veri: {
        renkler: ['#9A9AAE', '#6E8C86', '#8C7A78', '#7A7ABE', '#5E6470', '#B8B8C6', '#586E5E'],
        kenar: '#2A2A34', koseYaricap: '18%', doku: null, parlama: false, icDetay: null
      }
    },

    // #############################################################
    // TEMA 6 — MUREKKEP  (nadir)
    // Kagida dagilan indigo murekkep. Renk + yayilma degradesi.
    // #############################################################
    {
      id: 'genel.arkaplan.murekkep', ad: 'Mürekkep', aile: 'murekkep',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        css: 'radial-gradient(58% 34% at 24% 16%, rgba(96,104,196,.34) 0%, rgba(96,104,196,0) 66%),' +
             'radial-gradient(52% 32% at 78% 76%, rgba(58,42,124,.44) 0%, rgba(58,42,124,0) 68%),' +
             'radial-gradient(120% 60% at 50% 108%, rgba(20,22,52,.85) 0%, rgba(20,22,52,0) 60%),' +
             'linear-gradient(176deg, #0D0F1E 0%, #171A34 56%, #0B0D1A 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.murekkep', ad: 'Mürekkep', aile: 'murekkep',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        govde: { tip: 'benekli', renkler: ['#4A4A8C', '#38386E', '#5E5EA6', '#2C2C56'],
                 kontur: '#16162E', parlak: false },
        // hedef: kagida dusen ikinci renk — govde boyunca yesil murekkep cizgisi
        hedef: { tip: 'benekli', renkler: ['#3E4A6E'], kontur: '#1E3A32',
                 vurgu: '#3FD98E', vurguTip: 'cizgi', parlak: false }
      }
    },
    {
      id: 'h2048.karo.murekkep', ad: 'Mürekkep', aile: 'murekkep',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        zemin: '#101226', izgara: '#2E3560', parlama: false, kabartma: false,
        palet: {
          '2':    ['#171A2E', '#6E76A8'],
          '4':    ['#1C2038', '#7A82B4'],
          '8':    ['#212643', '#868FC0'],
          '16':   ['#272D4E', '#929CCC'],
          '32':   ['#2E345A', '#9EA9D8'],
          '64':   ['#353C66', '#AAB6E4'],
          '128':  ['#3D4573', '#B7C3F0'],
          '256':  ['#464F81', '#C5D1FB'],
          '512':  ['#505A90', '#D4DEFF'],
          '1024': ['#5C68A2', '#E4EBFF'],
          '2048': ['#A0AEEE', '#0E1226'],
          'wild': ['#E0C878', '#2E2608'],
          'kilit':['#26283A', '#7E86A0'],
          'duvar':['#14162A', '#363A56']
        }
      }
    },
    {
      id: 'tempo.blok.murekkep', ad: 'Mürekkep', aile: 'murekkep',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        renkler: ['#5E68C4', '#8A5EC4', '#3E7EC4', '#E0DCEE', '#2C3470', '#A0A8F0', '#6E4E9E'],
        kenar: '#161A34', koseYaricap: '30%', doku: null, parlama: false, icDetay: null
      }
    },

    // #############################################################
    // TEMA 7 — KIRAZ  (nadir)
    // Koyu visne ve solgun gul. Seritli desen, yuvarlak formlar.
    // #############################################################
    {
      id: 'genel.arkaplan.kiraz', ad: 'Kiraz', aile: 'kiraz',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        css: 'radial-gradient(62% 38% at 20% 12%, rgba(168,50,78,.36) 0%, rgba(168,50,78,0) 66%),' +
             'radial-gradient(54% 34% at 82% 82%, rgba(84,16,38,.56) 0%, rgba(84,16,38,0) 70%),' +
             'linear-gradient(174deg, #150A10 0%, #24101A 58%, #120809 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.kiraz', ad: 'Kiraz', aile: 'kiraz',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        govde: { tip: 'seritli', renkler: ['#A8324E', '#7E203A', '#C45E76', '#5E1428'],
                 kontur: '#3A0C1C', parlak: false },
        // hedef: meyvenin sapi ve yapragi — govdeyi saran yesil kontur
        hedef: { tip: 'seritli', renkler: ['#8A3A48'], kontur: '#46C976',
                 vurgu: '#46C976', vurguTip: 'kontur', parlak: false }
      }
    },
    {
      id: 'h2048.karo.kiraz', ad: 'Kiraz', aile: 'kiraz',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        zemin: '#180C12', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#24101A', '#A85E74'],
          '4':    ['#2C1420', '#B46A80'],
          '8':    ['#351826', '#C0768C'],
          '16':   ['#3F1C2C', '#CC8298'],
          '32':   ['#4A2032', '#D88EA4'],
          '64':   ['#562539', '#E49AB0'],
          '128':  ['#632A40', '#F0A6BC'],
          '256':  ['#713048', '#FBB4C8'],
          '512':  ['#813651', '#FFC4D4'],
          '1024': ['#963E5D', '#FFD6E1'],
          '2048': ['#E2748F', '#2A0C16'],
          'wild': ['#E8C46A', '#3A2A08'],
          'kilit':['#2E2A2C', '#8C8286'],
          'duvar':['#1C1418', '#45383C']
        }
      }
    },
    {
      id: 'tempo.blok.kiraz', ad: 'Kiraz', aile: 'kiraz',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        renkler: ['#C4425E', '#8E2440', '#E07E96', '#F0DCD2', '#A85E6E', '#6E1830', '#7E9E68'],
        kenar: null, koseYaricap: '42%', doku: null, parlama: true, icDetay: null
      }
    },

    // #############################################################
    // TEMA 8 — LAVANTA  (nadir)
    // Kurutulmus cicek. Yumusak mor, gri leylak, krem. Benekli.
    // #############################################################
    {
      id: 'genel.arkaplan.lavanta', ad: 'Lavanta', aile: 'lavanta',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        css: 'radial-gradient(64% 40% at 26% 10%, rgba(154,138,196,.32) 0%, rgba(154,138,196,0) 68%),' +
             'radial-gradient(56% 36% at 78% 84%, rgba(86,70,124,.44) 0%, rgba(86,70,124,0) 70%),' +
             'linear-gradient(178deg, #100D1A 0%, #1D1830 56%, #0E0B16 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.lavanta', ad: 'Lavanta', aile: 'lavanta',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        govde: { tip: 'benekli', renkler: ['#9A8AC4', '#7E6EA8', '#B6A8D8', '#645690'],
                 kontur: '#3A3054', parlak: false },
        // hedef: kurumamis tek dal — govde boyunca yesil sap damari
        hedef: { tip: 'benekli', renkler: ['#8A8CA8'], kontur: '#3A5442',
                 vurgu: '#4FD08C', vurguTip: 'damar', parlak: false }
      }
    },
    {
      id: 'h2048.karo.lavanta', ad: 'Lavanta', aile: 'lavanta',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        zemin: '#141020', izgara: null, parlama: false, kabartma: false,
        palet: {
          '2':    ['#1E1A2A', '#8A7EA8'],
          '4':    ['#251F33', '#968AB4'],
          '8':    ['#2C253C', '#A296C0'],
          '16':   ['#342C46', '#AEA2CC'],
          '32':   ['#3C3350', '#BAAED8'],
          '64':   ['#453B5B', '#C6BAE4'],
          '128':  ['#4F4467', '#D2C6F0'],
          '256':  ['#5A4E74', '#DED4FB'],
          '512':  ['#665982', '#E9E1FF'],
          '1024': ['#746692', '#F3EEFF'],
          '2048': ['#C2B4E4', '#1E1830'],
          'wild': ['#E8C46A', '#3A2A08'],
          'kilit':['#2A2732', '#857E92'],
          'duvar':['#191623', '#3C3648']
        }
      }
    },
    {
      id: 'tempo.blok.lavanta', ad: 'Lavanta', aile: 'lavanta',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        renkler: ['#9A8AC4', '#6E5E9E', '#C4B4E0', '#8AA090', '#E0D8EC', '#5A4E7E', '#B48AA8'],
        kenar: null, koseYaricap: '24%', doku: null, parlama: false, icDetay: null
      }
    },
    // #############################################################
    // TEMA 10 — AMBER  (nadir)
    // Bal kehribari, icinde hava kabarciklari. Saydam ve isikli.
    // #############################################################
    {
      id: 'genel.arkaplan.amber', ad: 'Amber', aile: 'amber',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        css: 'radial-gradient(66% 40% at 28% 12%, rgba(224,160,56,.32) 0%, rgba(224,160,56,0) 68%),' +
             'radial-gradient(54% 34% at 78% 84%, rgba(120,72,16,.50) 0%, rgba(120,72,16,0) 70%),' +
             'linear-gradient(174deg, #130E05 0%, #241A0C 58%, #100C06 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null
      }
    },
    {
      id: 'kacis.deri.amber', ad: 'Amber', aile: 'amber',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        govde: { tip: 'kristal', renkler: ['#E0A038', '#C8801E', '#F0C468', '#A66412'],
                 kontur: '#5E3A08', parlak: true },
        // hedef: kehribarin icinde donmus yesil yaprak — kesintili damar
        hedef: { tip: 'kristal', renkler: ['#C89A3E'], kontur: '#3E5A20',
                 vurgu: '#5ED96E', vurguTip: 'damar', parlak: true }
      }
    },
    {
      id: 'h2048.karo.amber', ad: 'Amber', aile: 'amber',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        zemin: '#161006', izgara: null, parlama: true, kabartma: false,
        palet: {
          '2':    ['#241A0C', '#A8853E'],
          '4':    ['#2C2010', '#B48F46'],
          '8':    ['#352714', '#C0994E'],
          '16':   ['#3F2E18', '#CCA356'],
          '32':   ['#4A361C', '#D8AD5E'],
          '64':   ['#563E20', '#E4B766'],
          '128':  ['#644725', '#F0C16E'],
          '256':  ['#74512A', '#FBCB78'],
          '512':  ['#865C2F', '#FFD684'],
          '1024': ['#9A6934', '#FFE29A'],
          '2048': ['#F0BE52', '#2A1A02'],
          'wild': ['#FFF0C0', '#4A3608'],
          'kilit':['#322D26', '#8C8478'],
          'duvar':['#1E180E', '#453C2C']
        }
      }
    },
    {
      id: 'tempo.blok.amber', ad: 'Amber', aile: 'amber',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        renkler: ['#E0A038', '#C8801E', '#F0C468', '#A66412', '#E8DCB0', '#8A6A3E', '#D96E2E'],
        kenar: '#5E3A08', koseYaricap: '20%', doku: null, parlama: true, icDetay: null
      }
    },
  // =================================================================
// marketKatalog.js'e EKLENECEK BLOKLAR
//
// 1) Mevcut "TEMA 9 — CINI (nadir)" blogunun BESI birden silinecek
//    (genel.arkaplan.cini, kacis.deri.cini, susirala.sise.cini,
//     h2048.karo.cini, tempo.blok.cini) — asagida ender surumu var.
// 2) Bu dosyanin icerigi URUNLER dizisinin SONUNA, kapatan  ];  satirindan
//    hemen once yapistirilacak.
//
// Nadirlik dagilimi bu ekten sonra:
//   siradan 5 (Toprak, Kumsal, Buz, Pas, Duman)
//   nadir   5 (Murekkep, Kiraz, Lavanta, Amber, Sedef)
//   ender   3 (Cini, Vitray, Disli)
//   efsanevi 0 — sirada 2 tema var
//
// Ender setler 4 parcali (arka plan + kacis + 2048 + tempo).
// Cini'nin sisesi zaten yazilmisti, silinmedi; ender'e terfi etti.
// =================================================================

    // #############################################################
    // TEMA 9 — CINI  (ender)  *nadir'den terfi etti, motifli*
    // Iznik. Krem beyaz zemin, kobalt ve turkuaz, mercan kirmizi vurgu.
    // Motif: kucuk lale modulleri. Hedef yilan yesil firca borduru.
    // #############################################################
    {
      id: 'genel.arkaplan.cini', ad: 'Çini', aile: 'cini',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        css: 'radial-gradient(60% 42% at 20% 14%, rgba(58,121,198,.55) 0%, rgba(58,121,198,0) 70%),' +
             'radial-gradient(56% 40% at 82% 84%, rgba(46,158,158,.42) 0%, rgba(46,158,158,0) 72%),' +
             'linear-gradient(172deg, #0E2547 0%, #143363 55%, #0B1C38 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null,
        motif: { tip: 'cini', renk: '#DCE9FF', opaklik: .16, boy: '78px', yerlesim: 'doseme' }
      }
    },
    {
      id: 'kacis.deri.cini', ad: 'Çini', aile: 'cini',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        govde: { tip: 'seritli', renkler: ['#2E5FA8', '#3F79C6', '#2E9E9E', '#25518E'],
                 kontur: '#F4EEDF', parlak: false },
        // hedef: beyaz cini uzerine yesil firca borduru
        hedef: { tip: 'seritli', renkler: ['#EDE6D2'], kontur: '#2E5FA8',
                 vurgu: '#2E9E63', vurguTip: 'cizgi', parlak: false }
      }
    },
    {
      id: 'h2048.karo.cini', ad: 'Çini', aile: 'cini',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        zemin: '#E2D7BC', izgara: null, parlama: false, kabartma: false,
        motif: { tip: 'cini', renk: '#173B6E', opaklik: .26, boy: '80%', yerlesim: 'merkez' },
        palet: {
          '2':    ['#EDE6D2', '#6E6247'],
          '4':    ['#E3DCC4', '#5F5540'],
          '8':    ['#CFE0E4', '#2C5A63'],
          '16':   ['#B4D2DC', '#1E4C57'],
          '32':   ['#8FC3CE', '#12414B'],
          '64':   ['#63A9C4', '#06303C'],
          '128':  ['#4A8ECB', '#EAF3FF'],
          '256':  ['#3A76BE', '#EAF3FF'],
          '512':  ['#2E5FA8', '#F2F7FF'],
          '1024': ['#24488A', '#F2F7FF'],
          '2048': ['#C7453A', '#FFF0E6'],
          'wild': ['#E0A83C', '#3A2405'],
          'kilit':['#C9C2AE', '#6E6853'],
          'duvar':['#A79E86', '#4A4436']
        }
      }
    },
    {
      id: 'tempo.blok.cini', ad: 'Çini', aile: 'cini',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        renkler: ['#2E5FA8', '#2E9E9E', '#C7453A', '#F2EADA', '#5C97D8', '#2E9E63', '#E0A83C'],
        kenar: '#F4EEDF', koseYaricap: '20%', doku: null, parlama: true, icDetay: null,
        motif: { tip: 'cini', renk: '#173B6E', opaklik: .30, boy: '84%', yerlesim: 'merkez' }
      }
    },

    // #############################################################
    // TEMA 11 — VITRAY  (ender)
    // Kursun konturlu renkli cam, arkadan gelen isik. Her sey doygun,
    // aralar simsiyah. Motif: kursun bolme agi.
    // Hedef yilan: yesil cam panel — kontur olarak parlar.
    // #############################################################
    {
      id: 'genel.arkaplan.vitray', ad: 'Vitray', aile: 'vitray',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        css: 'radial-gradient(50% 38% at 20% 18%, rgba(196,58,74,.34) 0%, rgba(196,58,74,0) 68%),' +
             'radial-gradient(48% 36% at 80% 26%, rgba(58,110,196,.34) 0%, rgba(58,110,196,0) 70%),' +
             'radial-gradient(55% 40% at 55% 88%, rgba(126,58,180,.32) 0%, rgba(126,58,180,0) 72%),' +
             'linear-gradient(172deg, #0D0F16 0%, #151824 58%, #0B0D14 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null,
        motif: { tip: 'bolme', renk: '#8C93A8', opaklik: .16, boy: '48px', yerlesim: 'doseme' }
      }
    },
    {
      id: 'kacis.deri.vitray', ad: 'Vitray', aile: 'vitray',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        govde: { tip: 'kristal', renkler: ['#C43A4A', '#3A6EC4', '#7E3AB4', '#D8A32E'],
                 kontur: '#0E1018', parlak: true },
        // hedef: yesil cam panel, kursun konturun yerini yesil aliyor
        hedef: { tip: 'kristal', renkler: ['#1E6B4A'], kontur: '#0E1018',
                 vurgu: '#37C46B', vurguTip: 'kontur', parlak: true }
      }
    },
    {
      id: 'h2048.karo.vitray', ad: 'Vitray', aile: 'vitray',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        zemin: '#0E1018', izgara: null, parlama: true, kabartma: false,
        motif: { tip: 'bolme', renk: '#08090E', opaklik: .30, boy: '50%', yerlesim: 'doseme' },
        palet: {
          '2':    ['#1C2233', '#8FA3C8'],
          '4':    ['#23304A', '#9FB6DC'],
          '8':    ['#2A4370', '#B4CBF2'],
          '16':   ['#2F5AA0', '#CBE0FF'],
          '32':   ['#3A6EC4', '#E2EEFF'],
          '64':   ['#6A3FA8', '#EDE0FF'],
          '128':  ['#8B3FA8', '#F6E2FF'],
          '256':  ['#B03A72', '#FFE2F0'],
          '512':  ['#C43A4A', '#FFE4E0'],
          '1024': ['#D8632E', '#FFEDDF'],
          '2048': ['#E8C24A', '#2A1E04'],
          'wild': ['#F0D97A', '#332504'],
          'kilit':['#2A2E3A', '#7C8496'],
          'duvar':['#171A22', '#3E4454']
        }
      }
    },
    {
      id: 'tempo.blok.vitray', ad: 'Vitray', aile: 'vitray',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        renkler: ['#C43A4A', '#3A6EC4', '#7E3AB4', '#E8C24A', '#2FA98A', '#D8632E', '#B03A72'],
        kenar: '#0E1018', koseYaricap: '14%', doku: null, parlama: true, icDetay: null,
        motif: null
      }
    },

    // #############################################################
    // TEMA 12 — DISLI  (ender)
    // Pirinc mekanizma, yagli koyu metal. Sicak sari metal kademeleri.
    // Motif: disli carklar. Hedef yilan: fosforlu gosterge yesili.
    // #############################################################
    {
      id: 'genel.arkaplan.disli', ad: 'Dişli', aile: 'disli',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        css: 'radial-gradient(60% 42% at 22% 14%, rgba(198,148,60,.26) 0%, rgba(198,148,60,0) 70%),' +
             'radial-gradient(58% 40% at 84% 86%, rgba(180,100,42,.24) 0%, rgba(180,100,42,0) 72%),' +
             'linear-gradient(175deg, #16120C 0%, #211A11 58%, #100D09 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: null,
        motif: { tip: 'disli', renk: '#C6943C', opaklik: .12, boy: '56px', yerlesim: 'doseme' }
      }
    },
    {
      id: 'kacis.deri.disli', ad: 'Dişli', aile: 'disli',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        // koyu yagli celik govde, uzerinde parlak pirinc seritler
        govde: { tip: 'seritli', renkler: ['#33333B', '#E8BC5E', '#43434D', '#C6943C'],
                 kontur: '#0D0B07', parlak: true },
        // hedef: neredeyse siyah makine parcasi, fosforlu gosterge damari
        hedef: { tip: 'seritli', renkler: ['#1C2620'], kontur: '#0B1206',
                 vurgu: '#6BE45E', vurguTip: 'damar', parlak: true }
      }
    },
    {
      id: 'h2048.karo.disli', ad: 'Dişli', aile: 'disli',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        zemin: '#14110B', izgara: null, parlama: true, kabartma: false,
        motif: { tip: 'disli', renk: '#FFE3AC', opaklik: .18, boy: '58%', yerlesim: 'merkez' },
        palet: {
          '2':    ['#1E2228', '#8E99A6'],
          '4':    ['#252B33', '#9CA8B6'],
          '8':    ['#2E333A', '#AEB8C4'],
          '16':   ['#3C3830', '#C6B792'],
          '32':   ['#523E20', '#DEBE82'],
          '64':   ['#634A24', '#EDCB8E'],
          '128':  ['#765829', '#F7D89C'],
          '256':  ['#8B672E', '#FFE3AC'],
          '512':  ['#A87828', '#FFEDC2'],
          '1024': ['#C6943C', '#332406'],
          '2048': ['#E8C86A', '#2E2004'],
          'wild': ['#F2DC9A', '#3A2C06'],
          'kilit':['#2E2B24', '#8A8271'],
          'duvar':['#1C1811', '#453C2A']
        }
      }
    },
    {
      id: 'tempo.blok.disli', ad: 'Dişli', aile: 'disli',
      nadirlik: 'ender', fiyat: 2000,
      veri: {
        renkler: ['#C6943C', '#B4642A', '#8E9AA6', '#D8B060', '#7E5A2A', '#5E7E6A', '#E0C888'],
        kenar: '#2A1E0C', koseYaricap: '16%', doku: 'devre', parlama: true, icDetay: null,
        motif: { tip: 'disli', renk: '#20180A', opaklik: .20, boy: '58%', yerlesim: 'merkez' }
      }
    },

    // #############################################################
    // TEMA 13 — SEDEF  (nadir)  *Cini'nin bosalttigi nadir slotu*
    // Inci ici. Acik, sicak beyaz-pembe, yanardoner mavi ve lila.
    // Katalogdaki tek acik nadir tema. Motif: ic ice yaylar.
    // #############################################################
    {
      id: 'genel.arkaplan.sedef', ad: 'Sedef', aile: 'sedef',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        css: 'radial-gradient(60% 44% at 24% 14%, rgba(240,166,196,.42) 0%, rgba(240,166,196,0) 70%),' +
             'radial-gradient(58% 42% at 82% 84%, rgba(160,196,236,.42) 0%, rgba(160,196,236,0) 72%),' +
             'linear-gradient(168deg, #E8DCE4 0%, #DDD0DE 55%, #CFC0D4 75%)',
        koyuluk: 'acik', dekorGizle: false, animasyon: null,
        motif: { tip: 'yay', renk: '#C9A6C8', opaklik: .18, boy: '60px', yerlesim: 'doseme' }
      }
    },
    {
      id: 'kacis.deri.sedef', ad: 'Sedef', aile: 'sedef',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        govde: { tip: 'kristal', renkler: ['#F0E3EA', '#E6D8E8', '#DCE7F2', '#F2E6D8'],
                 kontur: '#C3A9BE', parlak: true },
        // hedef: inci icindeki yesil su — ince yesil cizgi
        hedef: { tip: 'kristal', renkler: ['#DDEEE2'], kontur: '#7FB99A',
                 vurgu: '#4FBE86', vurguTip: 'cizgi', parlak: true }
      }
    },
    {
      id: 'h2048.karo.sedef', ad: 'Sedef', aile: 'sedef',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        zemin: '#CBB9CE', izgara: null, parlama: true, kabartma: false,
        motif: { tip: 'yay', renk: '#FFFFFF', opaklik: .34, boy: '70%', yerlesim: 'merkez' },
        palet: {
          '2':    ['#F3D9EA', '#6B4E70'],
          '4':    ['#ECC7E4', '#5D4064'],
          '8':    ['#E2B2DE', '#4E3258'],
          '16':   ['#D59CDA', '#3F254C'],
          '32':   ['#C687D2', '#331D42'],
          '64':   ['#B473C8', '#281639'],
          '128':  ['#A15FBE', '#1E1030'],
          '256':  ['#8D4EB0', '#160B28'],
          '512':  ['#7A3FA0', '#F6ECFF'],
          '1024': ['#672F8E', '#FAF2FF'],
          '2048': ['#4F2076', '#FFF7FF'],
          'wild': ['#E8C46A', '#3A2A08'],
          'kilit':['#C9BBCB', '#5A4F60'],
          'duvar':['#AE9DB2', '#3E3444']
        }
      }
    },
    {
      id: 'tempo.blok.sedef', ad: 'Sedef', aile: 'sedef',
      nadirlik: 'nadir', fiyat: 900,
      veri: {
        renkler: ['#E88BB2', '#8FBBE8', '#EAC96E', '#B98FE0', '#7FD1AE', '#E8A06E', '#9CA6D6'],
        kenar: '#7A6680', koseYaricap: '24%', doku: null, parlama: true, icDetay: null,
        motif: { tip: 'yay', renk: '#FFFFFF', opaklik: .38, boy: '70%', yerlesim: 'merkez' }
      }
    },
  // =================================================================
// marketKatalog.js'e EKLENECEK — EFSANEVI PARTI (2 tema, 4'er parca)
//
// URUNLER dizisinin SONUNA, kapatan  ];  satirindan hemen once yapistir.
// Ustundeki son urunun  }  isaretinin sagina VIRGUL koymayi unutma.
//
// Bu ekten sonra tema dagilimi tamamlaniyor:
//   siradan 5, nadir 5, ender 3, efsanevi 2  = 15 tema
// =================================================================

    // #############################################################
    // TEMA 14 — BULUTSU  (efsanevi)  — CANLI ISIK
    // Derin uzay: mor ve turkuaz nebula, icten disa parlayan karolar.
    // Karolar ve bloklar nabiz gibi parliyor, arka plan yavasca akiyor.
    // Hedef yilan: nebulanin icindeki yesil isik damari.
    // #############################################################
    {
      id: 'genel.arkaplan.bulutsu', ad: 'Bulutsu', aile: 'bulutsu',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        css: 'radial-gradient(55% 40% at 22% 20%, rgba(126,58,196,.50) 0%, rgba(126,58,196,0) 70%),' +
             'radial-gradient(52% 38% at 78% 30%, rgba(46,158,220,.45) 0%, rgba(46,158,220,0) 72%),' +
             'radial-gradient(60% 44% at 50% 88%, rgba(47,224,180,.34) 0%, rgba(47,224,180,0) 74%),' +
             'linear-gradient(170deg, #080A18 0%, #10132A 55%, #07091A 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: 'aurora', parcacik: 'toz',
        motif: { tip: 'yildiz', renk: '#CFE6FF', opaklik: .22, boy: '64px', yerlesim: 'doseme' }
      }
    },
    {
            id: 'kacis.deri.bulutsu', ad: 'Bulutsu', aile: 'bulutsu',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        animasyon: 'aurora',
        govde: { tip: 'kristal', renkler: ['#7E3AC4', '#3A8ED8', '#B45AE0', '#2E6ED8'],
                 kontur: '#0A0C1A', parlak: true },
        // hedef: nebulanin icinden gecen yesil isik damari
        hedef: { tip: 'kristal', renkler: ['#12563E'], kontur: '#07120E',
                 vurgu: '#3DF58C', vurguTip: 'cizgi', parlak: true }
      }
    },
    {
      id: 'h2048.karo.bulutsu', ad: 'Bulutsu', aile: 'bulutsu',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
                zemin: '#0A0C1A', izgara: null, parlama: true, kabartma: false, animasyon: 'aurora',
        motif: { tip: 'yildiz', renk: '#CFE6FF', opaklik: .16, boy: '70%', yerlesim: 'merkez' },
        palet: {
          '2':    ['#171A33', '#9AA8D8'],
          '4':    ['#1E2244', '#AAB6E8'],
          '8':    ['#262C58', '#BCC6F6'],
          '16':   ['#2E3670', '#CCD4FF'],
          '32':   ['#3A3A96', '#DCDCFF'],
          '64':   ['#4A34A8', '#E4D6FF'],
          '128':  ['#6A3AC0', '#F0E2FF'],
          '256':  ['#8B3AD0', '#F8E6FF'],
          '512':  ['#A840C8', '#FFE8FA'],
          '1024': ['#2E9ED8', '#EAF8FF'],
          '2048': ['#3DF58C', '#04240F'],
          'wild': ['#FFD98A', '#2A1E04'],
          'kilit':['#232840', '#7E88AE'],
          'duvar':['#12162A', '#3A4468']
        }
      }
    },
    {
      id: 'tempo.blok.bulutsu', ad: 'Bulutsu', aile: 'bulutsu',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        renkler: ['#7E3AC4', '#3A8ED8', '#3DF58C', '#B45AE0', '#2E6ED8', '#F0C25C', '#E05AB4'],
        kenar: '#0A0C1A', koseYaricap: '22%', doku: null, parlama: true, icDetay: null,
        animasyon: 'aurora',
        motif: { tip: 'yildiz', renk: '#FFFFFF', opaklik: .26, boy: '70%', yerlesim: 'merkez' }
      }
    },

 // =================================================================
// LAV TEMASI — ESKI HALINE DONUS
//
// Bir onceki mesajda verdigim "canli palet" surumunu geri aliyor.
// Renkler, palet, deri, bloklar: HEPSI eski degerlerinde.
//
// TEK FARK: genel.arkaplan.lav icindeki motif artik tek renk degil.
// `renk` yerine `renkler` dizisi var — desen sariden turuncuya,
// oradan kizila gecen bir alev gradyaniyla boyaniyor.
//
// KULLANIM: marketKatalog.js'te Ctrl+F ile  TEMA 15 — LAV  ara,
// o yorum basligindan tempo.blok.lav'in kapanisina kadar sil,
// bunu oraya yapistir.
// =================================================================

    // #############################################################
    // TEMA 15 — LAV  (efsanevi)  — HAREKETLI MADDE
    // Bazalt kabuk, altindan akan akkor. Blok ve karolarin uzerinden
    // yavasca gecen bir akinti var; catlak motifi kabugu boluyor.
    // Hedef yilan: sogumus lavda yesil alev.
    // #############################################################
    {
      id: 'genel.arkaplan.lav', ad: 'Lav', aile: 'lav',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        css: 'radial-gradient(58% 42% at 20% 82%, rgba(230,90,20,.45) 0%, rgba(230,90,20,0) 70%),' +
             'radial-gradient(50% 36% at 76% 22%, rgba(180,40,30,.42) 0%, rgba(180,40,30,0) 72%),' +
             'linear-gradient(172deg, #140A06 0%, #241009 55%, #0D0604 100%)',
        koyuluk: 'koyu', dekorGizle: false, animasyon: 'lav', parcacik: 'kul',
        // renkler[] verilince desen duz renk yerine gradyanla boyanir
        motif: { tip: 'catlak', renkler: ['#FFE86A', '#FF9A2E', '#E23A0A'],
                 opaklik: .30, boy: '70px', yerlesim: 'doseme' }
      }
    },
    {
      id: 'kacis.deri.lav', ad: 'Lav', aile: 'lav',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        animasyon: 'lav',
        govde: { tip: 'seritli', renkler: ['#2A1C16', '#E8622A', '#3A2620', '#FF8A3C'],
                 kontur: '#0A0503', parlak: true },
        // hedef: sogumus lavda yesil alev — kontur olarak yaniyor
        hedef: { tip: 'seritli', renkler: ['#123A22'], kontur: '#06140C',
                 vurgu: '#4FE07A', vurguTip: 'kontur', parlak: true }
      }
    },
    {
      id: 'h2048.karo.lav', ad: 'Lav', aile: 'lav',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        zemin: '#140A06', izgara: null, parlama: true, kabartma: false, animasyon: 'lav',
        motif: { tip: 'catlak', renk: '#FFB066', opaklik: .18, boy: '80%', yerlesim: 'merkez' },
        palet: {
          '2':    ['#241611', '#B08A72'],
          '4':    ['#2E1B13', '#C29578'],
          '8':    ['#3A2016', '#D6A07E'],
          '16':   ['#4C2616', '#EDA878'],
          '32':   ['#642C14', '#FFB584'],
          '64':   ['#7E3312', '#FFC190'],
          '128':  ['#9A3B10', '#FFCE9E'],
          '256':  ['#B8460D', '#FFDCAE'],
          '512':  ['#D4560A', '#FFE8C2'],
          '1024': ['#EE6A0A', '#3A1602'],
          '2048': ['#FFA426', '#3A1602'],
          'wild': ['#FFD98A', '#3A2404'],
          'kilit':['#2A231F', '#8A7A6E'],
          'duvar':['#180F0A', '#4A3A30']
        }
      }
    },
             {
      id: 'tempo.blok.lav', ad: 'Lav', aile: 'lav',
      nadirlik: 'efsanevi', fiyat: 4000,
      veri: {
        renkler: ['#E8622A', '#FF8A3C', '#B8300E', '#FFA426', '#7E3312', '#FFD07A', '#D4460A'],
        kenar: '#0A0503', koseYaricap: '14%', doku: null, parlama: true, icDetay: null,
        animasyon: 'lav',
        motif: { tip: 'catlak', renk: '#2A0E04', opaklik: .26, boy: '86%', yerlesim: 'merkez' }
      }
    },

    // #############################################################
    // SIRALA DUR SISELERI — 15 tema (5 siradan, 5 nadir, 3 ender, 2 efsanevi)
    // #############################################################
    { id: 'susirala.sise.toprak', ad: 'Toprak', aile: 'toprak', nadirlik: 'siradan', fiyat: 400,
      veri: { govde: 'duz', kapakZorluk: 'basit', kapakSekil: 'mantar', kapakRenk: '#8B5A2B' } },
    { id: 'susirala.sise.kumsal', ad: 'Kumsal', aile: 'kumsal', nadirlik: 'siradan', fiyat: 400,
      veri: { govde: 'hafif-omuz', kapakZorluk: 'basit', kapakSekil: 'duz-vida', kapakRenk: '#2FA9A0' } },
    { id: 'susirala.sise.buz', ad: 'Buz', aile: 'buz', nadirlik: 'siradan', fiyat: 400,
      veri: { govde: 'duz', kapakZorluk: 'basit', kapakSekil: 'duz', kapakRenk: '#3E7EC4' } },
    { id: 'susirala.sise.pas', ad: 'Pas', aile: 'pas', nadirlik: 'siradan', fiyat: 400,
      veri: { govde: 'hafif-omuz', kapakZorluk: 'basit', kapakSekil: 'duz-vida', kapakRenk: '#8E4526' } },
    { id: 'susirala.sise.duman', ad: 'Duman', aile: 'duman', nadirlik: 'siradan', fiyat: 400,
      veri: { govde: 'duz', kapakZorluk: 'basit', kapakSekil: 'duz', kapakRenk: '#6E6E80' } },

    { id: 'susirala.sise.murekkep', ad: 'Mürekkep', aile: 'murekkep', nadirlik: 'nadir', fiyat: 900,
      veri: { govde: 'omuzlu', kapakZorluk: 'orta', kapakSekil: 'muhur', kapakRenk: '#4A4A8C' } },
    { id: 'susirala.sise.kiraz', ad: 'Kiraz', aile: 'kiraz', nadirlik: 'nadir', fiyat: 900,
      veri: { govde: 'bombeli', kapakZorluk: 'orta', kapakSekil: 'kiraz', kapakRenk: '#A8324E' } },
    { id: 'susirala.sise.lavanta', ad: 'Lavanta', aile: 'lavanta', nadirlik: 'nadir', fiyat: 900,
      veri: { govde: 'omuzlu', kapakZorluk: 'orta', kapakSekil: 'fiyonk', kapakRenk: '#7E6EA8' } },
    { id: 'susirala.sise.amber', ad: 'Amber', aile: 'amber', nadirlik: 'nadir', fiyat: 900,
      veri: { govde: 'bombeli', kapakZorluk: 'orta', kapakSekil: 'petek', kapakRenk: '#C8801E' } },
    { id: 'susirala.sise.sedef', ad: 'Sedef', aile: 'sedef', nadirlik: 'nadir', fiyat: 900,
      veri: { govde: 'omuzlu', kapakZorluk: 'orta', kapakSekil: 'inci', kapakRenk: '#E091B0',
        motif: { tip: 'yay', renk: '#FFFFFF', opaklik: .30, boy: '60%', yerlesim: 'merkez' } } },

    { id: 'susirala.sise.cini', ad: 'Çini', aile: 'cini', nadirlik: 'ender', fiyat: 2000,
      veri: { govde: 'kadeh', kapakZorluk: 'detayli', kapakSekil: 'lale', kapakRenk: '#2E5FA8',
        motif: { tip: 'cini', renk: '#173B6E', opaklik: .22, boy: '70%', yerlesim: 'merkez' } } },
    { id: 'susirala.sise.vitray', ad: 'Vitray', aile: 'vitray', nadirlik: 'ender', fiyat: 2000,
      veri: { govde: 'kum-saati', kapakZorluk: 'detayli', kapakSekil: 'kristal', kapakRenk: '#C43A4A',
        motif: { tip: 'bolme', renk: '#0E1018', opaklik: .22, boy: '46px', yerlesim: 'doseme' } } },
    { id: 'susirala.sise.disli', ad: 'Dişli', aile: 'disli', nadirlik: 'ender', fiyat: 2000,
      veri: { govde: 'bombeli', kapakZorluk: 'detayli', kapakSekil: 'disli', kapakRenk: '#C6943C',
        motif: { tip: 'disli', renk: '#FFE3AC', opaklik: .16, boy: '56%', yerlesim: 'merkez' } } },

    { id: 'susirala.sise.bulutsu', ad: 'Bulutsu', aile: 'bulutsu', nadirlik: 'efsanevi', fiyat: 4000,
      veri: { govde: 'kadeh-derin', kapakZorluk: 'detayli', kapakSekil: 'aycicek', kapakRenk: '#8B3AD0',
        animasyon: 'aurora',
        motif: { tip: 'yildiz', renk: '#CFE6FF', opaklik: .18, boy: '66%', yerlesim: 'merkez' } } },
    { id: 'susirala.sise.lav', ad: 'Lav', aile: 'lav', nadirlik: 'efsanevi', fiyat: 4000,
      veri: { govde: 'kum-saati-keskin', kapakZorluk: 'detayli', kapakSekil: 'alev', kapakRenk: '#E8622A',
        animasyon: 'lav',
        motif: { tip: 'catlak', renk: '#FFB066', opaklik: .16, boy: '78%', yerlesim: 'merkez' } } }
  ];

  return {
    NADIRLIK: NADIRLIK,
    SANDIKLAR: SANDIKLAR,
    KATEGORILER: KATEGORILER,
    URUNLER: URUNLER
  };
})();
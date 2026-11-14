/* Fiyat uyarıları için sabit örnek veri (öz-denetim: test/selftest.js ve Fiyatlar sayfası kontrolleri aynı veriyi kullanır).
   Bildirim saati 14.11.2026 08:06 (TR); veri 13.11 akşamı güncellenmiş. Her durum bir hammaddede:
   Mısır: Ukrayna FOB 12 hafta aynı (donmuş, ithal hesabına girmez); Arjantin FOB 224 → 219 $/t ile ithal (Mersin 13.850) yerli Konya 14.000'in altına indi.
   Arpa: Konya ~15.000 (kullanıcı sınırı alt 15.100 → uyarı); Polatlı 16,0–16,1'den 15,5'e: 3 ayın en düşüğü.
   Yemlik buğday: Gaziantep dökerli ve kırık ayrı seriler (en ucuz "Gaziantep kırık"). Ayçiçeği küspesi: 12 ↔ 16 zıplıyor (oynak, harekete girmez).
   DDGS: 100 günde 5 işlem, son işlem +%11 (az işlem, harekete girmez). Kepek: düzenli seri, son gün +%6 (olağan dışı hareket).
   %2 eşiği: soya fasulyesi Adana 28,05 → 28,64 (+%2,1) uyarır, çiğit 17,75 → 17,413 (−%1,9) uyarmaz.
   Çiğit ayrı satır; pamuk tohumu küspesinde borsa işlemi yok. sakin: aynı gün, hiçbir şey olmayan veri. */
function gun(n, adim, f0, son) { const a = []; let d = new Date(Date.parse(son + "T00:00:00Z") - (n - 1) * adim * 864e5); for (let i = 0; i < n; i++) { a.push([d.toISOString().slice(0, 10), f0(i, n)]); d = new Date(d.getTime() + adim * 864e5); } return a; }
const SON = "2026-11-13", KUR = 50;
function ornek() {
  const usd = (s) => s.map(([d, v]) => [d, v * KUR]);
  const sabit = (a, b) => (i) => (i % 2 ? a : b);
  const D = {
    guncel: "2026-11-13T22:30:00Z", kaynak: "test", not: "", usdtry: [["2026-01-01", KUR]],
    urunler: [
      { ad: "Mısır", sembol: "FAO", merkez: "Ukrayna FOB (FAO)", seri: usd(gun(12, 7, () => 200, SON)) },
      { ad: "Mısır", sembol: "FAO", merkez: "Arjantin FOB (FAO)", seri: usd(gun(12, 7, (i, n) => (i === n - 1 ? 219 : i % 2 ? 223 : 224), SON)) },
    ],
    yurtici: { urunler: [
      { ad: "Mısır", borsa: "Konya", seri: gun(100, 1, sabit(14.0, 14.05), SON) },
      { ad: "Arpa", borsa: "Konya", seri: gun(100, 1, sabit(15.0, 15.05), SON) },
      { ad: "Arpa", borsa: "Polatlı", seri: gun(100, 1, (i, n) => (i === n - 1 ? 15.5 : i % 2 ? 16.0 : 16.1), SON) },
      { ad: "Yemlik buğday", borsa: "Gaziantep", tur: "dökerli", seri: gun(100, 1, sabit(17.0, 17.1), SON) },
      { ad: "Yemlik buğday", borsa: "Gaziantep", tur: "kırık", seri: gun(50, 2, sabit(13.5, 13.6), SON) },
      { ad: "Ayçiçeği küspesi", borsa: "Gaziantep", seri: gun(30, 3, sabit(16, 12), SON) },
      { ad: "DDGS", borsa: "Gaziantep", seri: gun(5, 20, (i, n) => (i === n - 1 ? 18.4 : 16.5), SON) },
      { ad: "Pamuk tohumu küspesi", borsa: "Gaziantep", seri: [] },
      { ad: "Çiğit (pamuk tohumu)", borsa: "Adana", seri: gun(10, 1, (i, n) => (i === n - 1 ? 17.413 : 17.75), SON) },
      { ad: "Soya fasulyesi", borsa: "Adana", seri: gun(100, 1, (i, n) => (i === n - 1 ? 28.64 : i % 2 ? 28.0 : 28.05), SON) },
      { ad: "Buğday kepeği", borsa: "Gaziantep", seri: gun(100, 1, (i, n) => (i === n - 1 ? 14.9 : i % 2 ? 14.0 : 14.05), SON) },
    ] },
  };
  const uy = [{ urun: "Arpa", borsa: "en ucuz", alt: 15100, ust: null, not: "alım fırsatı" }, { urun: "Mısır", borsa: "ithal", alt: null, ust: 20000 }];
  const sakin = {
    guncel: D.guncel, kaynak: "test", not: "", usdtry: D.usdtry, urunler: [],
    yurtici: { urunler: [{ ad: "Mısır", borsa: "Konya", seri: gun(100, 1, sabit(14.0, 14.05), SON) }, { ad: "Arpa", borsa: "Polatlı", seri: gun(100, 1, sabit(15.0, 15.05), SON) }] },
  };
  return { D, uy, sakin, simdi: Date.parse("2026-11-14T05:06:00Z") };
}
module.exports = { ornek };

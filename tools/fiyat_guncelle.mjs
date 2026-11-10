// YemAkıl — piyasa fiyat panosu verisi (GitHub Actions'ta her iş günü çalışır).
// Chicago vadeli (CBOT) fiyatlarını Yahoo Finance'ten çeker, USD/TRY ile TL/ton'a çevirir,
// son ~6 ayın günlük serisini fiyatlar.json'a yazar. Bir ürün çekilemezse önceki verisi korunur.
import fs from "node:fs";
const OUT = process.env.FIYAT_OUT || process.argv[2] || "fiyatlar.json";
const URUNLER = [
  { ad: "Mısır", sembol: "ZC=F", carpan: 0.39368, birim: "sent/bushel → USD/ton (25,40 kg/bushel)" },
  { ad: "Buğday", sembol: "ZW=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Soya küspesi", sembol: "ZM=F", carpan: 1.10231131, birim: "USD/kısa ton → USD/ton" },
  { ad: "Soya yağı", sembol: "ZL=F", carpan: 22.0462262, birim: "sent/libre → USD/ton" },
];
async function seri(sembol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sembol)}?range=6mo&interval=1d`;
  let son;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (YemAkil fiyat panosu)" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const res = j.chart && j.chart.result && j.chart.result[0];
      const ts = res.timestamp || [], cl = (res.indicators.quote[0] || {}).close || [];
      const out = [];
      ts.forEach((t, k) => { const v = cl[k]; if (v != null && isFinite(v)) out.push([new Date(t * 1000).toISOString().slice(0, 10), v]); });
      if (out.length < 20) throw new Error("az veri: " + out.length);
      return out;
    } catch (e) { son = e; await new Promise((s) => setTimeout(s, 2000 * (i + 1))); }
  }
  throw son;
}
const eski = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return null; } })();
const kur = await seri("TRY=X");
const kurAt = (d) => { let v = null; for (const [t, x] of kur) { if (t <= d) v = x; else break; } return v ?? kur[0][1]; };
const sonuc = { guncel: new Date().toISOString(), kaynak: "CBOT vadeli fiyatları (Yahoo Finance) × USD/TRY", not: "Uluslararası referans fiyattır; Türkiye fiyatı değildir. Navlun, gümrük, vergi ve kalite farkı içermez; yönü ve değişim hızı için kullanın.", usdtry: kur.map(([d, v]) => [d, Math.round(v * 10000) / 10000]), urunler: [] };
let basarili = 0;
for (const u of URUNLER) {
  try {
    const s = await seri(u.sembol);
    sonuc.urunler.push({ ad: u.ad, sembol: u.sembol, birim: u.birim, seri: s.map(([d, v]) => [d, Math.round(v * u.carpan * kurAt(d))]) });
    basarili++;
  } catch (e) {
    const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === u.sembol);
    if (o) sonuc.urunler.push({ ...o, eski: true });
    console.error(u.ad, "çekilemedi:", e.message);
  }
}
if (!basarili) { console.error("Hiç ürün çekilemedi; dosya değiştirilmedi."); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(sonuc));
console.log(`fiyatlar.json yazıldı: ${basarili}/${URUNLER.length} ürün, USD/TRY ${kur.at(-1)[1].toFixed(2)} (${kur.at(-1)[0]})`);

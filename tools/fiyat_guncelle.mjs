// YemAkıl — piyasa fiyat panosu verisi (GitHub Actions'ta her iş günü çalışır).
// Chicago vadeli (CBOT) fiyatlarını Yahoo Finance'ten çeker, USD/TRY ile TL/ton'a çevirir,
// Yurt içi hammadde fiyatlarını Gaziantep ve Konya ticaret borsalarının günlük bültenlerinden ekler,
// son ~6 ayın günlük serisini fiyatlar.json'a yazar. Bir ürün çekilemezse önceki verisi korunur.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const OUT = process.env.FIYAT_OUT || process.argv[2] || "fiyatlar.json";
const URUNLER = [
  { ad: "Mısır", sembol: "ZC=F", carpan: 0.39368, birim: "sent/bushel → USD/ton (25,40 kg/bushel)" },
  { ad: "Buğday", sembol: "ZW=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Soya küspesi", sembol: "ZM=F", carpan: 1.10231131, birim: "USD/kısa ton → USD/ton" },
  { ad: "Soya yağı", sembol: "ZL=F", carpan: 22.0462262, birim: "sent/libre → USD/ton" },
  { ad: "Soya fasulyesi", sembol: "ZS=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Yulaf", sembol: "ZO=F", carpan: 0.68894, birim: "sent/bushel → USD/ton (14,52 kg/bushel)" },
];
// Yurt içi: Gaziantep Ticaret Borsası günlük bülteni (HTML) ve Konya Ticaret Borsası (JSON).
// Her gün için ürün satırlarının miktar ağırlıklı ortalaması (TL/kg); "İTHAL" satış şekli (gümrük beyanı) hariç.
// Fiyat geçmişi ne kadar saklanır (kullanıcı kararı 2026-11-13: 2 yıl; "geçen yıl bu zaman" karşılaştırması için). Pano yine en çok 3 ay gösterir.
const SAKLA_GUN = 740;
const UA = { "User-Agent": "Mozilla/5.0 (YemAkil fiyat panosu)" };
const KONYA = "https://www.ktb.org.tr/api/v1/Alpha.WebPanel/OnlineKullaniciBulten/GetGunlukBulten/";
const GAZIANTEP = "https://www.gtb.org.tr/gunluk-bulten?tarih=";
const POLATLI = "https://bulten.polatliborsa.org.tr/BultenGunluk.ashx?tarih=";
export const YURTICI = [
  { ad: "Mısır", borsa: "Gaziantep", re: /^MISIR$/ },
  { ad: "Mısır", borsa: "Konya", gruplar: ["Mısır"] },
  { ad: "Mısır", borsa: "Adana", satir: /^Mısır \(1\.Sınıf Serbest/, not: "1. sınıf, en düşük–en yüksek ortası" },
  { ad: "Mısır", borsa: "Polatlı", kod: /^114/ },
  { ad: "Arpa", borsa: "Gaziantep", re: /^ARPA$/ },
  { ad: "Arpa", borsa: "Konya", gruplar: ["Arpa"] },
  { ad: "Arpa", borsa: "Polatlı", kod: /^111/ },
  { ad: "Yemlik buğday", borsa: "Gaziantep", re: /^BUĞDAY ?\(DÖKERLİ\)$|^BUĞDAY KIRIK$/, not: "dökerli + kırık" },
  { ad: "Yemlik buğday", borsa: "Konya", gruplar: ["Diğer Kırmızı Buğday", "Diğer Beyaz Buğday"], not: "düşük vasıflı" },
  { ad: "Yemlik buğday", borsa: "Polatlı", isim: /DÜŞÜK VASIFLI|STANDART DIŞI BUĞDAY/, not: "düşük vasıflı + standart dışı" },
  { ad: "Soya fasulyesi", borsa: "Gaziantep", re: /^SOYA FASULYES/ },
  { ad: "Soya fasulyesi", borsa: "Adana", satir: /^Soya Fasulyesi/, not: "en düşük–en yüksek ortası" },
  { ad: "Soya küspesi", borsa: "Gaziantep", re: /^SOYA KÜSPES/ },
  { ad: "DDGS", borsa: "Gaziantep", re: /DDGS/ },
  { ad: "Mısır gluten yemi (feed)", borsa: "Gaziantep", re: /^MISIR GLUTENİ YEMİ$/ },
  { ad: "Mısır gluteni (meal)", borsa: "Gaziantep", re: /^MISIR GLUTENİ$/ },
  { ad: "Ayçiçeği küspesi", borsa: "Gaziantep", re: /^AYÇİÇE(K|Ğİ) KÜSPES/ },
  { ad: "Pamuk tohumu küspesi", borsa: "Gaziantep", re: /^(PAMUK( TOHUMU)?|ÇİĞİT) KÜSPES/ },
  { ad: "Pamuk tohumu küspesi", borsa: "Adana", satir: /^Çiğit/, not: "çiğit = pamuk tohumu, küspenin hammaddesi" },
  { ad: "Buğday kepeği", borsa: "Gaziantep", re: /^KEPEK \(BUĞDAY\)$/ },
];
const sayi = (x) => parseFloat(String(x ?? "").replace(/\./g, "").replace(",", "."));
const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
async function getir(url, json) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: json ? "application/json" : "text/html" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return json ? await r.json() : await r.text();
    } catch (e) { if (i === 2) throw e; await bekle(1500 * (i + 1)); }
  }
}
const metin = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// Gaziantep: [{ad, ort, miktar, sekil}] — bültenin kendi tarihi istenen gün değilse (henüz yayımlanmadı / tatil) boş döner.
export function gaziantepSatirlar(html, gun) {
  const m = metin(html).match(/(\d{2})\.(\d{2})\.(\d{4}) ?- ?Günlük Bülten/);
  if (!m || `${m[3]}-${m[2]}-${m[1]}` !== gun) return [];
  const out = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin);
    if (td.length < 8) continue;
    out.push({ ad: td[0].toLocaleUpperCase("tr-TR"), ort: sayi(td[3]), miktar: sayi(td[4]), birim: td[5], sekil: td[7].split(" ")[0] });
  }
  return out;
}
export function ortalama(satirlar) {
  let t = 0, m = 0;
  for (const x of satirlar) { if (!(x.ort > 0) || !(x.miktar > 0)) continue; t += x.ort * x.miktar; m += x.miktar; }
  return m > 0 ? Math.round((t / m) * 1000) / 1000 : null;
}
// Adana: günlük işlem fiyatları PDF'i (pdftotext -layout) → [{ad, ort}] ; "İşlem gerçekleşmemiştir" satırları atlanır.
export function adanaSatirlar(txt) {
  const out = [];
  for (const l of String(txt || "").split(/\r?\n/)) {
    const t = l.trim(), m = t.match(/^(\S.*?)\s{2,}(\d.*)$/);
    if (!m) continue;
    const v = (m[2].match(/\d{1,3},\d{3}/g) || []).map((x) => parseFloat(x.replace(",", ".")));
    if (v.length) out.push({ ad: m[1].trim(), ort: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000, miktar: 1 });
  }
  return out;
}
// Polatlı: BultenGunluk.ashx JSON {Bulten:[{UrunAdi, UrunKodu, OrtFiyat, Miktar, ...}]}; yalnız fiyatı olan alt satırlar.
export function polatliSatirlar(j) {
  return ((j && j.Bulten) || []).map((x) => ({ ad: String(x.UrunAdi || ""), kod: String(x.UrunKodu || ""), ort: sayi(x.OrtFiyat), miktar: sayi(x.Miktar) })).filter((x) => x.ort > 0 && x.miktar > 0);
}
export function urunFiyati(u, K) {
  const L = K && K[u.borsa];
  if (!L) return null;
  if (u.borsa === "Gaziantep") return ortalama(L.filter((x) => u.re.test(x.ad) && x.sekil !== "İTHAL" && (!x.birim || /KG/i.test(x.birim))));
  if (u.borsa === "Konya") return ortalama(L.filter((x) => u.gruplar.includes(x.GrupAdi)).map((x) => ({ ort: sayi(x.OrtFiyat), miktar: sayi(x.Miktar) })));
  if (u.borsa === "Polatlı") return ortalama(L.filter((x) => (u.kod ? u.kod.test(x.kod) : u.isim.test(x.ad))));
  if (u.borsa === "Adana") { const x = L.find((r) => u.satir.test(r.ad)); return x ? x.ort : null; }
  return null;
}
async function seri(sembol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sembol)}?range=2y&interval=1d`;
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
// Yurt dışı (ABD iç piyasa, haftalık): USDA AMS "National Grain and Oilseed Processor Feedstuff Report" (AMS_3511).
// Ürün başlığının altındaki bölge satırlarından "Average" sütunu; yalnız FOB satırları; $/kısa ton → $/ton.
export const USDA = [
  { ad: "DDGS", baslik: /^Corn Distillers Dried Grain/ },
  { ad: "Mısır gluten yemi (feed)", baslik: /^Corn Gluten Feed Pellets/ },
  { ad: "Mısır gluteni (meal)", baslik: /^Corn Gluten Meal/ },
  { ad: "Ayçiçeği küspesi", baslik: /^Sunflower Meal/ },
  { ad: "Pamuk tohumu küspesi", baslik: /^Cottonseed Meal/ },
  { ad: "Buğday kepeği", baslik: /^Wheat Middlings/, rapor: "3512" },
];
export function usdaOku(txt) {
  const tm = txt.match(/Report for \d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!tm) return null;
  const tarih = `${tm[3]}-${tm[1].padStart(2, "0")}-${tm[2].padStart(2, "0")}`, sonuc = {};
  let urun = null, kol = -1;
  for (const satir of txt.split(/\r?\n/)) {
    const t = satir.trim();
    if (!t || /National Grain and Oilseed|Market News|Dept\. of Ag|Email us|^Source:|General inquiries|https?:\/\/|^Page \d/.test(t)) continue;
    if (/^\s{25,}\S/.test(satir) && !/\d{2}\.\d{2}/.test(t)) { urun = USDA.find((u) => u.baslik.test(t)) || null; kol = -1; continue; }
    if (/^\s*Region\s+Sale Type/.test(satir)) { kol = satir.indexOf("Average"); continue; }
    if (!urun || kol < 0 || !/\bFOB/.test(satir)) continue;
    const parca = satir.slice(Math.max(0, kol - 4), kol + 9).trim(), v = parseFloat(parca.replace(/,/g, ""));
    if (!(v > 0)) continue;
    (sonuc[urun.ad] = sonuc[urun.ad] || []).push(v);
  }
  const out = {};
  for (const [ad, L] of Object.entries(sonuc)) out[ad] = Math.round((L.reduce((a, b) => a + b, 0) / L.length) * 1.10231131 * 100) / 100;
  return { tarih, fiyat: out };
}
export function cepeaTablo(html) {
  const t = (html.match(/<table[\s\S]*?<\/table>/) || [""])[0], out = [];
  for (const tr of t.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin);
    const m = td[0] && td[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m || td.length < 5) continue;
    const usd = sayi(td[4]);
    if (usd > 0) out.push([`${m[3]}-${m[2]}-${m[1]}`, Math.round((usd * 1000) / 60 * 100) / 100]);
  }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
export function matbaOku(txt) {
  const dm = String(txt).match(/Cierre de precios del mercado de granos al\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dm) return null;
  const out = { tarih: `${dm[3]}-${dm[2]}-${dm[1]}` };
  let urun = null;
  for (const l of String(txt).split(/\r?\n/)) {
    const t = l.trim();
    if (/^(Soja|Maíz|Trigo)$/.test(t)) { urun = t; continue; }
    if (/Subproductos/.test(t)) urun = null;
    const m = urun && !out[urun] && t.match(/^[A-Z]{3}\d{4}\s+USD\s+[\d.,-]+\s+USD\s+([\d.]*\d,\d{2})/);
    if (m) out[urun] = sayi(m[1]);
  }
  return out;
}
// Arjantin tarım bakanlığı (MAGyP) "Cotizaciones Diarias": FOB Arjantin limanları, US$/ton.
// Ürün başlığından sonraki "DEL DIA" satırı: [etiket, liman, kamara $/t, tohum FOB, emb., yağ, yan ürün (küspe), ...]
const AYLAR_ES = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12" };
export function magypFob(html) {
  const out = {};
  let urun = null;
  for (const tr of String(html).match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const td = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(metin);
    const dm = td.length === 1 && td[0].match(/^(\d{2})-([a-z]{3})-(\d{2})$/i);
    if (dm && AYLAR_ES[dm[2].toLowerCase()]) { out.tarih = `20${dm[3]}-${AYLAR_ES[dm[2].toLowerCase()]}-${dm[1]}`; continue; }
    if (td.length === 1 && /^[A-ZÁÉÍÓÚÑ ]{3,}$/.test(td[0])) { urun = td[0].trim(); continue; }
    if (urun && td[0] === "DEL DIA" && td.length >= 7) {
      // Sayı yazımı günden güne değişiyor: "1.175,00" (virgül ondalık) ya da "403.00" (nokta ondalık).
      const v = (x) => { const t = String(x || "").trim(); const n = /,/.test(t) ? sayi(t) : /^\d+\.\d{1,2}$/.test(t) ? parseFloat(t) : sayi(t); return n >= 30 && n <= 5000 ? n : null; };
      out[urun] = { tohum: v(td[3]), kuspe: v(td[6]) };
      urun = null;
    }
  }
  return out.tarih ? out : null;
}
// CEPEA sayfasındaki grafik verisi: son 60 iş gününün R$/60 kg değerleri (yeniden eskiye, tarihsiz).
// Tarihler Brezilya iş günlerinden üretilir; sayfadaki tablonun 15 günüyle birebir eşleşmezse kullanılmaz.
const BR_TATIL = new Set(["2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25",
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-04-21", "2027-05-27", "2027-09-07", "2027-10-12", "2027-11-02", "2027-11-15", "2027-11-20", "2027-12-25"]);
export function cepeaGecmis(html) {
  const m = String(html).match(/valor_array\[0\]\s*=\s*\[([^\]]+)\]/);
  if (!m) return null;
  const R = m[1].split(",").map((x) => parseFloat(x)).filter((x) => x > 0);
  const t = (String(html).match(/<table[\s\S]*?<\/table>/) || [""])[0], tab = [];
  for (const tr of t.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin), dm = td[0] && td[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dm && td.length >= 2) tab.push([`${dm[3]}-${dm[2]}-${dm[1]}`, sayi(td[1])]);
  }
  if (tab.length < 5 || !R.length) return null;
  const gunler = []; let d = tab[0][0];
  while (gunler.length < R.length) {
    const g = new Date(d + "T00:00:00Z").getUTCDay();
    if (g !== 0 && g !== 6 && !BR_TATIL.has(d)) gunler.push(d);
    const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); d = x.toISOString().slice(0, 10);
  }
  for (let i = 0; i < tab.length && i < R.length; i++) if (tab[i][0] !== gunler[i] || Math.abs(tab[i][1] - R[i]) > 0.005) return null;
  return gunler.map((g, i) => [g, R[i]]).reverse();
}
const eski = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return null; } })();
let kur;
try { kur = await seri("TRY=X"); } catch (e) { console.error("USD/TRY çekilemedi:", e.message); kur = (eski && eski.usdtry) || null; }
if (!kur) { console.error("Kur yok; dosya değiştirilmedi."); process.exit(1); }
const kurAt = (d) => { let v = null; for (const [t, x] of kur) { if (t <= d) v = x; else break; } return v ?? kur[0][1]; };
const sonuc = { guncel: new Date().toISOString(), kaynak: "CBOT vadeli (Yahoo Finance), FAO GIEWS, CEPEA (Brezilya), Arjantin tarım bakanlığı (FOB, MATba), StatCan (Kanada) ve USDA AMS haftalık yem raporları × USD/TRY", not: "Uluslararası referans fiyattır; Türkiye fiyatı değildir. Navlun, gümrük, vergi ve kalite farkı içermez; yönü ve değişim hızı için kullanın.", usdtry: kur.map(([d, v]) => [d, Math.round(v * 10000) / 10000]), urunler: [] };
let basarili = 0;
for (const u of URUNLER) {
  try {
    const s = await seri(u.sembol);
    if (!kur || (eski && kur === eski.usdtry)) throw new Error("güncel kur yok");
    sonuc.urunler.push({ ad: u.ad, sembol: u.sembol, birim: u.birim, seri: s.map(([d, v]) => [d, Math.round(v * u.carpan * kurAt(d))]) });
    basarili++;
  } catch (e) {
    const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === u.sembol);
    if (o) sonuc.urunler.push({ ...o, eski: true });
    console.error(u.ad, "çekilemedi:", e.message);
  }
}
// USDA haftalık raporları (3511: yağlı tohum/tahıl yan ürünleri, 3512: değirmen yan ürünleri — kepek):
// PDF → pdftotext → ürün fiyatları; önceki haftalar korunur, seri haftalık birikir.
const usdaSon = {};
for (const rapor of ["3511", "3512"]) {
  try {
    const r = await fetch(`https://www.ams.usda.gov/mnreports/ams_${rapor}.pdf`, { headers: UA });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const pdf = path.join(os.tmpdir(), `ams_${rapor}.pdf`);
    fs.writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
    const p = spawnSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
    if (p.status !== 0) throw new Error("pdftotext: " + (p.error ? p.error.message : p.stderr));
    const o = usdaOku(p.stdout);
    if (!o || !Object.keys(o.fiyat).length) throw new Error("rapor okunamadı");
    for (const [ad, v] of Object.entries(o.fiyat)) usdaSon[ad] = [o.tarih, v];
    console.log("USDA", rapor, o.tarih, JSON.stringify(o.fiyat));
  } catch (e) { console.error("USDA", rapor, "çekilemedi:", e.message); }
}
for (const u of USDA) {
  const eskiU = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "USDA" && x.ad === u.ad), yeni = usdaSon[u.ad];
  const seri = ((eskiU && eskiU.seri) || []).filter(([d]) => !yeni || d !== yeni[0]);
  if (yeni) seri.push([yeni[0], Math.round(yeni[1] * kurAt(yeni[0]))]);
  seri.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (seri.length) sonuc.urunler.push({ ad: u.ad, sembol: "USDA", birim: "ABD iç piyasa (USDA AMS haftalık, FOB bölge ortalaması) $/kısa ton → USD/ton", seri: seri.slice(-110), ...(yeni ? {} : { eski: true }) });
}
if (Object.keys(usdaSon).length) basarili++;
// FAO GIEWS FPMA uluslararası ihracat fiyatları (USD/ton; haftalık varsa haftalık, yoksa aylık; geçmiş dahil).
export const FAO = [
  { ad: "Arpa", merkez: "Karadeniz FOB (FAO/IGC, aylık)", uuid: "1d723a09-4225-49ee-b629-2f23a7ce7fc4" },
  { ad: "Arpa", merkez: "Fransa yemlik (FAO, aylık)", uuid: "aa0ee75e-441a-4a04-b762-24b2c2dccaaf" },
  { ad: "Mısır", merkez: "Ukrayna FOB (FAO)", uuid: "e49cb11d-3366-4d90-863b-f1a65fe78f09" },
  { ad: "Mısır", merkez: "Arjantin FOB (FAO)", uuid: "3fefffb8-a60a-43f6-9f70-b71479f44a04" },
  { ad: "Buğday", merkez: "Ukrayna FOB (FAO)", uuid: "a842f91c-53f9-4952-8afe-a0a684d743d0" },
  { ad: "Buğday", merkez: "Rusya FOB (FAO)", uuid: "9af3d755-75c1-4c9f-9593-3667f1b5bf8c" },
  { ad: "Buğday", merkez: "Fransa Rouen (FAO, aylık)", uuid: "97e58206-6e97-409b-b79d-6b57e642a615" },
  { ad: "Buğday", merkez: "Çin iç piyasa ort. (FAO)", uuid: "bb328835-7f56-4f3b-b8d5-50a062611965" },
  { ad: "Mısır", merkez: "Çin yem mısırı iç piyasa ort. (FAO)", uuid: "e3413759-5074-4063-822e-0f23b4ddd79e" },
  { ad: "Arpa", merkez: "Avustralya yemlik (FAO, aylık)", uuid: "992f1c4d-24ee-461c-aa57-bae353a2b1d5" },
  // Ek ihracat (FOB) fiyatları (kullanıcı sorusu 2026-11-14: "Ukrayna FOB varken diğer ülkelerde neden yok"). FAO GIEWS uluslararası fiyatları.
  { ad: "Mısır", merkez: "ABD Körfez FOB (FAO/USDA)", uuid: "5db69fc0-1005-440b-9e6c-065d1acec33e" },
  { ad: "Mısır", merkez: "Brezilya Paranaguá FOB (FAO/IGC, aylık)", uuid: "d471f6ae-21d2-4c05-a910-55f042fdebf1" },
  { ad: "Buğday", merkez: "Rusya FOB 12,5% (FAO/IGC, aylık)", uuid: "48593df4-3ed7-4f22-949d-1e7fa80db090" },
  { ad: "Buğday", merkez: "ABD Körfez FOB SRW (FAO/USDA)", uuid: "62dc04d8-35cc-4a5b-b58f-4f50a998681b" },
  { ad: "Buğday", merkez: "Arjantin FOB (FAO/IGC)", uuid: "e23b83a7-7cf7-40b0-87f7-6c03a2d3b2bc" },
  { ad: "Buğday", merkez: "Avustralya FOB ASW (FAO/IGC, aylık)", uuid: "c030667e-131d-421a-ba94-ab6cf8ffe2ee" },
];
export function faoSeri(j) {
  const dp = ((j && j.datapoints) || []).filter((x) => x && x.date && x.price_value_dollar > 0);
  const h = dp.filter((x) => x.periodicity === "weekly"), L = h.length >= 4 ? h : dp.filter((x) => x.periodicity === "monthly");
  return L.map((x) => [x.date, x.price_value_dollar]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
{
  const sinir = new Date(Date.now() - SAKLA_GUN * 864e5).toISOString().slice(0, 10);
  for (const u of FAO) {
    try {
      const L = faoSeri(await getir(`https://fpma.fao.org/giews/v4/global/price_module/api/v1/FpmaSeriePrice/${u.uuid}/`, true)).filter(([d]) => d >= sinir);
      if (!L.length) throw new Error("veri yok");
      sonuc.urunler.push({ ad: u.ad, sembol: "FAO", merkez: u.merkez, birim: "USD/ton → TL/ton (o tarihteki kur)", seri: L.map(([d, v]) => [d, Math.round(v * kurAt(d))]) });
      basarili++;
    } catch (e) {
      console.error("FAO", u.merkez, "çekilemedi:", e.message);
      const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "FAO" && x.ad === u.ad && x.merkez === u.merkez);
      if (o) sonuc.urunler.push({ ...o, eski: true });
    }
  }
}
// Güney Amerika: Brezilya CEPEA göstergeleri (sayfadaki son ~15 gün, US$/60 kg çuval) ve Arjantin MAGyP günlük
// raporundaki Rosario vadeli (MATba, en yakın vade) kapanışları (US$/ton). Geçmiş günden güne birikir.
const GA = [
  { ad: "Soya fasulyesi", merkez: "Brezilya Paranaguá limanı (CEPEA)", url: "https://www.cepea.org.br/br/indicador/soja.aspx" },
  { ad: "Mısır", merkez: "Brezilya Campinas (CEPEA)", url: "https://www.cepea.org.br/br/indicador/milho.aspx" },
];
const birikir = (sembol, ad, merkez, yeni) => {
  const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === sembol && x.ad === ad && x.merkez === merkez);
  const M = new Map(((o && o.seri) || []).map(([d, v]) => [d, v]));
  for (const [d, v] of yeni) M.set(d, v);
  const sinir = new Date(Date.now() - SAKLA_GUN * 864e5).toISOString().slice(0, 10);
  return [...M.entries()].filter(([d]) => d >= sinir).sort((a, b) => (a[0] < b[0] ? -1 : 1));
};
for (const u of GA) {
  try {
    const html = await getir(u.url, false), L = cepeaTablo(html);
    if (!L.length) throw new Error("tablo okunamadı");
    // Geçmiş azsa grafik verisinden son 60 iş gününü (R$ → US$, Kanada Merkez Bankası günlük kurları) ekle.
    const o0 = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "CEPEA" && x.ad === u.ad);
    if (!o0 || o0.seri.length < 40) {
      const G = cepeaGecmis(html);
      if (G && G.length) {
        const fx = (await getir(`https://www.bankofcanada.ca/valet/observations/FXBRLCAD,FXUSDCAD/json?start_date=${G[0][0]}`, true)).observations
          .map((o) => [o.d, parseFloat(o.FXBRLCAD.v) / parseFloat(o.FXUSDCAD.v)]).filter(([, v]) => v > 0);
        const usdBrl = (d) => { let v = null; for (const [t, x] of fx) { if (t <= d) v = x; else break; } return v; };
        const ek = G.map(([d, r]) => { const k = usdBrl(d); return k ? [d, Math.round((r * k * 1000) / 60 * 100) / 100] : null; }).filter(Boolean);
        const tm = new Set(L.map(([d]) => d));
        for (const p of ek) if (!tm.has(p[0])) L.push(p);
        L.sort((a, b) => (a[0] < b[0] ? -1 : 1));
        console.log("CEPEA", u.ad, "geçmiş:", ek.length, "gün");
      } else console.error("CEPEA", u.ad, "grafik verisi tarihlerle eşleşmedi; geçmiş eklenmedi");
    }
    sonuc.urunler.push({ ad: u.ad, sembol: "CEPEA", merkez: u.merkez, birim: "US$/60 kg → USD/ton → TL/ton", seri: birikir("CEPEA", u.ad, u.merkez, L.map(([d, v]) => [d, Math.round(v * kurAt(d))])) });
    basarili++;
  } catch (e) {
    console.error("CEPEA", u.ad, "çekilemedi:", e.message);
    const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "CEPEA" && x.ad === u.ad);
    if (o) sonuc.urunler.push({ ...o, eski: true });
  }
}
// Arjantin FOB (MAGyP): günlük arşiv sayfaları; eksik günler (en çok 120 gün geriye) tamamlanır.
{
  const B = "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/";
  const AR = [["SOJA", "kuspe", "Soya küspesi"], ["GIRASOL", "kuspe", "Ayçiçeği küspesi"], ["SOJA", "tohum", "Soya fasulyesi"]];
  const merkez = "Arjantin FOB limanları (tarım bakanlığı)";
  const sonGun = {};
  for (const [, , ad] of AR) { const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "MAGYP" && x.ad === ad); sonGun[ad] = o && o.seri.length ? o.seri[o.seri.length - 1][0] : ""; }
  const enEski = Object.values(sonGun).sort()[0] || "", sinir = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const yeni = {}; AR.forEach(([, , ad]) => (yeni[ad] = []));
  let okunan = 0, listeOk = false;
  try {
    const idx = await getir(B, false);
    listeOk = true;
    const linkler = [...new Set((idx.match(/_archivos\/000056_Precios Locales\/000060_[^'"]*?precart(\d{4}-\d{2}-\d{2})\.php/g) || []))]
      .map((l) => [l.match(/precart(\d{4}-\d{2}-\d{2})/)[1], l]).filter(([d]) => d >= sinir && d > enEski).sort();
    const tek = new Map(); for (const [d, l] of linkler) if (!tek.has(d)) tek.set(d, l);
    linkler.length = 0; linkler.push(...tek.entries());
    for (const [d, l] of linkler) {
      try {
        const o = magypFob(await getir(B + encodeURI(decodeURI(l)).replace(/,/g, "%2C"), false));
        if (!o) continue;
        okunan++;
        for (const [k, alan, ad] of AR) if (o[k] && o[k][alan]) yeni[ad].push([o.tarih, Math.round(o[k][alan] * kurAt(o.tarih))]);
      } catch (e) { console.error("MAGyP", d, e.message); }
      await bekle(300);
    }
  } catch (e) { console.error("MAGyP arşiv listesi alınamadı:", e.message); }
  for (const [, , ad] of AR) {
    const seri = birikir("MAGYP", ad, merkez, yeni[ad]);
    if (seri.length) sonuc.urunler.push({ ad, sembol: "MAGYP", merkez, birim: "USD/ton → TL/ton", seri, ...(listeOk ? {} : { eski: true }) });
  }
  if (listeOk) basarili++;
  console.log("MAGyP FOB:", okunan, "gün okundu");
}
// Kanada: StatCan 32-10-0077 aylık çiftçi fiyatı, yemlik arpa (CAD/ton) × Kanada Merkez Bankası aylık USD/CAD.
try {
  const fx = (await getir("https://www.bankofcanada.ca/valet/observations/FXMUSDCAD/json?start_date=" + new Date(Date.now() - (SAKLA_GUN + 60) * 864e5).toISOString().slice(0, 10), true)).observations
    .map((o) => [o.d, parseFloat(o.FXMUSDCAD.v)]).filter(([, v]) => v > 0);
  const cadUsd = (d) => { let v = null; for (const [t, x] of fx) { if (t <= d) v = x; } return v || (fx.length ? fx[fx.length - 1][1] : null); };
  for (const [kod, il] of [["9", "Alberta"], ["8", "Saskatchewan"]]) {
    const r = await fetch("https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods", { method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify([{ productId: 32100077, coordinate: `${kod}.45.0.0.0.0.0.0.0.0`, latestN: 26 }]) });
    if (!r.ok) throw new Error("StatCan HTTP " + r.status);
    const dp = ((await r.json())[0].object.vectorDataPoint || []).filter((p) => p.value > 0);
    if (!dp.length) throw new Error("StatCan veri yok");
    const merkez = `Kanada ${il} yemlik (çiftçi fiyatı, aylık)`;
    sonuc.urunler.push({ ad: "Arpa", sembol: "STATCAN", merkez, birim: "CAD/ton → USD/ton → TL/ton", seri: birikir("STATCAN", "Arpa", merkez, dp.map((p) => [p.refPer, Math.round((p.value / cadUsd(p.refPer)) * kurAt(p.refPer))])) });
  }
  basarili++;
} catch (e) {
  console.error("Kanada arpa çekilemedi:", e.message);
  for (const x of (eski && eski.urunler) || []) if (x.sembol === "STATCAN") sonuc.urunler.push({ ...x, eski: true });
}
// Yurt içi: eksik günleri tamamla. Her borsa için ayrı son kontrol günü; yeni eklenen borsa geriye 120 gün doldurulur.
const yEski = (eski && eski.yurtici) || null, anahtar = (u) => u.ad + "|" + u.borsa;
const BORSALAR = ["Gaziantep", "Konya", "Polatlı", "Adana"];
const yi = { kaynak: "Gaziantep, Konya, Polatlı ve Adana ticaret borsaları günlük bültenleri (miktar ağırlıklı ortalama; Adana en düşük–en yüksek ortası)", not: "Borsada tescil edilen gerçek satışların ortalamasıdır; kalite, nem ve nakliye farkı içerir. Az işlem gören ürünlerde fiyat günden güne sıçrayabilir.", birim: "TL/kg",
  kontrol: yEski && yEski.kontrol, kontrolB: Object.assign({}, (yEski && yEski.kontrolB) || (yEski && yEski.kontrol ? { Gaziantep: yEski.kontrol, Konya: yEski.kontrol } : {})),
  urunler: YURTICI.map((u) => { const o = yEski && Array.isArray(yEski.urunler) && yEski.urunler.find((x) => anahtar(x) === anahtar(u)); return { ad: u.ad, borsa: u.borsa, not: u.not, seri: ((o && o.seri) || []).slice() }; }) };
const bugun = new Date().toISOString().slice(0, 10);
const gunEkle = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const basla = {}; BORSALAR.forEach((b) => { basla[b] = yi.kontrolB[b] ? gunEkle(yi.kontrolB[b], -5) : gunEkle(bugun, -120); });
const say = { Gaziantep: 0, Konya: 0, Polatlı: 0, Adana: 0, hata: 0 };
const hataYaz = (b, gun, e) => { say.hata++; if (say.hata <= 6) console.error(b, gun, e.message); };
async function adanaGetir(gun) {
  const [y, m, d] = gun.split("-"), ad = `${d}${m}${y}.pdf`, sonraki = gunEkle(gun, 5).slice(0, 7).split("-");
  const yollar = [`${y}/${m}/${ad}`]; if (sonraki[1] !== m) yollar.push(`${sonraki[0]}/${sonraki[1]}/${ad}`);
  for (const yol of yollar) {
    const r = await fetch("https://adanatb.org.tr/wp-content/uploads/" + yol, { headers: UA });
    if (r.status === 404) continue;
    if (!r.ok) throw new Error("HTTP " + r.status);
    const f = path.join(os.tmpdir(), "adana_" + ad);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    const p = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" });
    if (p.status !== 0) throw new Error("pdftotext");
    const t = p.stdout, tm = t.match(/(\d{1,2})\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(\d{4})\s*[–-]\s*GÜNLÜK İŞLEM/);
    if (tm && +tm[1] !== +d) return [];
    return adanaSatirlar(t);
  }
  return [];
}
const enErken = BORSALAR.map((b) => basla[b]).sort()[0];
for (let gun = enErken; gun <= bugun; gun = gunEkle(gun, 1)) {
  const hg = new Date(gun + "T00:00:00Z").getUTCDay();
  if (hg === 0 || hg === 6) continue;
  const K = {}, [y, m, d] = gun.split("-");
  if (gun >= basla.Gaziantep) try { K.Gaziantep = gaziantepSatirlar(await getir(GAZIANTEP + gun, false), gun); if (K.Gaziantep.length) say.Gaziantep++; } catch (e) { hataYaz("Gaziantep", gun, e); }
  if (gun >= basla.Konya) try { const k = await getir(KONYA + gun, true); if (Array.isArray(k)) { K.Konya = k; if (k.length) say.Konya++; } } catch (e) { hataYaz("Konya", gun, e); }
  if (gun >= basla["Polatlı"]) try { K["Polatlı"] = polatliSatirlar(await getir(POLATLI + `${d}.${m}.${y}`, true)); if (K["Polatlı"].length) say["Polatlı"]++; } catch (e) { hataYaz("Polatlı", gun, e); }
  if (gun >= basla.Adana) try { K.Adana = await adanaGetir(gun); if (K.Adana.length) say.Adana++; } catch (e) { hataYaz("Adana", gun, e); }
  BORSALAR.forEach((b) => { if (K[b]) yi.kontrolB[b] = gun; });
  if (Object.keys(K).length) yi.kontrol = gun;
  YURTICI.forEach((u, i) => {
    if (!K[u.borsa]) return;
    const v = urunFiyati(u, K), s = yi.urunler[i].seri.filter(([dd]) => dd !== gun);
    if (v != null) s.push([gun, v]);
    s.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    yi.urunler[i].seri = s.filter(([dd]) => dd >= gunEkle(bugun, -SAKLA_GUN));
  });
  await bekle(400);
}
sonuc.yurtici = yi;
if (BORSALAR.some((b) => say[b])) basarili++;
console.log(`Yurt içi: ${BORSALAR.map((b) => b + " " + say[b] + " gün").join(", ")} okundu; ${say.hata} hata.`);
// Motorin (nakliye hesabı için): Opet il fiyatları (Mersin, il kodu 33), yedek Petrol Ofisi. TL/L, KDV dahil pompa fiyatı.
export function motorinBul(veri) {
  // Opet: [{districtName, prices:[{productName, amount}]}] — Akdeniz ilçesi önce, "Motorin" adlı ürünlerin en düşüğü (EcoForce/UltraForce)
  const L = Array.isArray(veri) ? veri : (veri && (veri.data || veri.result || veri.items)) || [];
  const ilce = (x) => String(x.districtName || x.ilceAdi || x.name || "").toLocaleUpperCase("tr");
  const sirali = [...L].sort((a, b) => (/AKDENİZ|AKDENIZ/.test(ilce(b)) ? 1 : 0) - (/AKDENİZ|AKDENIZ/.test(ilce(a)) ? 1 : 0));
  for (const d of sirali) {
    const P = (d.prices || d.fiyatlar || []).filter((p) => /motorin/i.test(String(p.productName || p.urunAdi || p.name || "")) && !/kırsal|kirsal|gaz/i.test(String(p.productName || "")));
    const v = P.map((p) => +(p.amount ?? p.price ?? p.fiyat)).filter((x) => x > 10 && x < 500);
    if (v.length) return { tl: Math.min(...v), ilce: ilce(d) || "MERSİN" };
  }
  return null;
}
export function motorinHtml(html) {
  // Petrol Ofisi il sayfası: tablo satırında "MERSİN" ve ardından benzin, motorin… fiyatları; "Motorin" sütununu başlıktan bul
  const t = metin(html), m = t.match(/MERS[İI]N[^0-9]{0,40}((?:\d{2,3}[.,]\d{2}\s*){2,6})/i);
  if (!m) return null; const nums = m[1].trim().split(/\s+/).map((x) => +x.replace(",", ".")).filter((x) => x > 10 && x < 500);
  return nums.length >= 2 ? { tl: nums[1], ilce: "MERSİN" } : null; // PO sırası: Benzin, Motorin, …
}
{
  const eM = (eski && eski.motorin) || null;
  let mo = null, kaynak = "";
  try { mo = motorinBul(await getir("https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=33&IncludeAllProducts=true", true)); kaynak = "Opet"; } catch (e) { console.error("Opet motorin:", e.message); }
  if (!mo) try { mo = motorinHtml(await getir("https://www.petrolofisi.com.tr/akaryakit-fiyatlari/mersin-akaryakit-fiyatlari", false)); kaynak = "Petrol Ofisi"; } catch (e) { console.error("PO motorin:", e.message); }
  if (mo) {
    const s = ((eM && eM.seri) || []).filter(([d]) => d !== bugun); s.push([bugun, Math.round(mo.tl * 100) / 100]);
    sonuc.motorin = { tl: Math.round(mo.tl * 100) / 100, tarih: bugun, yer: "Mersin " + mo.ilce, kaynak, seri: s.slice(-120) };
    console.log(`Motorin: ${sonuc.motorin.tl} TL/L (${kaynak}, ${sonuc.motorin.yer})`);
  } else if (eM) { sonuc.motorin = { ...eM, eski: true }; console.log("Motorin çekilemedi; önceki değer korundu."); }
}
if (!basarili) { console.error("Hiç ürün çekilemedi; dosya değiştirilmedi."); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(sonuc));
console.log(`fiyatlar.json yazıldı: ${basarili}/${URUNLER.length} ürün, USD/TRY ${kur.at(-1)[1].toFixed(2)} (${kur.at(-1)[0]})`);

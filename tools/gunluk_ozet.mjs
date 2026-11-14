// Günlük fiyat özeti (kullanıcı isteği 2026-11-13): fiyatlar.json'dan iki tablo — Yurt içi borsalar (TL/ton) ve
// Dünya merkezleri (USD/ton + tahmini Mersin liman) — her merkezde son fiyat ve bir önceki fiyata göre günlük değişim.
// Her sabah zamanlanmış görev bu çıktıyı kullanıcının telefonuna bildirim olarak gönderir. Kullanıcı kayıtları (alış fiyatı, teklif) girmez.
// Kullanım: node tools/gunluk_ozet.mjs [fiyatlar.json]  → Markdown metni stdout'a.
import fs from "node:fs";

const HAM = [
  ["Mısır", ["Mısır"]], ["Arpa", ["Arpa"]], ["Yemlik buğday", ["Yemlik buğday", "Buğday"]], ["Soya fasulyesi", ["Soya fasulyesi"]],
  ["Soya küspesi", ["Soya küspesi"]], ["DDGS", ["DDGS"]], ["Mısır gluteni", ["Mısır gluten yemi (feed)", "Mısır gluteni (meal)"]],
  ["Ayçiçeği küspesi", ["Ayçiçeği küspesi"]], ["Pamuk tohumu küspesi", ["Pamuk tohumu küspesi"]], ["Buğday kepeği", ["Buğday kepeği"]],
];
// Navlun varsayımları panodakiyle aynı (telefonda değiştirilen navlun buraya gelmez): Karadeniz 20, AB 35, G. Amerika 50, Avustralya 50, liman/sigorta 8 $/t.
const NAV = { KD: 20, AB: 35, GA: 50, AU: 50, US: 45, MS: 8 };
const koken = (m = "") => /Karadeniz|Ukrayna FOB|Rusya FOB/.test(m) ? "KD" : /^Fransa/.test(m) ? "AB" : /Arjantin FOB|Paranaguá/.test(m) ? "GA" : /^Avustralya/.test(m) ? "AU" : /^ABD Körfez FOB/.test(m) ? "US" : null;
const gunEkle = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const gunFark = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
const tr = (v, d = 0) => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const tarih = (d) => d.slice(8, 10) + "." + d.slice(5, 7);
const kisa = (e) => String(e)
  .replace(/^Çin yem mısırı iç piyasa ort\.?|^Çin iç piyasa ort\.?/, "Çin iç p.").replace(/^Kanada (\S+) yemlik.*$/, "Kanada $1")
  .replace(/^Brezilya Paranaguá limanı.*$/, "Brezilya Paranaguá").replace(/^Brezilya Campinas.*$/, "Brezilya Campinas")
  .replace(/^Arjantin FOB limanları.*$/, "Arjantin FOB").replace(/^ABD Körfez FOB SRW/, "ABD Körfez FOB").replace(/ 12,5%/, "").replace(/^(Fransa|Avustralya) yemlik.*$/, "$1")
  .replace(/\s*\((?:FAO[^)]*|CEPEA|tarım bakanlığı)\)/g, "").replace(/\s*\([^)]*\)$/, "");

// Seri olağan aralığının 3 katı (en az 14 gün; aylıkta 100 gün) yeni fiyat vermiyorsa durmuş sayılır (panodaki fpDurdu ile aynı).
export function durdu(s, ref) {
  if (!s || s.length < 3 || !ref) return 0;
  const gs = []; for (let i = 1; i < s.length; i++) gs.push(gunFark(s[i][0], s[i - 1][0]));
  gs.sort((a, b) => a - b); const g = gs[Math.floor(gs.length / 2)], yas = gunFark(ref, s[s.length - 1][0]), lim = g > 20 ? 100 : Math.max(3 * g, 14);
  return yas > lim ? yas : 0;
}
const degisim = (s) => { if (!s || s.length < 2) return null; const a = s[s.length - 1][1], b = s[s.length - 2][1]; return b > 0 ? (a / b - 1) * 100 : null; };
const aylik = (s) => { if (!s || s.length < 3) return false; const gs = []; for (let i = 1; i < s.length; i++) gs.push(gunFark(s[i][0], s[i - 1][0])); gs.sort((a, b) => a - b); return gs[Math.floor(gs.length / 2)] > 20; };
const ok = (v) => v === null ? "—" : Math.abs(v) < 0.05 ? "0%" : (v > 0 ? "🔺 +" : "🔻 −") + tr(Math.abs(v), 1) + "%";

export function ozet(D) {
  const ref = String(D.guncel || "").slice(0, 10), K = D.usdtry || [];
  const kur = (d) => { let v = null; for (const [t, x] of K) { if (t <= d) v = x; else break; } return v || (K[0] && K[0][1]) || 1; };
  const kurSon = K.length ? K[K.length - 1][1] : 1;
  const Y = (D.yurtici && D.yurtici.urunler) || [], U = D.urunler || [];
  let son = ""; for (const u of Y) if (u.seri && u.seri.length && u.seri[u.seri.length - 1][0] > son) son = u.seri[u.seri.length - 1][0];
  const zaman = new Date(D.guncel);
  const baslik = isNaN(zaman) ? "" : zaman.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const hareket = [];
  let o = `# Yem hammadde fiyatları · ${baslik}\n\n## Yurt içi borsalar · TL/ton\n\n| Hammadde | Borsa | Fiyat | Günlük | Tarih |\n|---|---|--:|--:|--:|\n`;
  for (const [ad, adlar] of HAM) {
    const L = Y.filter((u) => adlar.includes(u.ad) && u.seri && u.seri.length);
    if (!L.length) { o += `| **${ad}** | — | borsada işlem yok | | |\n`; continue; }
    L.forEach((u, i) => {
      const l = u.seri[u.seri.length - 1], eski = son && l[0] < gunEkle(son, -7), v = degisim(u.seri), yeni = l[0] === son;
      const borsa = u.borsa + (adlar.length > 1 ? (/feed/.test(u.ad) ? " feed" : / meal/.test(u.ad) || /\(meal\)/.test(u.ad) ? " meal" : "") : "");
      if (yeni && v !== null && Math.abs(v) >= 0.05) hareket.push([`${ad} (${u.borsa})`, v]);
      o += `| ${i ? "" : "**" + ad + "**"} | ${borsa} | ${tr(l[1] * 1000)}${eski ? "*" : ""} | ${yeni ? ok(v) : "işlem yok"} | ${tarih(l[0])} |\n`;
    });
  }
  o += `\n🔺 artış · 🔻 düşüş: bir önceki işlem gününe göre. "işlem yok": son borsa gününde (${son ? tarih(son) : "—"}) bu üründe satış olmadı, son fiyat yazılı. *eski: 1 haftadan eski. Bülten TL/kg × 1000.\n\n`;
  o += `## Dünya merkezleri · USD/ton\n\n| Hammadde | Merkez | Fiyat | Günlük | Tarih |\n|---|---|--:|--:|--:|\n`;
  const mersin = [];
  for (const [ad, adlar] of HAM) {
    const L = U.filter((u) => adlar.includes(u.ad) && u.seri && u.seri.length);
    if (!L.length) { o += `| **${ad}** | — | otomatik kaynak yok | | |\n`; continue; }
    const ms = [];
    L.forEach((u, i) => {
      const s = u.seri.map(([d, v]) => [d, v / kur(d)]), l = s[s.length - 1], dur = durdu(s, ref), v = degisim(s);
      const et = u.merkez ? kisa(u.merkez) : u.sembol === "USDA" ? "ABD iç p." + (/feed/.test(u.ad) ? " feed" : /meal/.test(u.ad) ? " meal" : "") : "Chicago";
      const kk = koken(u.merkez); if (kk && !dur && !u.eski) ms.push(l[1] + NAV[kk] + NAV.MS);
      const taze = gunFark(ref, l[0]) <= 4;
      if (taze && !dur && v !== null && Math.abs(v) >= 0.05) hareket.push([`${ad} (${et})`, v]);
      o += `| ${i ? "" : "**" + ad + "**"} | ${et} | ${tr(l[1], 1).replace(/,0$/, "")}${dur || u.eski ? "*" : ""} | ${dur ? "kaynak durdu" : taze ? ok(v) : aylik(s) ? "aylık" : "yeni fiyat yok"} | ${tarih(l[0])} |\n`;
    });
    if (ms.length) { const a = Math.min(...ms), b = Math.max(...ms); mersin.push(`| ${ad} | ${tr(a)}${b - a >= 1 ? "–" + tr(b) : ""} | ${tr(a * kurSon / 1000, 2)}${b - a >= 1 ? "–" + tr(b * kurSon / 1000, 2) : ""} |`); }
  }
  o += `\n"Günlük": son 4 günde gelen yeni fiyatın bir öncekine göre değişimi. "yeni fiyat yok": kaynak haftalık yayınlıyor, bu hafta henüz yeni fiyat gelmedi. "aylık": kaynak ayda bir yayınlıyor. *: kaynak bir süredir yeni fiyat vermiyor.\n\n`;
  if (mersin.length) o += `### Tahmini Mersin liman teslim\n\n| Hammadde | USD/ton | TL/kg |\n|---|--:|--:|\n${mersin.join("\n")}\n\nİhracat limanı (FOB) fiyatı + navlun (Karadeniz 20, Fransa 35, G. Amerika 50, Avustralya 50, ABD Körfezi 45 $/t) + liman/sigorta 8 $/t. Kur ${tr(kurSon, 2)}.\n\n`;
  hareket.sort((a, b) => b[1] - a[1]);
  const art = hareket.filter((x) => x[1] > 0).slice(0, 3), dus = hareket.filter((x) => x[1] < 0).slice(-3).reverse();
  let bas = "**Günün özeti:** ";
  bas += art.length ? "en çok artan " + art.map(([n, v]) => `${n} +${tr(v, 1)}%`).join(", ") : "artan yok";
  bas += dus.length ? "; en çok düşen " + dus.map(([n, v]) => `${n} −${tr(Math.abs(v), 1)}%`).join(", ") : "; düşen yok";
  bas += `. USD/TL ${tr(kurSon, 2)}.\n\n`;
  return o.replace("\n\n## Yurt içi", "\n\n" + bas + "## Yurt içi");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const D = JSON.parse(fs.readFileSync(process.argv[2] || "fiyatlar.json", "utf8"));
  process.stdout.write(ozet(D));
}

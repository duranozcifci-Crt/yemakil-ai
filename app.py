from datetime import datetime
import json
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="YemAkıl AI", version="1.2")

YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=5d"


def fiyat_getir(symbol):
    url = YAHOO.format(quote(symbol, safe=""))
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=15) as r:
        data = json.loads(r.read().decode("utf-8"))

    result = data["chart"]["result"][0]
    meta = result["meta"]
    fiyat = meta.get("regularMarketPrice")
    onceki = meta.get("chartPreviousClose") or meta.get("previousClose")

    if fiyat is None:
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        closes = [x for x in closes if x is not None]
        fiyat = closes[-1]
        onceki = closes[-2] if len(closes) > 1 else None

    degisim = None
    if onceki:
        degisim = ((float(fiyat) - float(onceki)) / float(onceki)) * 100

    return float(fiyat), degisim


def karar(degisim):
    if degisim is None:
        return "İZLE"
    if degisim >= 1:
        return "YÜKSELİŞ"
    if degisim <= -1:
        return "GERİLEME"
    return "YATAY"


def rapor_hazirla():
    usdtry, _ = fiyat_getir("TRY=X")
    misir, misir_deg = fiyat_getir("ZC=F")
    bugday, bugday_deg = fiyat_getir("ZW=F")
    soya_kuspesi, soya_deg = fiyat_getir("ZM=F")

    misir_usd_ton = (misir / 100) * 39.368
    bugday_usd_ton = (bugday / 100) * 36.744
    soya_usd_ton = soya_kuspesi * 1.10231131

    urunler = [
        {
            "simge": "🌽", "urun": "Mısır",
            "fiyat": f"{misir_usd_ton * usdtry:,.0f} TL/ton",
            "referans": f"{misir_usd_ton:,.2f} USD/ton",
            "degisim": f"%{misir_deg:+.2f}" if misir_deg is not None else "-",
            "karar": karar(misir_deg),
            "kaynak": "CBOT / Yahoo Finance"
        },
        {
            "simge": "🌾", "urun": "Buğday",
            "fiyat": f"{bugday_usd_ton * usdtry:,.0f} TL/ton",
            "referans": f"{bugday_usd_ton:,.2f} USD/ton",
            "degisim": f"%{bugday_deg:+.2f}" if bugday_deg is not None else "-",
            "karar": karar(bugday_deg),
            "kaynak": "CBOT / Yahoo Finance"
        },
        {
            "simge": "🌱", "urun": "Soya Küspesi",
            "fiyat": f"{soya_usd_ton * usdtry:,.0f} TL/ton",
            "referans": f"{soya_usd_ton:,.2f} USD/ton",
            "degisim": f"%{soya_deg:+.2f}" if soya_deg is not None else "-",
            "karar": karar(soya_deg),
            "kaynak": "CBOT / Yahoo Finance"
        },
        {
            "simge": "🌾", "urun": "Arpa",
            "fiyat": "Türkiye kaynağı bekleniyor",
            "referans": "-", "degisim": "-", "karar": "İZLE",
            "kaynak": "TÜRİB / TOBB eklenecek"
        },
        {
            "simge": "🌻", "urun": "Ayçiçeği Küspesi",
            "fiyat": "Türkiye kaynağı bekleniyor",
            "referans": "-", "degisim": "-", "karar": "İZLE",
            "kaynak": "Türkiye kaynağı eklenecek"
        },
        {
            "simge": "🌿", "urun": "Kanola Küspesi",
            "fiyat": "Türkiye kaynağı bekleniyor",
            "referans": "-", "degisim": "-", "karar": "İZLE",
            "kaynak": "Türkiye kaynağı eklenecek"
        },
    ]

    return {
        "durum": "canli",
        "guncelleme": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "usdtry": usdtry,
        "urunler": urunler,
        "not": "TL/ton değerleri uluslararası vadeli piyasa fiyatlarının USD/TL kuru ile çevrilmiş referansıdır; navlun, vergi ve kalite farklarını içermez."
    }


SAYFA = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>YemAkıl AI</title>
<style>
body{margin:0;background:#08130f;color:#fff;font-family:Arial,sans-serif}
.container{max-width:540px;margin:auto;padding:22px}
h1{color:#55dfa0;font-size:42px;margin:14px 0 4px}
.alt{color:#a8b9b1;margin-bottom:20px;font-size:18px}
.ai,.uyari{padding:17px;border-radius:18px;background:#10251d;border:1px solid #24523e;margin-bottom:16px}
.kart{background:#122019;padding:17px;margin-bottom:12px;border-radius:16px}
.ust{display:flex;justify-content:space-between;gap:12px;align-items:center}
.urun{font-size:20px;font-weight:bold}
.fiyat{color:#ffd66b;font-size:19px;font-weight:bold;text-align:right}
.ref{color:#9cb6aa;font-size:12px;text-align:right;margin-top:4px}
.detay{display:flex;justify-content:space-between;gap:8px;margin-top:11px;color:#9cb6aa;font-size:12px}
button{width:100%;border:0;border-radius:14px;padding:16px;background:#4cd890;font-size:17px;font-weight:bold}
#tarih{text-align:center;margin-top:14px;color:#90a69b;font-size:13px}
</style>
</head>
<body>
<div class="container">
<h1>YemAkıl AI</h1>
<div class="alt">Akıllı yem hammaddesi satın alma asistanı</div>
<div class="ai"><strong>🤖 Bugünün Piyasa Özeti</strong><p id="ozet">Fiyatlar kontrol ediliyor.</p></div>
<div id="urunler">Fiyatlar yükleniyor...</div>
<div class="uyari" id="uyari"></div>
<button onclick="verileriGetir()">Piyasayı Yenile</button>
<div id="tarih"></div>
</div>
<script>
async function verileriGetir(){
 const alan=document.getElementById("urunler");
 alan.innerHTML="Fiyatlar güncelleniyor...";
 try{
  const cevap=await fetch("/api/report",{cache:"no-store"});
  const veri=await cevap.json();
  if(!cevap.ok) throw new Error(veri.hata||"Veri alınamadı");
  alan.innerHTML=veri.urunler.map(item=>`
   <div class="kart">
    <div class="ust">
     <div class="urun">${item.simge} ${item.urun}</div>
     <div><div class="fiyat">${item.fiyat}</div><div class="ref">${item.referans}</div></div>
    </div>
    <div class="detay"><span>${item.kaynak}</span><span>${item.degisim}</span><span>${item.karar}</span></div>
   </div>`).join("");
  document.getElementById("ozet").innerText="USD/TL: "+Number(veri.usdtry).toFixed(2)+" — Uluslararası referans fiyatlar güncellendi.";
  document.getElementById("uyari").innerText=veri.not;
  document.getElementById("tarih").innerText="Son güncelleme: "+veri.guncelleme;
 }catch(hata){
  alan.innerHTML="Fiyat kaynağına şu anda ulaşılamadı.";
  document.getElementById("ozet").innerText="Bağlantı hatası: "+hata.message;
 }
}
verileriGetir();
</script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def ana_sayfa():
    return HTMLResponse(SAYFA)


@app.get("/api/report")
def api_report():
    try:
        return JSONResponse(rapor_hazirla())
    except Exception as e:
        return JSONResponse({"durum": "hata", "hata": str(e), "urunler": []}, status_code=503)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.2"}

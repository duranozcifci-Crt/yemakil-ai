from datetime import datetime
from html import unescape
import re
from urllib.request import Request, urlopen

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="YemAkıl AI", version="1.1")

TURIB_URL = "https://www.turib.com.tr/"


def turib_fiyatlarini_getir():
    req = Request(
        TURIB_URL,
        headers={"User-Agent": "Mozilla/5.0 YemAkilAI/1.1"}
    )

    with urlopen(req, timeout=15) as response:
        html = response.read().decode("utf-8", errors="ignore")

    metin = re.sub(r"<[^>]+>", " ", html)
    metin = unescape(metin)
    metin = re.sub(r"\s+", " ", metin)

    urunler = [
        ("🌽", "Mısır", "Mısır"),
        ("🌾", "Arpa", "Arpa"),
        ("🌾", "Buğday", "Buğday Ekmeklik"),
    ]

    sonuc = []

    for simge, ad, arama_adi in urunler:
        desen = (
            rf"{re.escape(arama_adi)}.*?"
            rf"(\d+[.,]\d+).*?"
            rf"%\s*([+-]?\d+[.,]\d+)"
        )

        eslesme = re.search(desen, metin, re.IGNORECASE)

        if eslesme:
            fiyat = eslesme.group(1).replace(",", ".")
            degisim = eslesme.group(2).replace(",", ".")

            degisim_sayisi = float(degisim)

            if degisim_sayisi > 0:
                karar = "YÜKSELİYOR"
            elif degisim_sayisi < 0:
                karar = "GERİLİYOR"
            else:
                karar = "YATAY"

            sonuc.append({
                "simge": simge,
                "urun": ad,
                "fiyat": f"{float(fiyat):.2f} TL/kg",
                "degisim": f"%{degisim_sayisi:+.2f}",
                "karar": karar,
                "kaynak": "TÜRİB ELÜS"
            })
        else:
            sonuc.append({
                "simge": simge,
                "urun": ad,
                "fiyat": "Veri alınamadı",
                "degisim": "-",
                "karar": "KONTROL",
                "kaynak": "TÜRİB"
            })

    bekleyenler = [
        ("🌱", "Soya Küspesi"),
        ("🌻", "Ayçiçeği Küspesi"),
        ("🌿", "Kanola Küspesi"),
    ]

    for simge, ad in bekleyenler:
        sonuc.append({
            "simge": simge,
            "urun": ad,
            "fiyat": "Kaynak bağlanacak",
            "degisim": "-",
            "karar": "İZLE",
            "kaynak": "Hazırlanıyor"
        })

    return sonuc


SAYFA = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>YemAkıl AI</title>

    <style>
        body {
            margin: 0;
            background: #08130f;
            color: white;
            font-family: Arial, sans-serif;
        }

        .container {
            max-width: 520px;
            margin: auto;
            padding: 24px;
        }

        h1 {
            color: #55dfa0;
            margin-bottom: 4px;
            font-size: 42px;
        }

        .alt {
            color: #a8b9b1;
            margin-bottom: 24px;
            font-size: 18px;
        }

        .ai {
            padding: 18px;
            border-radius: 18px;
            background: #10251d;
            border: 1px solid #24523e;
            margin-bottom: 18px;
        }

        .kart {
            background: #122019;
            padding: 17px;
            margin-bottom: 12px;
            border-radius: 16px;
        }

        .ust {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
        }

        .urun {
            font-size: 21px;
            font-weight: bold;
        }

        .fiyat {
            color: #ffd66b;
            font-size: 20px;
            font-weight: bold;
        }

        .detay {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            color: #9cb6aa;
            font-size: 13px;
        }

        button {
            width: 100%;
            border: 0;
            border-radius: 14px;
            padding: 16px;
            background: #4cd890;
            font-size: 17px;
            font-weight: bold;
            cursor: pointer;
        }

        #tarih {
            text-align: center;
            margin-top: 15px;
            color: #90a69b;
            font-size: 13px;
        }
    </style>
</head>

<body>
<div class="container">
    <h1>YemAkıl AI</h1>

    <div class="alt">
        Akıllı yem hammaddesi satın alma asistanı
    </div>

    <div class="ai">
        <strong>🤖 Bugünün Piyasa Özeti</strong>
        <p>
            TÜRİB hububat fiyatları canlı olarak kontrol ediliyor.
        </p>
    </div>

    <div id="urunler">
        Fiyatlar yükleniyor...
    </div>

    <button onclick="verileriGetir()">
        Piyasayı Yenile
    </button>

    <div id="tarih"></div>
</div>

<script>
async function verileriGetir() {
    const alan = document.getElementById("urunler");
    alan.innerHTML = "Fiyatlar güncelleniyor...";

    try {
        const cevap = await fetch("/api/report");
        const veri = await cevap.json();

        alan.innerHTML = veri.urunler.map(item => `
            <div class="kart">
                <div class="ust">
                    <div class="urun">
                        ${item.simge} ${item.urun}
                    </div>

                    <div class="fiyat">
                        ${item.fiyat}
                    </div>
                </div>

                <div class="detay">
                    <span>${item.kaynak}</span>
                    <span>${item.degisim}</span>
                    <span>${item.karar}</span>
                </div>
            </div>
        `).join("");

        document.getElementById("tarih").innerText =
            "Son güncelleme: " + veri.guncelleme;

    } catch (hata) {
        alan.innerHTML =
            "Fiyat kaynağına şu anda ulaşılamadı.";
    }
}

verileriGetir();
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def ana_sayfa():
    return HTMLResponse(SAYFA)


@app.get("/api/report")
def rapor():
    try:
        urunler = turib_fiyatlarini_getir()
        durum = "canli"
    except Exception as hata:
        urunler = []
        durum = f"hata: {str(hata)}"

    return JSONResponse({
        "durum": durum,
        "guncelleme": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "urunler": urunler
    })


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.1"
    }

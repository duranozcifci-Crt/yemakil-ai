from datetime import datetime

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="YemAkıl AI", version="1.0")

URUNLER = [
    {"urun": "Mısır", "simge": "🌽", "karar": "İZLE"},
    {"urun": "Arpa", "simge": "🌾", "karar": "İZLE"},
    {"urun": "Buğday", "simge": "🌾", "karar": "İZLE"},
    {"urun": "Soya Küspesi", "simge": "🌱", "karar": "İZLE"},
    {"urun": "Ayçiçeği Küspesi", "simge": "🌻", "karar": "İZLE"},
    {"urun": "Kanola Küspesi", "simge": "🌿", "karar": "İZLE"},
]

SAYFA = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            padding: 22px;
        }
        h1 {
            color: #65e6a5;
            margin-bottom: 4px;
        }
        .alt {
            color: #a8b9b1;
            margin-bottom: 24px;
        }
        .ai {
            padding: 18px;
            border-radius: 18px;
            background: #10251d;
            border: 1px solid #24523e;
            margin-bottom: 18px;
        }
        .kart {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #122019;
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 15px;
        }
        .urun {
            font-size: 18px;
            font-weight: bold;
        }
        .karar {
            color: #ffd66b;
            font-weight: bold;
        }
        button {
            width: 100%;
            border: 0;
            border-radius: 14px;
            padding: 15px;
            background: #4cd890;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        #tarih {
            color: #90a69b;
            text-align: center;
            margin-top: 18px;
            font-size: 13px;
        }
    </style>
</head>
<body>
<div class="container">
    <h1>YemAkıl AI</h1>
    <div class="alt">Akıllı yem hammaddesi satın alma asistanı</div>

    <div class="ai">
        <strong>🤖 Bugünün AI Yorumu</strong>
        <p>Henüz canlı fiyat kaynağı bağlanmadı. Sistem başarıyla çalışıyor.</p>
    </div>

    <div id="urunler"></div>

    <button onclick="verileriGetir()">Piyasayı Yenile</button>
    <div id="tarih"></div>
</div>

<script>
async function verileriGetir() {
    const cevap = await fetch('/api/report');
    const veri = await cevap.json();

    document.getElementById('urunler').innerHTML =
        veri.urunler.map(item => `
            <div class="kart">
                <div class="urun">${item.simge} ${item.urun}</div>
                <div class="karar">${item.karar}</div>
            </div>
        `).join('');

    document.getElementById('tarih').innerText =
        'Son güncelleme: ' + veri.guncelleme;
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
    return JSONResponse({
        "durum": "çalışıyor",
        "guncelleme": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "urunler": URUNLER
    })


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0"}

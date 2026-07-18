from app import fiyat_getir, karar
from veritabani import fiyat_kaydet

URUNLER = [
    {
        "urun": "Mısır",
        "sembol": "ZC=F",
        "carpan": 0.39368,
        "birim": "US cent/bushel",
    },
    {
        "urun": "Buğday",
        "sembol": "ZW=F",
        "carpan": 0.36744,
        "birim": "US cent/bushel",
    },
    {
        "urun": "Soya Küspesi",
        "sembol": "ZM=F",
        "carpan": 1.10231131,
        "birim": "USD/short ton",
    },
    {
        "urun": "Bitkisel Yağ",
        "sembol": "ZL=F",
        "carpan": 22.0462262,
        "birim": "US cent/lb",
    },
]


def gunluk_fiyatlari_kaydet():
    usd_try, _ = fiyat_getir("TRY=X")
    basarili = 0

    for urun in URUNLER:
        try:
            fiyat, degisim = fiyat_getir(urun["sembol"])
            fiyat_usd_ton = fiyat * urun["carpan"]
            fiyat_tl_ton = fiyat_usd_ton * usd_try
            alis_karari = karar(degisim)

            tarih = fiyat_kaydet(
                urun=urun["urun"],
                sembol=urun["sembol"],
                kaynak="CBOT / Yahoo Finance",
                fiyat_referans=fiyat,
                referans_birim=urun["birim"],
                usd_try=usd_try,
                fiyat_tl_ton=fiyat_tl_ton,
                degisim_yuzde=degisim,
                karar=alis_karari,
            )

            print(
                f"{urun['urun']}: {fiyat_tl_ton:.2f} TL/ton | "
                f"{alis_karari} | {tarih}"
            )
            basarili += 1

        except Exception as hata:
            print(f"{urun['urun']}: KAYIT HATASI - {hata}")

    print(f"Tamamlandı: {basarili}/{len(URUNLER)} ürün kaydedildi.")


if __name__ == "__main__":
    gunluk_fiyatlari_kaydet()

from pathlib import Path
import sqlite3

VERITABANI = Path(__file__).with_name("fiyat_gecmisi.db")


def veritabani_hazirla():
    with sqlite3.connect(VERITABANI) as baglanti:
        baglanti.execute("PRAGMA journal_mode=WAL")
        baglanti.execute("""
            CREATE TABLE IF NOT EXISTS fiyat_gecmisi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                urun TEXT NOT NULL,
                sembol TEXT NOT NULL,
                kaynak TEXT NOT NULL,
                fiyat_referans REAL NOT NULL,
                referans_birim TEXT NOT NULL,
                usd_try REAL NOT NULL,
                fiyat_tl_ton REAL NOT NULL,
                degisim_yuzde REAL,
                karar TEXT NOT NULL,
                kayit_tarihi TEXT NOT NULL,
                kayit_zamani TEXT NOT NULL,
                UNIQUE(urun, kaynak, kayit_tarihi)
            )
        """)
        baglanti.execute("""
            CREATE INDEX IF NOT EXISTS idx_fiyat_urun_tarih
            ON fiyat_gecmisi (urun, kayit_tarihi)
        """)


def fiyat_kaydet(
    urun,
    sembol,
    kaynak,
    fiyat_referans,
    referans_birim,
    usd_try,
    fiyat_tl_ton,
    degisim_yuzde,
    karar,
):
    from datetime import datetime
    from zoneinfo import ZoneInfo

    veritabani_hazirla()
    simdi = datetime.now(ZoneInfo("Europe/Istanbul"))
    kayit_tarihi = simdi.strftime("%Y-%m-%d")
    kayit_zamani = simdi.isoformat(timespec="seconds")

    with sqlite3.connect(VERITABANI) as baglanti:
        baglanti.execute("""
            INSERT INTO fiyat_gecmisi (
                urun, sembol, kaynak, fiyat_referans,
                referans_birim, usd_try, fiyat_tl_ton,
                degisim_yuzde, karar, kayit_tarihi, kayit_zamani
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(urun, kaynak, kayit_tarihi)
            DO UPDATE SET
                sembol = excluded.sembol,
                fiyat_referans = excluded.fiyat_referans,
                referans_birim = excluded.referans_birim,
                usd_try = excluded.usd_try,
                fiyat_tl_ton = excluded.fiyat_tl_ton,
                degisim_yuzde = excluded.degisim_yuzde,
                karar = excluded.karar,
                kayit_zamani = excluded.kayit_zamani
        """, (
            urun, sembol, kaynak, float(fiyat_referans),
            referans_birim, float(usd_try), float(fiyat_tl_ton),
            degisim_yuzde, karar, kayit_tarihi, kayit_zamani
        ))

    return kayit_tarihi


if __name__ == "__main__":
    veritabani_hazirla()
    print(f"Veritabani hazir: {VERITABANI}")

package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Bağımsız denetimde bulunan yanlış alarmlar: gerçek, zararsız mesaj ve adresler. */
class GercekMesajlarTest {

    private fun seviye(m: String) = MesajDenetleyici.denetle(m).seviye
    private fun sakin(m: String) = assertTrue("Yanlış alarm: $m → ${seviye(m)}", seviye(m).agirlik < Seviye.SARI.agirlik)

    @Test fun gercekBankaKodSmsleriSakin() {
        sakin("Akbank: 482913 tek kullanımlık şifrenizdir. Bu kodu/şifrenizi kimseyle paylaşmayınız.")
        sakin("Garanti BBVA internet şubesi giriş için doğrulama kodunuz: 731204. Kodu kimseye vermeyiniz.")
        sakin("e-Devlet Kapısı tek kullanımlık şifreniz: 553311. Bu şifreyi kimseyle paylaşmayın.")
        sakin("Ziraat Bankası onay kodu: 902211. Banka çalışanları dahil kimseyle paylaşmayınız.")
    }

    @Test fun kodIsteyenDolandiricilikYineKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("Bankanızın güvenlik birimiyiz, telefonunuza gelen doğrulama kodunu bize iletir misiniz?"))
        assertEquals(Seviye.KIRMIZI, seviye("Hesabınız bloke oldu. Gelen kodu paylaşın lütfen."))
        assertEquals(Seviye.KIRMIZI, seviye("Tek kullanımlık şifreniz 112233. İşlemi onaylamak için giriş yapın: akbank-onay.top/giris"))
    }

    @Test fun resmiAdresliKurumMesajlariSakin() {
        sakin("Turkcell: 245,90 TL faturanızın son ödeme tarihi 25.11. Ödeme: turkcell.com.tr/odeme")
        sakin("Bonus kampanyası: 1000 TL harcamaya 100 TL bonus kazan! Detay: garantibbva.com.tr/kampanyalar")
        sakin("Detay: ziraatbank.com.tr/giris adresinden işlemlerinizi yapabilirsiniz.")
    }

    @Test fun ayniKurguSahteAdresteKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("Turkcell: faturanız ödenmedi, hattınız 24 saat içinde kapatılacak. Ödeme: turkcell-odeme.top"))
    }

    @Test fun baglantiAyiklamaDuzeltildi() {
        assertEquals(listOf("ziraatbank.com.tr/giris"), MesajDenetleyici.baglantilariAyikla("Detay: ziraatbank.com.tr/giris"))
        assertEquals(emptyList<String>(), MesajDenetleyici.baglantilariAyikla("Bize destek@turkcell.com.tr adresinden yazın."))
        assertEquals(listOf("giris.ziraatbank.com.tr"), MesajDenetleyici.baglantilariAyikla("Adres: giris.ziraatbank.com.tr."))
    }

    @Test fun yalnizResmiAdresSakin() {
        sakin("isbank.com.tr")
        sakin("https://ziraat.ankara.edu.tr/ogrenci-giris")
        sakin("https://www.garantibbvaemeklilik.com.tr/giris")
        sakin("https://ziraatsigorta.com.tr")
    }

    @Test fun sahteBankaAdresiYineYakalanir() {
        assertEquals(Seviye.KIRMIZI, seviye("https://ziraatbank-giris.xyz"))
        assertEquals(Seviye.KIRMIZI, seviye("https://ziraat-onay.click/giris"))
        assertEquals(Seviye.KIRMIZI, seviye("https://garanti-bonus.top"))
    }
}

class DenetimDuzeltmeleriTest {
    private val p = "android.permission."
    private fun u(ad: String = "Örnek", yukleyen: String? = "com.android.vending", izinler: Map<String, Boolean> = emptyMap(),
                  kategori: UygulamaDegerlendirici.Kategori = UygulamaDegerlendirici.Kategori.BILINMIYOR) =
        UygulamaDegerlendirici.UygulamaBilgisi(paket = "com.x", ad = ad, sistemUygulamasi = false, yukleyen = yukleyen,
            hedefSdk = 34, izinler = izinler, kategori = kategori)
    private fun s(x: UygulamaDegerlendirici.UygulamaBilgisi) = UygulamaDegerlendirici.degerlendir(x).seviye

    @Test fun sesliSohbetliOyunSakin() {
        assertTrue(s(u("PUBG MOBILE", izinler = mapOf("${p}RECORD_AUDIO" to true), kategori = UygulamaDegerlendirici.Kategori.OYUN)).agirlik < Seviye.SARI.agirlik)
    }

    @Test fun adIcindeGecenSozcukAlarmVermez() {
        assertTrue(s(u("Fenerbahçe", izinler = mapOf("${p}READ_CONTACTS" to true))).agirlik < Seviye.SARI.agirlik)
        assertTrue(s(u("Pilates Studio", izinler = mapOf("${p}RECORD_AUDIO" to true))).agirlik < Seviye.SARI.agirlik)
        assertEquals(Seviye.SARI, s(u("Süper Fener", izinler = mapOf("${p}RECORD_AUDIO" to true))))
    }

    @Test fun galaxyStoreDaDenetleyenMagaza() {
        assertTrue(s(u(yukleyen = "com.sec.android.app.samsungapps", izinler = mapOf("${p}READ_SMS" to true))).agirlik < Seviye.SARI.agirlik)
    }

    @Test fun simgesizHassasUygulamaKirmizi() {
        val x = u(yukleyen = "com.android.vending").copy(simgesiz = true, erisilebilirlikAcik = true)
        assertEquals(Seviye.KIRMIZI, s(x))
    }

    @Test fun dosyadanYuklenenSistemYukleyiciliOlsaBileMagazaDisi() {
        assertEquals(Seviye.SARI, s(u(yukleyen = "com.sec.android.easyMover").copy(dosyadanYuklendi = true)))
    }

    @Test fun tasinanUygulamaYalnizBilgi() {
        assertEquals(Seviye.BILGI, s(u(yukleyen = "com.sec.android.easyMover").copy(tasindi = true)))
    }

    @Test fun ureticiCihazYoneticisiBilgi() {
        assertEquals(Seviye.BILGI, s(u().copy(ureticiUygulamasi = true, cihazYoneticisiAcik = true)))
    }

    @Test fun izinAdiDegisimiYeniIzinSayilmaz() {
        val eski = mapOf("a" to YeniUygulamaTakibi.Iz(1, setOf("${p}READ_EXTERNAL_STORAGE", "${p}ACCESS_COARSE_LOCATION")))
        val yeni = mapOf("a" to YeniUygulamaTakibi.Iz(2, setOf("${p}READ_MEDIA_IMAGES", "${p}ACCESS_FINE_LOCATION")))
        assertTrue(YeniUygulamaTakibi.karsilastir(eski, yeni).isEmpty())
    }

    @Test fun guvenilirUygulamadaKodBulgusuBilgi() {
        val sn = KodIncelemesi.Sonuc(setOf(KodIncelemesi.Yetenek.EKRAN_KONTROLU, KodIncelemesi.Yetenek.SMS_OKUMA), 1, okunamadi = false, kismi = false)
        assertEquals(Seviye.KIRMIZI, KodIncelemesi.bulgular(sn).enYuksekSeviye())
        assertEquals(Seviye.BILGI, KodIncelemesi.bulgular(sn, guvenilir = true).enYuksekSeviye())
        // Manifestte erişilebilirlik hizmeti yoksa "ekran kontrolü" sayılmaz (ör. şifre yöneticisi kütüphanesi).
        assertTrue(KodIncelemesi.bulgular(sn, erisilebilirlikHizmetiVar = false).none { it.seviye == Seviye.KIRMIZI })
    }

    @Test fun simgeGizlemeTekBasinaKirmiziDegil() {
        val sn = KodIncelemesi.Sonuc(setOf(KodIncelemesi.Yetenek.SIMGE_GIZLEME, KodIncelemesi.Yetenek.SMS_OKUMA), 1, okunamadi = false, kismi = false)
        assertTrue(KodIncelemesi.bulgular(sn).none { it.seviye == Seviye.KIRMIZI })
    }
}

package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class UygulamaVeCihazTest {

    private fun uygulama(
        yukleyen: String? = "com.android.vending",
        izinler: Map<String, Boolean> = emptyMap(),
        ad: String = "Örnek",
        erisilebilirlik: Boolean = false,
        hedefSdk: Int = 34,
        kategori: UygulamaDegerlendirici.Kategori = UygulamaDegerlendirici.Kategori.BILINMIYOR,
    ) = UygulamaDegerlendirici.UygulamaBilgisi(
        paket = "com.ornek", ad = ad, sistemUygulamasi = false, yukleyen = yukleyen,
        hedefSdk = hedefSdk, izinler = izinler, kategori = kategori, erisilebilirlikAcik = erisilebilirlik,
    )

    private val p = "android.permission."

    @Test fun magazadanIzinsizUygulamaYesil() {
        assertEquals(Seviye.YESIL, UygulamaDegerlendirici.degerlendir(uygulama()).seviye)
    }

    @Test fun izinIstemekTekBasinaZararliDegil() {
        // Kamera ve konum isteyen, mağazadan yüklenmiş bir uygulama "incele" bile değil.
        val u = uygulama(izinler = mapOf("${p}CAMERA" to true, "${p}ACCESS_FINE_LOCATION" to true))
        assertEquals(Seviye.YESIL, UygulamaDegerlendirici.degerlendir(u).seviye)
    }

    @Test fun magazaDisiSari() {
        assertEquals(Seviye.SARI, UygulamaDegerlendirici.degerlendir(uygulama(yukleyen = null)).seviye)
    }

    @Test fun magazaDisiErisilebilirlikKirmizi() {
        val s = UygulamaDegerlendirici.degerlendir(uygulama(yukleyen = "com.google.android.packageinstaller", erisilebilirlik = true))
        assertEquals(Seviye.KIRMIZI, s.seviye)
    }

    @Test fun magazadanErisilebilirlikSari() {
        assertEquals(Seviye.SARI, UygulamaDegerlendirici.degerlendir(uygulama(erisilebilirlik = true)).seviye)
    }

    @Test fun smsOkuyanFenerUygulamasi() {
        val u = uygulama(ad = "Süper Fener", izinler = mapOf("${p}READ_SMS" to true))
        val s = UygulamaDegerlendirici.degerlendir(u)
        assertEquals(Seviye.SARI, s.seviye)
        assertTrue(s.bulgular.any { it.baslik.contains("beklenmedik") })
    }

    @Test fun verilmemisIzinSayilmaz() {
        val u = uygulama(ad = "Fener", izinler = mapOf("${p}READ_SMS" to false))
        assertEquals(Seviye.YESIL, UygulamaDegerlendirici.degerlendir(u).seviye)
    }

    @Test fun eskiHedefSdkSari() {
        assertEquals(Seviye.SARI, UygulamaDegerlendirici.degerlendir(uygulama(hedefSdk = 19)).seviye)
    }

    private fun cihaz(kilit: Boolean? = true, yama: String? = "2026-10-01", api: Int = 35, usb: Boolean? = false) =
        CihazDegerlendirici.CihazBilgisi(kilit, api, "15", yama, false, usb, LocalDate.of(2026, 11, 21))

    @Test fun guncelKilitliTelefonSorunsuz() {
        assertEquals(Seviye.YESIL, CihazDegerlendirici.degerlendir(cihaz()).enYuksekSeviye())
    }

    @Test fun ekranKilidiYokKirmizi() {
        assertEquals(Seviye.KIRMIZI, CihazDegerlendirici.degerlendir(cihaz(kilit = false)).enYuksekSeviye())
    }

    @Test fun eskiYamaSari() {
        assertEquals(Seviye.SARI, CihazDegerlendirici.degerlendir(cihaz(yama = "2025-12-01")).enYuksekSeviye())
    }

    @Test fun usbHataAyiklamaSari() {
        assertEquals(Seviye.SARI, CihazDegerlendirici.degerlendir(cihaz(usb = true)).enYuksekSeviye())
    }
}

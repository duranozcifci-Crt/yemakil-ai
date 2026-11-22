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

class UreticiVeWebTest {
    private val p = "android.permission."
    private fun u(paket: String = "com.samsung.android.app.watchmanager", yukleyen: String? = null, uretici: Boolean = false, izinler: Map<String, Boolean> = emptyMap()) =
        UygulamaDegerlendirici.UygulamaBilgisi(
            paket = paket, ad = "Galaxy Wearable", sistemUygulamasi = false, yukleyen = yukleyen, hedefSdk = 34,
            izinler = izinler, bildirimErisimiAcik = true, ureticiUygulamasi = uretici,
        )

    @org.junit.Test fun ureticiUygulamasiIsaretlenmez() {
        val sms = mapOf("${p}READ_SMS" to true, "${p}RECEIVE_SMS" to true)
        org.junit.Assert.assertEquals(Seviye.KIRMIZI, UygulamaDegerlendirici.degerlendir(u(izinler = sms)).seviye)
        org.junit.Assert.assertEquals(Seviye.YESIL, UygulamaDegerlendirici.degerlendir(u(uretici = true, izinler = sms)).seviye)
    }

    @org.junit.Test fun ureticiDeOlsaErisilebilirlikBildirilir() {
        val x = u(uretici = true).copy(erisilebilirlikAcik = true)
        org.junit.Assert.assertEquals(Seviye.SARI, UygulamaDegerlendirici.degerlendir(x).seviye)
    }

    @org.junit.Test fun webUygulamasiYalnizBilgi() {
        val w = u(paket = "org.chromium.webapk.a1b2c3", yukleyen = "com.android.chrome").copy(bildirimErisimiAcik = false)
        org.junit.Assert.assertEquals(Seviye.BILGI, UygulamaDegerlendirici.degerlendir(w).seviye)
    }
}

class PlayKurallariTest {
    private val p = "android.permission."
    private fun u(yukleyen: String?, izinler: Map<String, Boolean>) = UygulamaDegerlendirici.UygulamaBilgisi(
        paket = "com.ornek", ad = "Örnek", sistemUygulamasi = false, yukleyen = yukleyen, hedefSdk = 34, izinler = izinler,
    )
    private val banka = mapOf(
        "${p}CAMERA" to true, "${p}ACCESS_FINE_LOCATION" to true, "${p}READ_CONTACTS" to true,
        "${p}RECORD_AUDIO" to true, "${p}ACCESS_BACKGROUND_LOCATION" to true,
    )
    private val whatsapp = mapOf("${p}READ_SMS" to true, "${p}RECEIVE_SMS" to true, "${p}READ_CONTACTS" to true)

    @org.junit.Test fun playdenBankaUygulamasiIsaretlenmez() {
        org.junit.Assert.assertTrue(UygulamaDegerlendirici.degerlendir(u("com.android.vending", banka)).seviye.agirlik < Seviye.SARI.agirlik)
    }

    @org.junit.Test fun playdenSmsOkuyanUygulamaIsaretlenmez() {
        org.junit.Assert.assertTrue(UygulamaDegerlendirici.degerlendir(u("com.android.vending", whatsapp)).seviye.agirlik < Seviye.SARI.agirlik)
    }

    @org.junit.Test fun ayniIzinlerMagazaDisiysaYineYakalanir() {
        org.junit.Assert.assertEquals(Seviye.KIRMIZI, UygulamaDegerlendirici.degerlendir(u(null, whatsapp)).seviye)
        org.junit.Assert.assertEquals(Seviye.SARI, UygulamaDegerlendirici.degerlendir(u(null, banka)).seviye)
    }
}

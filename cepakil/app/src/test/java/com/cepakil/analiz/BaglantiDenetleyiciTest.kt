package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BaglantiDenetleyiciTest {

    private fun seviye(url: String) = BaglantiDenetleyici.denetle(url).seviye
    private fun basliklar(url: String) = BaglantiDenetleyici.denetle(url).bulgular.map { it.baslik }

    @Test fun resmiHttpsAdresHicbirZamanYesilDegil() {
        val s = BaglantiDenetleyici.denetle("https://www.turkiye.gov.tr/")
        assertEquals(Seviye.BILGI, s.seviye)
        assertTrue(s.ozet.startsWith("Kesin sonuç verilemiyor"))
    }

    @Test fun resmiBankaAltAlanAdiTemizKalir() {
        assertEquals(Seviye.BILGI, seviye("https://giris.ziraatbank.com.tr/sube"))
        assertEquals(Seviye.BILGI, seviye("https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula"))
    }

    @Test fun httpSariOlur() {
        assertEquals(Seviye.SARI, seviye("http://ornek.com"))
    }

    @Test fun javascriptProtokoluKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("javascript:alert(1)"))
    }

    @Test fun atIsaretiHilesiKirmizi() {
        val s = BaglantiDenetleyici.denetle("https://www.ziraatbank.com.tr@kotu-site.xyz/giris")
        assertEquals(Seviye.KIRMIZI, s.seviye)
        assertEquals("kotu-site.xyz", s.alanAdi)
    }

    @Test fun kurumAdiVeSupheliUzantiKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("https://ptt-kargo-teslimat.top/odeme"))
        assertEquals(Seviye.KIRMIZI, seviye("http://edevlet-iade.com/basvuru"))
    }

    @Test fun kurumAdiTekBasinaSari() {
        assertEquals(Seviye.SARI, seviye("https://hepsiburadaindirim.com"))
    }

    @Test fun farkliUzantiliKopyaKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("https://ziraatbank.com/"))
    }

    @Test fun harfBenzerligiKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("https://trendyoi.com"))
        assertEquals(Seviye.KIRMIZI, seviye("https://faceb00k.com/login"))
        assertEquals(Seviye.KIRMIZI, seviye("https://sahibindenn.com"))
    }

    @Test fun kisaBenzerlikYanlisAlarmVermez() {
        // "cloud" ≠ "icloud" taklidi; "ample" ≠ "apple"
        assertNotEquals(Seviye.KIRMIZI, seviye("https://cloud.com"))
        assertNotEquals(Seviye.KIRMIZI, seviye("https://ample.com"))
    }

    @Test fun kisalticiSari() {
        assertEquals(Seviye.SARI, seviye("https://bit.ly/3abcde"))
    }

    @Test fun ipAdresiSari() {
        assertEquals(Seviye.SARI, seviye("https://192.168.4.20/login"))
    }

    @Test fun kirilHarfliTaklitKirmizi() {
        // "аpple.com" — ilk harf Kiril "а"
        assertEquals(Seviye.KIRMIZI, seviye("https://аpple.com"))
        // Aynı adresin Punycode yazımı
        assertEquals(Seviye.KIRMIZI, seviye("https://xn--pple-43d.com"))
    }

    @Test fun turkceKarakterliAdresSari() {
        assertEquals(Seviye.SARI, seviye("https://çiçekçi.com.tr"))
    }

    @Test fun apkIndirmeSari() {
        assertTrue(basliklar("https://ornek.com/indir/uygulama.apk").any { it.contains("APK", ignoreCase = true) })
    }

    @Test fun mesajIcindenBaglantiAyiklanir() {
        val s = BaglantiDenetleyici.denetle("Kargonuz bekliyor, hemen ödeyin: http://ptt-teslimat.click/ode teşekkürler")
        assertEquals(Seviye.KIRMIZI, s.seviye)
    }

    @Test fun cumleSonuNoktalamasiAtilir() {
        val s = BaglantiDenetleyici.denetle("Bilgi için: https://www.turkiye.gov.tr.")
        assertEquals("www.turkiye.gov.tr", s.alanAdi)
        assertEquals(Seviye.BILGI, s.seviye)
    }

    @Test fun protokolsuzAdres() {
        val s = BaglantiDenetleyici.denetle("www.ornek.com.tr/sayfa")
        assertEquals(Seviye.BILGI, s.seviye)
        assertEquals("www.ornek.com.tr", s.alanAdi)
    }

    @Test fun portNumarasiProtokolSanilmaz() {
        val s = BaglantiDenetleyici.denetle("ornek.com:8080/yol")
        assertEquals("ornek.com", s.alanAdi)
        assertTrue(s.bulgular.any { it.baslik.contains("8080") })
    }

    @Test fun ucretsizBarindirmaUzerindeBankaKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("https://akbank-giris.web.app"))
    }

    @Test fun gecersizDevletAdresi() {
        assertEquals(Seviye.SARI, seviye("https://basvuru-gov.com"))
    }

    @Test fun bosGirdi() {
        assertEquals(Seviye.BILGI, seviye("   "))
    }

    @Test fun kayitliAlanAdi() {
        assertEquals("ziraatbank.com.tr", BaglantiDenetleyici.kayitliAlanAdi("a.b.ziraatbank.com.tr"))
        assertEquals("ornek.com", BaglantiDenetleyici.kayitliAlanAdi("x.y.ornek.com"))
    }
}

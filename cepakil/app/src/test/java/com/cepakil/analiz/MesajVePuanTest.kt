package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class MesajVePuanTest {

    private fun seviye(m: String) = MesajDenetleyici.denetle(m).seviye

    @Test fun kargoDolandiriciligiKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("PTT: Gönderiniz adres bilgisi eksik olduğu için teslim edilemedi. 24 saat içinde ödeme yapın: ptt-kargo.top/ode"))
    }

    @Test fun kodIstemeKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("Merhaba, bankanızdan arıyoruz. Telefonunuza gelen doğrulama kodunu paylaşır mısınız?"))
    }

    @Test fun yakinTaklidiKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("Anne ben, telefonum bozuldu bu yeni numaram. Acil şu IBAN'a 5000 TL havale yapar mısın TR12 0006 1000 0000 1234 5678 90"))
    }

    @Test fun odulKirmizi() {
        assertEquals(Seviye.KIRMIZI, seviye("Tebrikler! Çekilişte iPhone kazandınız. Hediyenizi almak için tıklayın: bit.ly/abc123"))
    }

    @Test fun gundelikMesajSakin() {
        // "hemen", "kargo" gibi sözcükler tek başına alarm üretmez.
        assertEquals(Seviye.BILGI, seviye("Hemen geliyorum, kargon kapıya bırakılmış."))
        assertEquals(Seviye.BILGI, seviye("Açılış töreni saat 5'te, unutma."))
        assertEquals(Seviye.BILGI, seviye("Akşam yemeğe gelir misin?"))
    }

    @Test fun yalnizBaglantiEskiDavranis() {
        val s = MesajDenetleyici.denetle("https://www.turkiye.gov.tr/")
        assertEquals(false, s.mesajMi)
        assertEquals(Seviye.BILGI, s.seviye)
    }

    @Test fun mesajdakiBaglantilarAyiklanir() {
        assertEquals(listOf("ptt-kargo.top/ode", "https://bit.ly/x"), MesajDenetleyici.baglantilariAyikla("Bak: ptt-kargo.top/ode ve https://bit.ly/x."))
    }

    @Test fun acikWifiSari() {
        val c = CihazDegerlendirici.CihazBilgisi(true, 35, "15", "2026-10-01", false, false, LocalDate.of(2026, 11, 21), CihazDegerlendirici.WifiGuvenlik.ACIK)
        assertEquals(Seviye.SARI, CihazDegerlendirici.degerlendir(c).enYuksekSeviye())
        val g = c.copy(wifi = CihazDegerlendirici.WifiGuvenlik.WPA3)
        assertEquals(Seviye.YESIL, CihazDegerlendirici.degerlendir(g).enYuksekSeviye())
    }

    @Test fun puanRenkleCelismez() {
        assertEquals(100, PuanHesaplayici.hesapla(emptyList(), listOf(Seviye.YESIL)).deger)
        assertTrue(PuanHesaplayici.hesapla(emptyList(), listOf(Seviye.KIRMIZI)).deger <= 59)
        assertTrue(PuanHesaplayici.hesapla(emptyList(), listOf(Seviye.SARI)).deger in 60..84)
        val kilitsiz = PuanHesaplayici.hesapla(listOf(Bulgu(Seviye.KIRMIZI, "Ekran kilidi yok", "")), emptyList())
        assertTrue(kilitsiz.deger <= 59)
    }
}

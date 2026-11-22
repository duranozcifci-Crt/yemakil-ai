package com.cepakil.analiz

import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TehditVeDnsTest {

    private val vt = TehditVeritabani.ayristir(
        urlhausUrl = "# URLhaus\nhttp://kotu-dagitim.example/indir/fatura.apk\nhttps://195.1.2.3/x.sh\n",
        urlhausHost = "# hostfile\n127.0.0.1\tkotu-dagitim.example\n127.0.0.1\tsites.google.com\n127.0.0.1\t195.1.2.3\n",
        openphish = "https://ziraat-giris-onay.example/login\nhttps://sites.google.com/view/sahte-banka\n",
        bazaar = "# MalwareBazaar\n" + "a".repeat(64) + "\nGECERSIZ\n",
        zaman = 1L,
    )

    @After fun temizle() { TehditKaynagi.veritabani = null }

    @Test fun ayristirma() {
        assertTrue("kotu-dagitim.example" in vt.hostlar)
        assertTrue("ziraat-giris-onay.example" in vt.hostlar)
        // Ortak platformlar ve IP adresleri sunucu olarak engellenmez (yalnız tam adres).
        assertTrue("sites.google.com" !in vt.hostlar)
        assertTrue("195.1.2.3" !in vt.hostlar)
        assertTrue("sites.google.com/view/sahte-banka" in vt.urller)
        assertEquals(1, vt.hashler.size)
    }

    @Test fun altAlanAdiDaEslesir() {
        assertTrue(vt.hostListede("cdn.kotu-dagitim.example"))
        assertTrue(!vt.hostListede("example"))
    }

    @Test fun baglantiKontroluListeyiKullanir() {
        TehditKaynagi.veritabani = vt
        val s = BaglantiDenetleyici.denetle("https://ziraat-giris-onay.example/baska-sayfa")
        assertEquals(Seviye.KIRMIZI, s.seviye)
        assertTrue(s.bulgular.any { it.baslik.contains("Bilinen zararlı") })
        // Ortak platformda yalnız listedeki tam sayfa kırmızı olur.
        assertTrue(BaglantiDenetleyici.denetle("https://sites.google.com/view/sahte-banka").bulgular.any { it.baslik == "Bilinen zararlı bağlantı" })
        assertTrue(BaglantiDenetleyici.denetle("https://sites.google.com/view/okulum").bulgular.none { it.baslik.startsWith("Bilinen zararlı") })
    }

    @Test fun dosyaParmakIziListede() {
        TehditKaynagi.veritabani = vt
        assertEquals(Seviye.KIRMIZI, vt.dosyaBulgusu("A".repeat(64))?.seviye)
        assertNull(vt.dosyaBulgusu("b".repeat(64)))
    }

    private fun dnsSorgusu(ad: String): ByteArray {
        val govde = ad.split('.').flatMap { listOf(it.length.toByte()) + it.toByteArray().toList() } + listOf(0.toByte(), 0, 1, 0, 1)
        return byteArrayOf(0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0) + govde.toByteArray()
    }

    @Test fun dnsSorgusuOkunurVeNxdomainUretilir() {
        val q = dnsSorgusu("www.kotu-dagitim.example")
        assertEquals("www.kotu-dagitim.example", DnsPaketi.sorguAdi(q))
        val y = DnsPaketi.nxdomain(q)
        assertEquals(0x12.toByte(), y[0]); assertEquals(0x34.toByte(), y[1])
        assertTrue((y[2].toInt() and 0x80) != 0)          // yanıt
        assertEquals(3, y[3].toInt() and 0x0F)              // NXDOMAIN
        assertEquals(q.size, y.size)                        // soru bölümü korunur
    }

    @Test fun ipv4UdpPaketGidisDonus() {
        val kaynak = byteArrayOf(10, 111, 0, 2); val hedef = byteArrayOf(10, 111, 0, 1)
        val veri = dnsSorgusu("ornek.com")
        val p = DnsPaketi.ipv4UdpPaketle(kaynak, hedef, 40000, 53, veri)
        assertEquals(0, DnsPaketi.saglama(p, 0, 20)) // IP başlık sağlaması doğru
        val u = DnsPaketi.ipv4UdpCoz(p)!!
        assertArrayEquals(kaynak, u.kaynakIp); assertArrayEquals(hedef, u.hedefIp)
        assertEquals(40000, u.kaynakPort); assertEquals(53, u.hedefPort)
        assertArrayEquals(veri, u.veri)
    }
}

package com.cepakil.analiz

import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TehditVeDnsTest {

    private val vt = TehditVeritabani.ayristir(
        urlListesi = "# URLhaus\nhttp://kotu-dagitim.example/indir/fatura.apk\nhttps://195.1.2.3/x.sh\n",
        hostListesi = "# hostfile\n127.0.0.1\tkotu-dagitim.example\n127.0.0.1\tsites.google.com\n127.0.0.1\t195.1.2.3\n",
        sayfaListesi = "https://ziraat-giris-onay.example/login\nhttps://sites.google.com/view/sahte-banka\n",
        hashListesi = "# MalwareBazaar\n" + "a".repeat(64) + "\nGECERSIZ\n",
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

    @Test fun usomVeHostsBicimi() {
        val v = TehditVeritabani.ayristir(
            null,
            "# malware-filter\n0.0.0.0 zararli-sunucu.example\n",
            "edevlet-odeme-iade.example\nhttp://kargo-takip-ucret.example/odeme?id=5\nsites.google.com\n85.1.2.3\n",
            null, 1L,
        )
        assertTrue(v.hostListede("zararli-sunucu.example"))
        assertTrue(v.hostListede("www.edevlet-odeme-iade.example"))
        assertTrue(v.hostListede("kargo-takip-ucret.example"))
        assertTrue("kargo-takip-ucret.example/odeme?id=5" in v.urller)
        // Yalın alan adı sunucu listesinde; ayrıca tam adres olarak tutulmaz.
        assertTrue("edevlet-odeme-iade.example" !in v.urller)
        assertTrue(!v.hostListede("sites.google.com"))
        assertTrue(!v.hostListede("docs.google.com"))
    }

    @Test fun dosyadakiZararliBaglanti() {
        TehditKaynagi.veritabani = vt
        val pdf = "%PDF-1.4\n1 0 obj << /Type /Annot /A << /URI (https://ziraat-giris-onay.example/giris) >> >>\n%%EOF".toByteArray()
        val s = DosyaDenetleyici.denetle("hesap.pdf", { pdf.inputStream() })
        assertEquals(Seviye.KIRMIZI, s.seviye)
        assertTrue(s.bulgular.any { it.baslik == "Dosyada bilinen zararlı bağlantı var" })
        TehditKaynagi.veritabani = null
        val t = DosyaDenetleyici.denetle("hesap.pdf", { pdf.inputStream() })
        assertTrue(t.bulgular.none { it.baslik == "Dosyada bilinen zararlı bağlantı var" })
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

    @Test fun yukluUygulamaParmakIziListede() {
        val iz = "b".repeat(64)
        val v = TehditVeritabani.ayristir(null, null, null, "# apk\n$iz\n", 1L)
        val u = UygulamaDegerlendirici.UygulamaBilgisi(
            paket = "com.sahte.kargo", ad = "Kargo Takip", sistemUygulamasi = false,
            yukleyen = "com.android.vending", hedefSdk = 34, izinler = emptyMap(), sha256 = iz.uppercase(),
        )
        assertTrue(UygulamaDegerlendirici.degerlendir(u).bulgular.none { it.baslik == "Bilinen zararlı yazılım" })
        TehditKaynagi.veritabani = v
        val s = UygulamaDegerlendirici.degerlendir(u)
        assertEquals(Seviye.KIRMIZI, s.seviye)
        assertEquals("Bilinen zararlı yazılım", s.bulgular.first().baslik)
        // Parmak izi farklıysa eşleşme yok.
        assertTrue(UygulamaDegerlendirici.degerlendir(u.copy(sha256 = "c".repeat(64))).bulgular.none { it.baslik == "Bilinen zararlı yazılım" })
    }

    @Test fun ortakHizmetinAltAlanAdiEngellenir() {
        val v = TehditVeritabani.ayristir(
            null, "0.0.0.0 sahte-banka.duckdns.org\n0.0.0.0 duckdns.org\n0.0.0.0 www.blogspot.com\n",
            "ziraat-onay.vercel.app\nis.gd\n1fichier.com\nhttps://is.gd/abc123\n", null, 1L,
        )
        assertTrue(v.hostListede("sahte-banka.duckdns.org"))
        assertTrue(v.hostListede("ziraat-onay.vercel.app"))
        // Hizmetin kendisi, kısaltıcılar ve dosya paylaşım siteleri tümden engellenmez.
        assertTrue(!v.hostListede("duckdns.org"))
        assertTrue(!v.hostListede("baska.duckdns.org"))
        assertTrue(!v.hostListede("blogspot.com"))
        assertTrue(!v.hostListede("is.gd"))
        assertTrue(!v.hostListede("1fichier.com"))
        // Kısaltıcıdaki tam adres yine yakalanır.
        assertEquals("Bilinen zararlı bağlantı", v.baglantiBulgusu("https://is.gd/abc123", "is.gd")?.baslik)
    }

    @Test fun resmiSitelerListeyleEngellenemez() {
        val v = TehditVeritabani.ayristir(
            null, "0.0.0.0 ziraatbank.com.tr\n0.0.0.0 giris.turkiye.gov.tr\n0.0.0.0 google.com\n",
            "turkiye.gov.tr\nwww.whatsapp.com\n", null, 1L,
        )
        for (h in listOf("ziraatbank.com.tr", "www.ziraatbank.com.tr", "giris.turkiye.gov.tr", "turkiye.gov.tr", "google.com", "web.whatsapp.com")) {
            assertTrue(h, !v.hostListede(h))
            assertNull(h, v.baglantiBulgusu("https://$h/", h))
        }
        assertEquals(0, v.hostlar.size)
    }

    @Test fun ikiliBicimGidisDonus() {
        val b = java.io.ByteArrayOutputStream()
        vt.yaz(b)
        val g = TehditVeritabani.oku(b.toByteArray().inputStream())!!
        assertEquals(vt.kayitSayisi, g.kayitSayisi)
        assertTrue(g.hostListede("cdn.kotu-dagitim.example"))
        assertTrue("a".repeat(64) in g.hashler)
        assertNull(TehditVeritabani.oku("bozuk".toByteArray().inputStream()))
    }
}

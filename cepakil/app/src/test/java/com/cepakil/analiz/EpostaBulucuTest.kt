package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class EpostaBulucuTest {

    private fun apk(vararg dosyalar: Pair<String, ByteArray>): () -> java.io.InputStream {
        val c = ByteArrayOutputStream()
        ZipOutputStream(c).use { z -> dosyalar.forEach { (ad, veri) -> z.putNextEntry(ZipEntry(ad)); z.write(veri); z.closeEntry() } }
        val b = c.toByteArray()
        return { ByteArrayInputStream(b) }
    }

    @Test fun kendiAlanAdiVeGizlilikAdresiOnde() {
        val dex = "xx support@yalla.com yy privacy@yalla.com zz noreply@google.com sdk@applovin.com icon@2x.png".toByteArray()
        val s = EpostaBulucu.bul(listOf(apk("classes.dex" to dex)), "com.yalla.okey101yalla")
        assertEquals("privacy@yalla.com", s.first())
        assertTrue("support@yalla.com" in s)
        assertTrue(s.none { it.contains("google") || it.contains("applovin") })
    }

    @Test fun utf16KaynakTablosundanBulunur() {
        val arsc = "kvkk@ornekfirma.com.tr".toByteArray(Charsets.UTF_16LE)
        val s = EpostaBulucu.bul(listOf(apk("resources.arsc" to arsc)), "tr.com.ornekfirma.app")
        assertEquals(listOf("kvkk@ornekfirma.com.tr"), s)
    }

    @Test fun ilgisizDosyalarTaranmaz() {
        val s = EpostaBulucu.bul(listOf(apk("res/raw/notlar.bin" to "destek@firma.com".toByteArray())), "com.firma.app")
        assertTrue(s.isEmpty())
    }

    @Test fun gmailAdresiDeKabulAmaSonda() {
        val s = EpostaBulucu.sirala(listOf("oyun.destek@gmail.com", "info@firma.com"), "com.firma.oyun")
        assertEquals(listOf("info@firma.com", "oyun.destek@gmail.com"), s)
    }

    @Test fun rastgeleKodParcalariElenir() {
        // Şifrelenmiş koddan gelen anlamsız parçalar ve ilgisiz kişisel adresler önerilmez.
        assertTrue(EpostaBulucu.sirala(listOf("n@y.tc", "ab@c.de", "john.smith@randomlib.com"), "com.yalla.okey101yalla").isEmpty())
    }

    @Test fun ornekVeKutuphaneAdresleriElenir() {
        assertTrue(EpostaBulucu.sirala(listOf("user@example.com", "a@sentry.io", "dev@firebase.google.com"), "com.x.y").isEmpty())
    }
}

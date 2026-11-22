package com.cepakil.analiz

/**
 * Web koruması için en küçük DNS/IPv4/UDP işleme kodu (telefondaki yerel VPN kullanır).
 *
 * Yerel VPN yalnız DNS sorgularını (hangi siteye gidileceği sorusunu) yakalar; sitelerin
 * içeriğine, şifreli trafiğe ya da diğer bağlantılara dokunmaz. Zararlı listede olan bir
 * alan adı sorulursa "böyle bir site yok" (NXDOMAIN) yanıtı verilir; diğerleri gerçek DNS
 * sunucusuna iletilir.
 */
object DnsPaketi {

    data class Udp(val kaynakIp: ByteArray, val hedefIp: ByteArray, val kaynakPort: Int, val hedefPort: Int, val veri: ByteArray)

    private fun u16(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)

    /** IPv4 + UDP paketini çözer; başka bir şeyse null. */
    fun ipv4UdpCoz(p: ByteArray, uzunluk: Int = p.size): Udp? {
        if (uzunluk < 28) return null
        val surum = (p[0].toInt() and 0xF0) shr 4
        if (surum != 4) return null
        val ihl = (p[0].toInt() and 0x0F) * 4
        if (ihl < 20 || uzunluk < ihl + 8) return null
        if ((p[9].toInt() and 0xFF) != 17) return null // UDP değil
        val toplam = u16(p, 2).coerceAtMost(uzunluk)
        val udpUzunluk = u16(p, ihl + 4)
        val veriBas = ihl + 8
        val veriSon = minOf(toplam, ihl + udpUzunluk)
        if (veriSon < veriBas) return null
        return Udp(
            p.copyOfRange(12, 16), p.copyOfRange(16, 20),
            u16(p, ihl), u16(p, ihl + 2),
            p.copyOfRange(veriBas, veriSon),
        )
    }

    /** DNS sorgusundaki ilk alan adını okur ("www.ornek.com"). */
    fun sorguAdi(dns: ByteArray): String? {
        if (dns.size < 17) return null
        if ((dns[2].toInt() and 0x80) != 0) return null // yanıt, sorgu değil
        if (u16(dns, 4) < 1) return null
        val parcalar = mutableListOf<String>()
        var i = 12
        while (i < dns.size) {
            val n = dns[i].toInt() and 0xFF
            if (n == 0) break
            if (n > 63 || i + 1 + n > dns.size) return null
            parcalar += String(dns, i + 1, n, Charsets.US_ASCII)
            i += 1 + n
            if (parcalar.size > 127) return null
        }
        return parcalar.joinToString(".").lowercase().takeIf { it.isNotEmpty() }
    }

    /** Sorguya "böyle bir alan adı yok" (NXDOMAIN) yanıtı üretir. */
    fun nxdomain(sorgu: ByteArray): ByteArray {
        // Yalnız başlık + soru bölümü korunur; yanıt/ek kayıt sayıları sıfırlanır.
        var i = 12
        while (i < sorgu.size && (sorgu[i].toInt() and 0xFF) != 0) i += 1 + (sorgu[i].toInt() and 0xFF)
        val soruSonu = minOf(sorgu.size, i + 1 + 4)
        val y = sorgu.copyOfRange(0, soruSonu)
        // QR=1 (yanıt); işlem kodu ve RD (özyineleme) bitleri korunur.
        y[2] = ((0x80) or (sorgu[2].toInt() and 0x78) or (sorgu[2].toInt() and 0x01)).toByte()
        y[3] = (0x80 or 0x03).toByte() // RA=1, RCODE=3 (NXDOMAIN)
        y[4] = 0; y[5] = 1 // QDCOUNT=1
        for (k in 6..11) y[k] = 0
        return y
    }

    /** UDP verisini IPv4 paketine sarar (sağlama toplamları dahil). */
    fun ipv4UdpPaketle(kaynakIp: ByteArray, hedefIp: ByteArray, kaynakPort: Int, hedefPort: Int, veri: ByteArray): ByteArray {
        val toplam = 20 + 8 + veri.size
        val p = ByteArray(toplam)
        p[0] = 0x45; p[1] = 0
        p[2] = (toplam shr 8).toByte(); p[3] = toplam.toByte()
        p[4] = 0; p[5] = 0; p[6] = 0x40; p[7] = 0 // DF
        p[8] = 64; p[9] = 17
        System.arraycopy(kaynakIp, 0, p, 12, 4)
        System.arraycopy(hedefIp, 0, p, 16, 4)
        val ipSaglama = saglama(p, 0, 20)
        p[10] = (ipSaglama shr 8).toByte(); p[11] = ipSaglama.toByte()
        p[20] = (kaynakPort shr 8).toByte(); p[21] = kaynakPort.toByte()
        p[22] = (hedefPort shr 8).toByte(); p[23] = hedefPort.toByte()
        val udpUz = 8 + veri.size
        p[24] = (udpUz shr 8).toByte(); p[25] = udpUz.toByte()
        p[26] = 0; p[27] = 0 // IPv4'te UDP sağlaması isteğe bağlı (0 = yok)
        System.arraycopy(veri, 0, p, 28, veri.size)
        return p
    }

    fun saglama(b: ByteArray, bas: Int, uz: Int): Int {
        var t = 0L
        var i = bas
        while (i + 1 < bas + uz) { t += u16(b, i); i += 2 }
        if (i < bas + uz) t += (b[i].toInt() and 0xFF) shl 8
        while (t shr 16 != 0L) t = (t and 0xFFFF) + (t shr 16)
        return (t.inv() and 0xFFFF).toInt()
    }
}

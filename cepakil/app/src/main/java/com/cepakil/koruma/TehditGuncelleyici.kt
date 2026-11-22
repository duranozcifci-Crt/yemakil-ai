package com.cepakil.koruma

import android.content.Context
import com.cepakil.analiz.TehditKaynagi
import com.cepakil.analiz.TehditVeritabani
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Herkese açık tehdit listelerini indirir ve telefonda saklar.
 *
 * İnternete YALNIZ bu dört adres için çıkılır ve hiçbir kullanıcı verisi gönderilmez
 * (istekler yalnız listeyi ister; adres, dosya, uygulama bilgisi eklenmez).
 */
object TehditGuncelleyici {

    private data class Kaynak(val dosya: String, val adres: String)

    private val kaynaklar = listOf(
        Kaynak("urlhaus_url.txt", "https://urlhaus.abuse.ch/downloads/text_online/"),
        Kaynak("urlhaus_host.txt", "https://urlhaus.abuse.ch/downloads/hostfile/"),
        Kaynak("openphish.txt", "https://openphish.com/feed.txt"),
        Kaynak("bazaar_sha256.txt", "https://bazaar.abuse.ch/export/txt/sha256/recent/"),
    )
    private const val AZAMI_BOYUT = 25L * 1024 * 1024

    private fun klasor(context: Context) = File(context.filesDir, "tehdit").apply { mkdirs() }

    /** Telefondaki kopyayı belleğe yükler (yoksa sessizce geçer). Arka planda çağrılmalı. */
    @Synchronized
    fun yukle(context: Context, zorla: Boolean = false) {
        if (!zorla && TehditKaynagi.veritabani != null) return
        val k = klasor(context)
        fun oku(ad: String) = File(k, ad).takeIf { it.exists() }?.readText()
        if (kaynaklar.none { File(k, it.dosya).exists() }) return
        TehditKaynagi.veritabani = TehditVeritabani.ayristir(
            oku("urlhaus_url.txt"), oku("urlhaus_host.txt"), oku("openphish.txt"), oku("bazaar_sha256.txt"),
            KorumaAyarlari(context).sonGuncelleme,
        )
    }

    /** Listeleri indirir. En az biri başarılıysa true. Arka planda çağrılmalı. */
    fun indir(context: Context): Boolean {
        val k = klasor(context)
        var basarili = 0
        for (s in kaynaklar) {
            try {
                val c = (URL(s.adres).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 20_000; readTimeout = 60_000
                    setRequestProperty("User-Agent", "CepAkil-Android")
                }
                if (c.responseCode == 200) {
                    val gecici = File(k, s.dosya + ".tmp")
                    c.inputStream.use { giris ->
                        gecici.outputStream().use { cikis ->
                            val tampon = ByteArray(64 * 1024)
                            var toplam = 0L
                            while (true) {
                                val n = giris.read(tampon)
                                if (n < 0) break
                                toplam += n
                                if (toplam > AZAMI_BOYUT) error("liste çok büyük")
                                cikis.write(tampon, 0, n)
                            }
                        }
                    }
                    gecici.renameTo(File(k, s.dosya))
                    basarili++
                }
                c.disconnect()
            } catch (_: Exception) {
                // Bu kaynak indirilemedi; eski kopyası (varsa) kullanılmaya devam eder.
            }
        }
        if (basarili > 0) {
            KorumaAyarlari(context).sonGuncelleme = System.currentTimeMillis()
            yukle(context, zorla = true)
        }
        return basarili > 0
    }
}

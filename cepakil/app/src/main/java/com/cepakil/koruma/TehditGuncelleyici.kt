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

    /** Her kaynak için sırayla denenen adresler (ilk çalışan kullanılır). Hepsi anahtarsız ve herkese açık. */
    private data class Kaynak(val dosya: String, val adresler: List<String>)

    private val kaynaklar = listOf(
        // USOM: Türkiye Ulusal Siber Olaylara Müdahale Merkezi'nin zararlı bağlantı listesi (Türkiye'yi hedefleyen sahte siteler).
        Kaynak("usom.txt", listOf(
            "https://www.usom.gov.tr/url-list.txt",
            "https://raw.githubusercontent.com/elliotwutingfeng/USOM-Blocklists/main/urls.txt",
        )),
        // OpenPhish: güncel kimlik avı (sahte giriş) sayfaları.
        Kaynak("openphish.txt", listOf("https://openphish.com/feed.txt")),
        // URLhaus (abuse.ch) zararlı yazılım sunucuları; malware-filter projesinin herkese açık kopyası, günde iki kez.
        Kaynak("urlhaus_host.txt", listOf(
            "https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-hosts.txt",
            "https://urlhaus-filter.pages.dev/urlhaus-filter-hosts.txt",
            "https://curbengh.github.io/malware-filter/urlhaus-filter-hosts.txt",
        )),
        // Kimlik avı sunucuları (OpenPhish + IPThreat derlemesi), aynı projeden.
        Kaynak("phishing_host.txt", listOf(
            "https://malware-filter.gitlab.io/malware-filter/phishing-filter-hosts.txt",
            "https://phishing-filter.pages.dev/phishing-filter-hosts.txt",
            "https://curbengh.github.io/phishing-filter/phishing-filter-hosts.txt",
        )),
        // Bildirilmiş zararlı Android uygulamalarının SHA-256 parmak izleri. MalwareBazaar üyelik anahtarı
        // istediği için CepAkıl'ın kendi GitHub görevi (cepakil-veri.yml) her gün indirip herkese açık yayınlar;
        // anahtar uygulamaya konmaz.
        Kaynak("apk_sha256.txt", listOf(
            "https://raw.githubusercontent.com/duranozcifci-Crt/yemakil-ai/cepakil-veri/apk_sha256.txt",
        )),
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
            null,
            listOfNotNull(oku("urlhaus_host.txt"), oku("phishing_host.txt")).joinToString("\n"),
            listOfNotNull(oku("openphish.txt"), oku("usom.txt")).joinToString("\n"),
            oku("apk_sha256.txt"),
            KorumaAyarlari(context).sonGuncelleme,
        )
    }

    /** Listeleri indirir. En az biri başarılıysa true. Arka planda çağrılmalı. */
    fun indir(context: Context): Boolean {
        val k = klasor(context)
        var basarili = 0
        for (s in kaynaklar) {
            for (adres in s.adresler) {
                if (indirDosya(adres, File(k, s.dosya + ".tmp"))) {
                    File(k, s.dosya + ".tmp").renameTo(File(k, s.dosya))
                    basarili++
                    break
                }
            }
        }
        if (basarili > 0) {
            KorumaAyarlari(context).sonGuncelleme = System.currentTimeMillis()
            yukle(context, zorla = true)
        }
        return basarili > 0
    }

    /** Tek adresi indirir; boyut sınırı ve "gerçekten metin liste mi" denetimiyle. */
    private fun indirDosya(adres: String, hedef: File): Boolean {
      return try {
        val c = (URL(adres).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000; readTimeout = 60_000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "CepAkil-Android")
        }
        try {
            if (c.responseCode != 200) return false
            var toplam = 0L
            c.inputStream.use { giris ->
                hedef.outputStream().use { cikis ->
                    val tampon = ByteArray(64 * 1024)
                    while (true) {
                        val n = giris.read(tampon)
                        if (n < 0) break
                        toplam += n
                        if (toplam > AZAMI_BOYUT) error("liste çok büyük")
                        cikis.write(tampon, 0, n)
                    }
                }
            }
            // Boş yanıt ya da bir HTML sayfası (ör. otel/kafe Wi-Fi giriş sayfası) liste sayılmaz.
            val bas = hedef.inputStream().use { i -> ByteArray(256).let { b -> String(b, 0, maxOf(0, i.read(b))) } }.trimStart()
            val gecerli = toplam > 20 && !bas.startsWith("<")
            if (!gecerli) hedef.delete()
            gecerli
        } finally { c.disconnect() }
    } catch (_: Exception) {
        hedef.delete(); false
    }
    }
}

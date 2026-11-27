package com.cepakil.koruma

import android.content.Context
import android.os.Build
import java.net.HttpURLConnection
import java.net.URL

/**
 * Yeni CepAkıl sürümü var mı? Derleme sisteminin yayınladığı küçük bir metin dosyasına
 * (durum.txt: "<commit> success 0.2.<numara>") bakar. Hiçbir bilgi gönderilmez.
 * İndirme tarayıcıda yapılır; kurulumu her zaman Android sana sorar.
 */
object Guncelleme {
    private const val KOK = "https://raw.githubusercontent.com/duranozcifci-Crt/yemakil-ai/cepakil-cikti"
    const val APK_ADRESI = "$KOK/CepAkil.apk"

    fun yukluSurum(context: Context): Int = try {
        val pi = context.packageManager.getPackageInfo(context.packageName, 0)
        if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode.toInt() else @Suppress("DEPRECATION") pi.versionCode
    } catch (_: Exception) { 0 }

    /** "<sha> success 0.2.58" → 58; başarısız derleme ya da bozuk metin → null. (Saf işlev; testlenir.) */
    fun surumCoz(metin: String): Int? {
        val p = metin.trim().split(Regex("\\s+"))
        if (p.size < 3 || p[1] != "success") return null
        return p[2].substringAfterLast('.').toIntOrNull()?.takeIf { it in 1..1_000_000 }
    }

    /** Yayındaki sürümü okur ve saklar. Yüklü olandan yeniyse numarasını döndürür. Arka planda çağrılmalı. */
    fun denetle(context: Context): Int? = try {
        val c = (URL("$KOK/durum.txt").openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000; readTimeout = 15_000
            setRequestProperty("User-Agent", "CepAkil-Android")
        }
        try {
            if (c.responseCode != 200) null else {
                val surum = surumCoz(c.inputStream.bufferedReader().use { it.readText().take(200) })
                if (surum != null) KorumaAyarlari(context).yayindakiSurum = surum
                surum?.takeIf { it > yukluSurum(context) }
            }
        } finally { c.disconnect() }
    } catch (_: Exception) { null }

    /** Daha önce okunmuş bilgiye göre yeni sürüm var mı? (Ağa çıkmaz.) */
    fun bekleyenSurum(context: Context): Int? =
        KorumaAyarlari(context).yayindakiSurum.takeIf { it > yukluSurum(context) }
}

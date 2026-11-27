package com.cepakil.koruma

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.analiz.YeniUygulamaTakibi
import com.cepakil.veri.UygulamaKaynagi
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Günde bir tehdit listelerini günceller (yalnız internet varken). */
class TehditIsi(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {
    companion object { const val ZORLA = "zorla" }
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val a = KorumaAyarlari(ctx)
        if (!a.tehditListeleri) return Result.success()
        // Mobil veride (kotalı bağlantıda) günlük indirme yapılmaz; liste 3 günden eskiyse yine de indirilir.
        val zorla = inputData.getBoolean(ZORLA, false)
        val yas = System.currentTimeMillis() - a.sonGuncelleme
        val cm = ctx.getSystemService(android.net.ConnectivityManager::class.java)
        if (!zorla && cm?.isActiveNetworkMetered == true && a.sonGuncelleme != 0L && yas < 3L * 24 * 3600 * 1000) return Result.success()
        if (!TehditGuncelleyici.indir(ctx)) return Result.retry()
        // Yeni CepAkıl sürümü çıkmış mı? (Küçük bir metin dosyası okunur.)
        Guncelleme.denetle(ctx)?.let { s -> if (a.bildirilenSurum != s) { a.bildirilenSurum = s; Bildirimler.yeniSurum(ctx, s) } }
        // Liste yenilendi: önceden yüklü bir uygulama artık bilinen zararlılar arasında mı?
        if (a.anlikKoruma) {
            val hashler = com.cepakil.analiz.TehditKaynagi.veritabani?.hashler
            if (hashler != null && hashler.isNotEmpty()) {
                val p = ctx.getSharedPreferences("koruma", Context.MODE_PRIVATE)
                val bildirilen = p.getStringSet("zararli_bildirilen", emptySet()).orEmpty()
                UygulamaKaynagi(ctx).tumUygulamalar(sistemDahil = false)
                    .filter { it.sha256 != null && it.sha256 in hashler && it.sha256 !in bildirilen }
                    .forEach { u ->
                        Bildirimler.uygulamaUyarisi(ctx, u.paket, u.ad, true, "Bilinen zararlı yazılım listesinde. Hemen kaldır.")
                        p.edit().putStringSet("zararli_bildirilen", p.getStringSet("zararli_bildirilen", emptySet()).orEmpty() + u.sha256!!).apply()
                    }
            }
        }
        return Result.success()
    }
}

/**
 * Anlık koruma: yaklaşık 15 dakikada bir (Android'in izin verdiği en sık aralık) yeni yüklenen
 * ya da güncellenen uygulamaları değerlendirir; riskliyse bildirim gönderir. Uygulamalarda
 * değişiklik yoksa hiçbir şey okumaz (pil dostu).
 */
class KorumaIsi(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        if (!KorumaAyarlari(ctx).anlikKoruma) return Result.success()
        val kaynak = UygulamaKaynagi(ctx)
        if (!kaynak.degisiklikVarMi("koruma")) return Result.success()
        TehditGuncelleyici.yukle(ctx)
        val liste = kaynak.tumUygulamalar(sistemDahil = false)
        val simdiki = liste.associate { it.paket to YeniUygulamaTakibi.izCikar(it) }
        val p = ctx.getSharedPreferences("koruma", Context.MODE_PRIVATE)
        val onceki = p.getString("koruma_izi", null)?.let { izOku(it) }
        if (onceki != null) {
            val bilgiler = liste.associateBy { it.paket }
            YeniUygulamaTakibi.karsilastir(onceki, simdiki).forEach { d ->
                val b = bilgiler[d.paket] ?: return@forEach
                val s = UygulamaDegerlendirici.degerlendir(b)
                if (s.seviye == Seviye.KIRMIZI || s.seviye == Seviye.SARI) {
                    val neden = when (d.tur) {
                        YeniUygulamaTakibi.Tur.YENI -> "Yeni yüklendi: " + s.bulgular.first().baslik
                        YeniUygulamaTakibi.Tur.YENI_IZIN -> "Güncellemeyle yeni izin: " + YeniUygulamaTakibi.izinGruplari(d.yeniIzinler)
                    }
                    Bildirimler.uygulamaUyarisi(ctx, b.paket, b.ad, s.seviye == Seviye.KIRMIZI, neden)
                }
            }
        }
        p.edit().putString("koruma_izi", izYaz(simdiki)).apply()
        return Result.success()
    }

    private fun izYaz(iz: Map<String, YeniUygulamaTakibi.Iz>): String {
        val o = JSONObject()
        iz.forEach { (k, v) -> o.put(k, JSONArray().put(v.guncelleme).put(JSONArray(v.hassasIzinler.toList()))) }
        return o.toString()
    }

    private fun izOku(m: String): Map<String, YeniUygulamaTakibi.Iz>? = try {
        val o = JSONObject(m)
        o.keys().asSequence().associateWith { k ->
            val a = o.getJSONArray(k)
            val iz = a.getJSONArray(1)
            YeniUygulamaTakibi.Iz(a.getLong(0), (0 until iz.length()).map { iz.getString(it) }.toSet())
        }
    } catch (_: Exception) { null }
}

/**
 * Haftalık kontrol: tam taramayı arka planda yapar, sonucu kaydeder ve incelenecek konu varsa
 * tek bir hatırlatma bildirimi gönderir. Hiçbir şey silinmez ya da değiştirilmez.
 */
class HaftalikIsi(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        if (!KorumaAyarlari(ctx).haftalikKontrol) return Result.success()
        return try {
            TehditGuncelleyici.yukle(ctx)
            val kayit = com.cepakil.veri.Tarayici.tara(ctx)
            com.cepakil.veri.TaramaDeposu(ctx).kaydet(kayit)
            val seviyeler = kayit.cihazBulgulari.map { it.seviye } + kayit.uygulamalar.map { it.seviye }
            val kirmizi = seviyeler.count { it == Seviye.KIRMIZI }
            val sari = seviyeler.count { it == Seviye.SARI }
            if (kirmizi + sari > 0) Bildirimler.haftalikOzet(ctx, kirmizi, sari)
            Result.success()
        } catch (_: Exception) { Result.success() }
    }
}

/** Arka plan işlerini ayarlara göre kurar ya da kaldırır. */
object Planlayici {
    fun uygula(context: Context) {
        val wm = WorkManager.getInstance(context)
        val a = KorumaAyarlari(context)
        if (a.tehditListeleri) {
            wm.enqueueUniquePeriodicWork(
                "tehdit", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<TehditIsi>(1, TimeUnit.DAYS)
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                    .build(),
            )
        } else wm.cancelUniqueWork("tehdit")
        if (a.anlikKoruma) {
            wm.enqueueUniquePeriodicWork(
                "koruma", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<KorumaIsi>(15, TimeUnit.MINUTES).build(),
            )
        } else wm.cancelUniqueWork("koruma")
        if (a.haftalikKontrol) {
            wm.enqueueUniquePeriodicWork(
                "haftalik", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<HaftalikIsi>(7, TimeUnit.DAYS).setInitialDelay(7, TimeUnit.DAYS).build(),
            )
        } else wm.cancelUniqueWork("haftalik")
    }

    /** Yeni bir uygulama yüklendiğinde (web koruması açıkken anında haber alınır) hemen değerlendir. */
    fun korumayiSimdiCalistir(context: Context) {
        if (!KorumaAyarlari(context).anlikKoruma) return
        WorkManager.getInstance(context).enqueueUniqueWork(
            "koruma_simdi", androidx.work.ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<KorumaIsi>().setInitialDelay(5, TimeUnit.SECONDS).build(),
        )
    }

    /** "Şimdi güncelle" düğmesi ve ilk açılış için tek seferlik güncelleme. */
    fun simdiGuncelle(context: Context) {
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<TehditIsi>()
                .setInputData(androidx.work.workDataOf(TehditIsi.ZORLA to true))
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build(),
        )
    }
}

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
    override suspend fun doWork(): Result {
        if (!KorumaAyarlari(applicationContext).tehditListeleri) return Result.success()
        return if (TehditGuncelleyici.indir(applicationContext)) Result.success() else Result.retry()
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
    }

    /** "Şimdi güncelle" düğmesi ve ilk açılış için tek seferlik güncelleme. */
    fun simdiGuncelle(context: Context) {
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<TehditIsi>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build(),
        )
    }
}

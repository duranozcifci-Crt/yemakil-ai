package com.cepakil.koruma

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.cepakil.MainActivity
import com.cepakil.R

/** CepAkıl'ın gönderdiği uyarı bildirimleri. */
object Bildirimler {
    const val KANAL_UYGULAMA = "uygulama"
    const val KANAL_WEB = "web"
    const val KANAL_DURUM = "durum"
    const val KANAL_GENEL = "genel"
    const val KALICI_ID = 4101
    const val EK_PAKET = "cepakil.paket"

    fun kanallariKur(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(KANAL_UYGULAMA, "Riskli uygulama uyarıları", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Yeni yüklenen ya da güncellenen bir uygulama riskli göründüğünde"
        })
        nm.createNotificationChannel(NotificationChannel(KANAL_WEB, "Engellenen siteler", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Web koruması zararlı bir siteyi engellediğinde"
        })
        nm.createNotificationChannel(NotificationChannel(KANAL_DURUM, "Web koruması açık", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Web koruması çalışırken görünen sabit bildirim (kapatabilirsin; koruma çalışmaya devam eder)"
            setShowBadge(false)
        })
        nm.createNotificationChannel(NotificationChannel(KANAL_GENEL, "Hatırlatmalar ve yeni sürüm", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Haftalık kontrol sonucu ve yeni CepAkıl sürümü"
        })
    }

    fun izinVarMi(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun ac(context: Context, istek: Int, ekle: Intent.() -> Unit): PendingIntent {
        val i = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP).apply(ekle)
        return PendingIntent.getActivity(context, istek, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun gonder(context: Context, id: Int, b: NotificationCompat.Builder) {
        if (!izinVarMi(context)) return
        try { NotificationManagerCompat.from(context).notify(id, b.build()) } catch (_: SecurityException) { }
    }

    fun uygulamaUyarisi(context: Context, paket: String, ad: String, kirmizi: Boolean, neden: String) {
        kanallariKur(context)
        val b = NotificationCompat.Builder(context, KANAL_UYGULAMA)
            .setSmallIcon(R.drawable.ic_bildirim)
            .setContentTitle(if (kirmizi) "Riskli uygulama: $ad" else "İncelemen önerilir: $ad")
            .setContentText(neden)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$neden\nAyrıntılar ve kaldırma için dokun."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(ac(context, paket.hashCode()) { putExtra(EK_PAKET, paket) })
        gonder(context, paket.hashCode(), b)
    }

    fun siteEngellendi(context: Context, host: String) {
        kanallariKur(context)
        val izin = PendingIntent.getBroadcast(
            context, host.hashCode(),
            Intent(context, IzinVerAlici::class.java).putExtra(IzinVerAlici.EK_HOST, host),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val b = NotificationCompat.Builder(context, KANAL_WEB)
            .setSmallIcon(R.drawable.ic_bildirim)
            .setContentTitle("Zararlı site engellendi")
            .setContentText(host)
            .setStyle(NotificationCompat.BigTextStyle().bigText("\"$host\" tehdit listelerinde ya da sahte site kurallarında olduğu için açılması engellendi."))
            .setAutoCancel(true)
            .addAction(0, "Bu siteye izin ver", izin)
        gonder(context, 7000 + (host.hashCode() and 0x3FF), b)
    }

    /** Web koruması çalışırken gösterilen sabit bildirim (Android, sürekli çalışan hizmetler için ister). */
    fun webKorumasiAcik(context: Context): android.app.Notification {
        kanallariKur(context)
        return NotificationCompat.Builder(context, KANAL_DURUM)
            .setSmallIcon(R.drawable.ic_bildirim)
            .setContentTitle("Web koruması açık")
            .setContentText("Zararlı ve sahte siteler engelleniyor.")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(ac(context, KALICI_ID) { })
            .build()
    }

    fun haftalikOzet(context: Context, kirmizi: Int, sari: Int) {
        kanallariKur(context)
        val metin = listOfNotNull(
            "$kirmizi öncelikli".takeIf { kirmizi > 0 }, "$sari incelenecek".takeIf { sari > 0 },
        ).joinToString(", ") + " konu var. Ayrıntılar için dokun."
        val b = NotificationCompat.Builder(context, KANAL_GENEL)
            .setSmallIcon(R.drawable.ic_bildirim)
            .setContentTitle("Haftalık güvenlik kontrolü")
            .setContentText(metin)
            .setAutoCancel(true)
            .setContentIntent(ac(context, 4102) { })
        gonder(context, 4102, b)
    }

    fun yeniSurum(context: Context, surum: Int) {
        kanallariKur(context)
        val b = NotificationCompat.Builder(context, KANAL_GENEL)
            .setSmallIcon(R.drawable.ic_bildirim)
            .setContentTitle("CepAkıl'ın yeni sürümü var (0.2.$surum)")
            .setContentText("İndirmek için CepAkıl'ı aç.")
            .setAutoCancel(true)
            .setContentIntent(ac(context, 4103) { })
        gonder(context, 4103, b)
    }
}

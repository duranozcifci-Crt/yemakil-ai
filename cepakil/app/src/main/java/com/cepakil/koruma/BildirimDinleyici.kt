package com.cepakil.koruma

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.provider.Telephony
import com.cepakil.analiz.MesajDenetleyici
import com.cepakil.analiz.Seviye
import java.util.concurrent.Executors

/**
 * Gelen mesaj bildirimlerini (SMS, WhatsApp, e-posta…) dolandırıcılık kalıplarına göre
 * TELEFONDA denetler. Kullanıcı Ayarlar > Bildirim erişimi'nden açarsa çalışır.
 *
 * Gizlilik: Bildirim metni yalnız bellekte incelenir; saklanmaz, hiçbir yere gönderilmez.
 * Yalnız riskli bulunursa kullanıcıya bir uyarı bildirimi gösterilir.
 */
class BildirimDinleyici : NotificationListenerService() {

    private val isci = Executors.newSingleThreadExecutor()
    /** Aynı mesaj için tekrar tekrar uyarı verilmesin (yalnız özetler, bellekte). */
    private val sonGorulenler = ArrayDeque<Int>()

    private val mesajUygulamalari = setOf(
        "com.whatsapp", "com.whatsapp.w4b", "org.telegram.messenger", "org.thoughtcrime.securesms",
        "com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms",
        "com.google.android.gm", "com.microsoft.office.outlook", "com.facebook.orca", "com.instagram.android",
        "com.viber.voip", "jp.naver.line.android", "com.discord", "com.turkcell.bip", "com.yahoo.mobile.client.android.mail",
        "com.samsung.android.email.provider", "ru.yandex.mail",
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
        if (!KorumaAyarlari(this).mesajTarama) return
        val n = sbn.notification ?: return
        val varsayilanSms = try { Telephony.Sms.getDefaultSmsPackage(this) } catch (_: Exception) { null }
        val mesajMi = sbn.packageName in mesajUygulamalari || sbn.packageName == varsayilanSms ||
            n.category == Notification.CATEGORY_MESSAGE || n.category == Notification.CATEGORY_EMAIL
        if (!mesajMi) return
        val e = n.extras ?: return
        val metin = listOfNotNull(
            e.getCharSequence(Notification.EXTRA_TITLE),
            e.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: e.getCharSequence(Notification.EXTRA_TEXT),
        ).joinToString("\n").trim()
        if (metin.length < 12) return
        val ozetKod = metin.hashCode()
        synchronized(sonGorulenler) {
            if (ozetKod in sonGorulenler) return
            sonGorulenler.addLast(ozetKod)
            while (sonGorulenler.size > 50) sonGorulenler.removeFirst()
        }
        val kaynak = try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
        } catch (_: Exception) { sbn.packageName }
        isci.execute {
            try {
                TehditGuncelleyici.yukle(this)
                val s = MesajDenetleyici.denetle(metin)
                val riskli = s.seviye == Seviye.KIRMIZI || (s.seviye == Seviye.SARI && s.baglantilar.isNotEmpty())
                if (riskli) {
                    val a = KorumaAyarlari(this)
                    a.yakalananMesajSayisi = a.yakalananMesajSayisi + 1
                    Bildirimler.mesajUyarisi(this, kaynak, metin, s.bulgular.firstOrNull()?.baslik ?: s.ozet)
                }
            } catch (_: Exception) { }
        }
    }

    override fun onDestroy() {
        isci.shutdownNow()
        super.onDestroy()
    }
}

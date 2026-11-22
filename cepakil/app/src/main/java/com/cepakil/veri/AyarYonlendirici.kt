package com.cepakil.veri

import android.app.admin.DevicePolicyManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/**
 * Kullanıcıyı ilgili Android ayar ekranına götürür. CepAkıl hiçbir ayarı
 * kendisi değiştirmez, hiçbir uygulamayı silmez ya da devre dışı bırakmaz:
 * son kararı her zaman kullanıcı Android'in kendi ekranında verir.
 *
 * Üreticiler bazı ekranları kaldırabildiği için her hedefin bir yedek yolu
 * vardır; hiçbiri açılmazsa genel Ayarlar açılır.
 */
object AyarYonlendirici {

    /** Sırayla dener; biri açılırsa true. */
    fun ac(context: Context, vararg adaylar: Intent): Boolean {
        for (i in adaylar.toList() + Intent(Settings.ACTION_SETTINGS)) {
            try {
                context.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return true
            } catch (e: ActivityNotFoundException) {
                continue
            } catch (e: SecurityException) {
                continue
            }
        }
        return false
    }

    fun uygulamaAyarlari(context: Context, paket: String) = ac(
        context,
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", paket, null)),
        Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS),
    )

    fun ekranKilidi(context: Context) = ac(
        context,
        Intent(DevicePolicyManager.ACTION_SET_NEW_PASSWORD),
        Intent(Settings.ACTION_SECURITY_SETTINGS),
    )

    fun guvenlik(context: Context) = ac(context, Intent(Settings.ACTION_SECURITY_SETTINGS))

    fun sistemGuncelleme(context: Context) = ac(
        context,
        Intent("android.settings.SYSTEM_UPDATE_SETTINGS"),
        Intent(Settings.ACTION_DEVICE_INFO_SETTINGS),
    )

    /** Google Play'i açar; güncellemeler "Profil > Uygulamaları ve cihazı yönet" altındadır. */
    fun uygulamaGuncellemeleri(context: Context): Boolean {
        val play = context.packageManager.getLaunchIntentForPackage("com.android.vending")
        return if (play != null) ac(context, play) else ac(context, Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS))
    }

    fun bilinmeyenKaynaklar(context: Context) = ac(
        context,
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES),
        Intent(Settings.ACTION_SECURITY_SETTINGS),
    )

    fun erisilebilirlik(context: Context) = ac(context, Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))

    fun cihazYoneticileri(context: Context) = ac(
        context,
        Intent().setComponent(ComponentName("com.android.settings", "com.android.settings.DeviceAdminSettings")),
        Intent(Settings.ACTION_SECURITY_SETTINGS),
    )

    fun bildirimErisimi(context: Context) = ac(context, Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))

    fun gelistiriciSecenekleri(context: Context) = ac(
        context,
        Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS),
        Intent(Settings.ACTION_DEVICE_INFO_SETTINGS),
    )

    /** Android'in kaldırma onay penceresini açar; kaldırma kararı kullanıcınındır. */
    fun kaldir(context: Context, paket: String) = ac(
        context,
        Intent(Intent.ACTION_DELETE, Uri.fromParts("package", paket, null)),
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", paket, null)),
    )

    /** Uygulamayı açar (ör. hesabını silmek için). Açılamazsa false. */
    fun uygulamayiAc(context: Context, paket: String): Boolean {
        val i = context.packageManager.getLaunchIntentForPackage(paket) ?: return false
        return try { context.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true } catch (e: Exception) { false }
    }

    fun playSayfasi(context: Context, paket: String) = ac(
        context,
        Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$paket")),
        Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$paket")),
    )

    /** Google Play "Veri güvenliği" sayfası: hesap açtıran uygulamaların hesap silme bağlantısı burada olur. */
    fun veriGuvenligiSayfasi(context: Context, paket: String) = ac(
        context,
        Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/datasafety?id=$paket")),
        Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$paket")),
    )

    /**
     * KVKK 11. madde kapsamında hazır bir veri silme talebi e-postası açar.
     * Gönderen kullanıcıdır; CepAkıl e-postayı kendisi göndermez.
     */
    fun silmeTalebiEpostasi(
        context: Context,
        uygulamaAdi: String,
        paket: String,
        alici: String = "",
        adSoyad: String = "",
        hesap: String = "",
    ): Boolean {
        val konu = "Kişisel verilerimin silinmesi talebi – $uygulamaAdi"
        val metin = """Merhaba,

$uygulamaAdi ($paket) uygulamasındaki hesabımın ve bana ait tüm kişisel verilerin silinmesini, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 7. ve 11. maddeleri (AB'de yerleşik şirketler için GDPR 17. madde) uyarınca talep ediyorum.

Hesabımda kayıtlı e-posta / telefon: ${hesap.ifBlank { "______________" }}

Silme işleminin tamamlandığını tarafıma yazılı olarak bildirmenizi rica ederim. Kanun gereği talebimin en geç 30 gün içinde sonuçlandırılması gerekmektedir.

Ad Soyad: ${adSoyad.ifBlank { "______________" }}
"""
        // Kullanıcı kendi e-postasını yazdıysa kopya (CC) ona da gider.
        val kopya = hesap.trim().takeIf { it.contains('@') && it.contains('.') }
        // Gmail gibi uygulamalar konu/metni ek bilgilerden değil, mailto bağlantısının içinden okur.
        val baglanti = buildString {
            append("mailto:").append(Uri.encode(alici.trim(), "@"))
            append("?subject=").append(Uri.encode(konu))
            append("&body=").append(Uri.encode(metin))
            if (kopya != null) append("&cc=").append(Uri.encode(kopya, "@"))
        }
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse(baglanti))
            .putExtra(Intent.EXTRA_EMAIL, if (alici.isBlank()) emptyArray() else arrayOf(alici.trim()))
            .putExtra(Intent.EXTRA_SUBJECT, konu)
            .putExtra(Intent.EXTRA_TEXT, metin)
            .apply { if (kopya != null) putExtra(Intent.EXTRA_CC, arrayOf(kopya)) }
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(i); true
        } catch (e: Exception) {
            try { context.startActivity(Intent.createChooser(i, "E-posta uygulaması seç").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true } catch (e2: Exception) { false }
        }
    }

    fun hesaplar(context: Context) = ac(context, Intent(Settings.ACTION_SYNC_SETTINGS))

    fun indirilenler(context: Context) = ac(context, Intent(android.app.DownloadManager.ACTION_VIEW_DOWNLOADS))

    fun gizlilik(context: Context) = ac(
        context,
        Intent("android.settings.PRIVACY_SETTINGS"),
        Intent(Settings.ACTION_SECURITY_SETTINGS),
    )
}

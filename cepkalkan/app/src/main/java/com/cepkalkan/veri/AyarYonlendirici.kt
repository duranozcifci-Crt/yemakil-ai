package com.cepkalkan.veri

import android.app.admin.DevicePolicyManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/**
 * Kullanıcıyı ilgili Android ayar ekranına götürür. CepKalkan hiçbir ayarı
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

    fun gizlilik(context: Context) = ac(
        context,
        Intent("android.settings.PRIVACY_SETTINGS"),
        Intent(Settings.ACTION_SECURITY_SETTINGS),
    )
}

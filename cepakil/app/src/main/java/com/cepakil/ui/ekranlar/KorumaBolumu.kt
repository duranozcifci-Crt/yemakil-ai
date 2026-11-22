package com.cepakil.ui.ekranlar

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.cepakil.analiz.TehditKaynagi
import com.cepakil.koruma.CepAkilVpn
import com.cepakil.koruma.KorumaAyarlari
import com.cepakil.koruma.Planlayici
import com.cepakil.koruma.TehditGuncelleyici
import com.cepakil.ui.bilesenler.Grup
import com.cepakil.ui.bilesenler.GrupAyraci
import com.cepakil.ui.bilesenler.IkincilDugme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Bildirim erişimi (mesaj taraması için) CepAkıl'a verilmiş mi? */
fun bildirimErisimiVar(context: Context): Boolean =
    NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

/**
 * Ayarlar > Koruma: dört güçlü özellik. Her biri kullanıcı açınca çalışır; açılırken neden izin
 * gerektiği yazılıdır. Durumlar ekran her öne geldiğinde yeniden okunur (ör. kullanıcı Android
 * ayarlarından bildirim erişimini verip geri döndüğünde).
 */
@Composable
fun KorumaBolumu() {
    val context = LocalContext.current
    val a = remember { KorumaAyarlari(context) }
    val kapsam = rememberCoroutineScope()
    var tazele by remember { mutableIntStateOf(0) }
    var guncelleniyor by remember { mutableStateOf(false) }
    var guncellemeSonucu by remember { mutableStateOf<String?>(null) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        // Kullanıcı Android ayarlarında bildirim erişimini verdiyse mesaj taramasını aç.
        if (bildirimErisimiVar(context) && !a.mesajTarama && bekleyenMesajIzni) { a.mesajTarama = true }
        bekleyenMesajIzni = false
        tazele++
    }
    if (tazele < 0) return // durum okumaları "tazele" değişince yeniden yapılır

    val bildirimIzni = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { tazele++ }
    fun bildirimIzniIste() {
        if (Build.VERSION.SDK_INT >= 33) bildirimIzni.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    val vpnIzni = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        if (r.resultCode == Activity.RESULT_OK) {
            a.webKoruma = true
            CepAkilVpn.baslat(context)
        }
        tazele++
    }

    val db = TehditKaynagi.veritabani
    val tehditDurumu = when {
        !a.tehditListeleri -> "Kapalı. Bağlantı ve dosya kontrolleri yalnız yazılış ve kod kurallarıyla yapılır."
        db == null || a.sonGuncelleme == 0L -> "Listeler henüz indirilmedi. İnternete bağlıyken birkaç dakika içinde indirilir."
        else -> "Son güncelleme: ${tarihYaz(a.sonGuncelleme)} · ${"%,d".format(db.kayitSayisi).replace(',', '.')} kayıt"
    }

    Grup {
        Anahtar(
            "Çevrimiçi tehdit veritabanı",
            "Herkese açık listeler (Türkiye'nin resmi USOM listesi, OpenPhish, URLhaus) günde bir telefona indirilir; " +
                "bağlantılar, mesajlar ve açtığın siteler bunlarla karşılaştırılır. Senin hiçbir verin gönderilmez.\n$tehditDurumu",
            a.tehditListeleri, "koruma_tehdit",
        ) { acik ->
            a.tehditListeleri = acik
            Planlayici.uygula(context)
            if (acik && a.sonGuncelleme == 0L) Planlayici.simdiGuncelle(context)
            tazele++
        }
        if (a.tehditListeleri) {
            Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp)) {
                IkincilDugme(if (guncelleniyor) "Güncelleniyor…" else "Şimdi güncelle", {
                    if (!guncelleniyor) {
                        guncelleniyor = true
                        guncellemeSonucu = null
                        kapsam.launch {
                            val ok = withContext(Dispatchers.IO) {
                                TehditGuncelleyici.indir(context).also { if (it) TehditGuncelleyici.yukle(context, zorla = true) }
                            }
                            guncellemeSonucu = if (ok) "Listeler güncellendi." else "Güncellenemedi. İnternet bağlantını kontrol edip yeniden dene."
                            guncelleniyor = false
                            tazele++
                        }
                    }
                }, ikon = Icons.Filled.Refresh)
                guncellemeSonucu?.let { Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp)) }
            }
        }
        GrupAyraci(16.dp)

        val bildirimVar = com.cepakil.koruma.Bildirimler.izinVarMi(context)
        Anahtar(
            "Anlık uygulama koruması",
            "Yeni yüklenen ya da güncellenip yeni izin isteyen uygulamalar arka planda (yaklaşık 15 dakikada bir, pil dostu) değerlendirilir; " +
                "riskliyse bildirim gelir. Hiçbir uygulama silinmez ya da durdurulmaz." +
                if (a.anlikKoruma && !bildirimVar) "\nBildirim izni kapalı: uyarılar gösterilemez. Açmak için anahtara yeniden dokun." else "",
            a.anlikKoruma, "koruma_anlik",
        ) { acik ->
            a.anlikKoruma = acik
            Planlayici.uygula(context)
            if (acik && !bildirimVar) bildirimIzniIste()
            tazele++
        }
        GrupAyraci(16.dp)

        val erisim = bildirimErisimiVar(context)
        val mesajAcik = a.mesajTarama && erisim
        Anahtar(
            "Gelen mesajları otomatik tara",
            "SMS, WhatsApp ve Telegram bildirimleri geldiği anda telefonda dolandırıcılık kalıplarına göre incelenir; şüpheliyse seni uyarır. " +
                "Bunun için Android'in \"Bildirim erişimi\" iznini senin açman gerekir. Mesajlar saklanmaz, hiçbir yere gönderilmez; " +
                "yalnız mesajlaşma uygulamalarının bildirimlerine bakılır." +
                if (a.mesajTarama && !erisim) "\nBildirim erişimi kapalı: açmak için anahtara dokun." else "",
            mesajAcik, "koruma_mesaj",
        ) { acik ->
            if (acik) {
                a.mesajTarama = true
                if (!bildirimVar) bildirimIzniIste()
                if (!erisim) {
                    bekleyenMesajIzni = true
                    try {
                        context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: Exception) { }
                }
            } else {
                a.mesajTarama = false
                if (erisim) {
                    // İzni tamamen geri almak için Android ayarı açılır; kapalıyken dinleyici zaten hiçbir şey yapmaz.
                    try {
                        context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: Exception) { }
                }
            }
            tazele++
        }
        GrupAyraci(16.dp)

        val vpnAcik = a.webKoruma && CepAkilVpn.aktifMi(context)
        Anahtar(
            "Web koruması",
            "Telefonda bilinen zararlı ve sahte sitelere (ör. banka ya da e-Devlet taklitleri) gidilmeden engellenir; tüm tarayıcılarda ve uygulamalarda çalışır. " +
                "Android bunu bir \"VPN\" olarak gösterir, ama trafiğin başka bir sunucuya gönderilmez: yalnız site adları telefonda kontrol edilir, sayfa içeriklerine bakılmaz. " +
                "Başka bir VPN açıkken çalışmaz." +
                (if (a.engellenenSayisi > 0) "\nŞimdiye kadar engellenen: ${a.engellenenSayisi}" else "") +
                (if (a.webKoruma && !vpnAcik) "\nŞu an çalışmıyor (telefon yeniden başlamış ya da başka VPN açılmış olabilir). Açmak için anahtara dokun." else ""),
            vpnAcik, "koruma_web",
        ) { acik ->
            if (acik) {
                if (!a.tehditListeleri) { a.tehditListeleri = true; Planlayici.uygula(context); Planlayici.simdiGuncelle(context) }
                val hazirlik = VpnService.prepare(context)
                if (hazirlik == null) {
                    a.webKoruma = true
                    CepAkilVpn.baslat(context)
                } else {
                    vpnIzni.launch(hazirlik)
                }
            } else {
                a.webKoruma = false
                CepAkilVpn.durdur(context)
            }
            tazele++
        }
        if (a.yakalananMesajSayisi > 0) {
            Text(
                "Uyarı verilen şüpheli mesaj: ${a.yakalananMesajSayisi}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
            )
        }
    }
}

/** Kullanıcı mesaj taraması için Android ayarına gönderildi mi? Geri dönünce izin verildiyse özellik açılır. */
private var bekleyenMesajIzni = false

@Composable
private fun Anahtar(baslik: String, aciklama: String, acik: Boolean, etiket: String, degisti: (Boolean) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .toggleable(value = acik, role = Role.Switch, onValueChange = degisti)
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .testTag(etiket),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        Column(Modifier.weight(1f)) {
            Text(baslik, style = MaterialTheme.typography.titleSmall)
            Text(aciklama, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Switch(checked = acik, onCheckedChange = null)
    }
}

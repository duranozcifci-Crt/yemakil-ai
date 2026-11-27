package com.cepakil.ui.ekranlar

import android.Manifest
import android.app.Activity
import android.net.VpnService
import android.os.Build
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
import androidx.compose.material3.TextButton
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Ayarlar > Koruma: üç koruma özelliği. Her biri kullanıcı açınca çalışır; açılırken neden izin
 * gerektiği yazılıdır. Durumlar ekran her öne geldiğinde yeniden okunur.
 *
 * Bildirimden mesaj taraması (NotificationListenerService) bilerek YOKTUR: Google Play Protect,
 * dosyadan kurulan ve bildirim okuyabilen uygulamaların kurulumunu dolandırıcılık önlemi olarak
 * engelliyor. Mesajlar "Paylaş > CepAkıl" ile denetlenir.
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
            kapsam.launch { delay(700); tazele++; delay(1500); tazele++ }
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
                "bağlantılar, mesajlar ve açtığın siteler bunlarla karşılaştırılır. " +
                // Zararlı uygulama listesi yalnız gerçekten indirilmişse söz edilir.
                (if (db != null && db.hashler.isNotEmpty()) "Mağaza dışından yüklenen uygulamalar da bildirilmiş zararlı Android uygulamaları listesiyle karşılaştırılır. " else "") +
                "Senin hiçbir verin gönderilmez.\n$tehditDurumu",
            a.tehditListeleri, "koruma_tehdit",
        ) { acik ->
            a.tehditListeleri = acik
            a.listeSoruldu = true
            Planlayici.uygula(context)
            if (acik) {
                if (a.sonGuncelleme == 0L) Planlayici.simdiGuncelle(context)
            } else {
                // Kapatınca indirilen listeler telefondan silinir.
                a.sonGuncelleme = 0L
                kapsam.launch(Dispatchers.IO) { TehditGuncelleyici.sil(context) }
            }
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

        val vpnAcik = a.webKoruma && CepAkilVpn.aktifMi(context)
        Anahtar(
            "Web koruması",
            "Telefonda bilinen zararlı ve sahte sitelere (ör. banka ya da e-Devlet taklitleri) gidilmeden engellenir; tüm tarayıcılarda ve uygulamalarda çalışır. " +
                "Android bunu bir \"VPN\" olarak gösterir, ama trafiğin başka bir sunucuya gönderilmez: yalnız site adları telefonda kontrol edilir, sayfa içeriklerine bakılmaz. " +
                "Başka bir VPN açıkken çalışmaz." +
                (if (a.engellenenSayisi > 0) "\nŞimdiye kadar engellenen: ${a.engellenenSayisi}" else "") +
                (if (CepAkilVpn.ozelDnsElleAyarli(context)) "\nDikkat: Telefonunda \"Özel DNS\" elle ayarlanmış. Bu durumda web koruması siteleri göremez; Android Ayarlar > Bağlantılar > Diğer bağlantı ayarları > Özel DNS'i \"Otomatik\" yapman gerekir." else "") +
                (if (a.webKoruma && !vpnAcik) "\nŞu an çalışmıyor (telefon yeniden başlamış ya da başka VPN açılmış olabilir). Açmak için anahtara dokun." else ""),
            vpnAcik, "koruma_web",
        ) { acik ->
            if (acik) {
                if (!a.tehditListeleri) { a.tehditListeleri = true; a.listeSoruldu = true; Planlayici.uygula(context); Planlayici.simdiGuncelle(context) }
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
            // Hizmet bir an sonra açılır/kapanır; durumu yeniden oku.
            kapsam.launch { delay(700); tazele++; delay(1500); tazele++ }
            tazele++
        }

        // Yanlış engellenen bir siteyi buradan açabilirsin (bildirimi kaçırmış olsan da).
        val engellenenler = a.sonEngellenenler.filter { it !in a.izinliSiteler }
        if (engellenenler.isNotEmpty()) {
            GrupAyraci(16.dp)
            AltBaslik("Son engellenen siteler", "Güvendiğin bir site yanlışlıkla engellendiyse izin verebilirsin.")
            engellenenler.take(8).forEach { h ->
                SiteSatiri(h, "İzin ver") { a.izinliSiteler = a.izinliSiteler + h; tazele++ }
            }
        }
        val izinliler = a.izinliSiteler.sorted()
        if (izinliler.isNotEmpty()) {
            GrupAyraci(16.dp)
            AltBaslik("İzin verdiğin siteler", "Web koruması bu siteleri engellemez.")
            izinliler.forEach { h ->
                SiteSatiri(h, "Kaldır") { a.izinliSiteler = a.izinliSiteler - h; tazele++ }
            }
        }
    }
}

@Composable
private fun AltBaslik(baslik: String, aciklama: String) {
    Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp)) {
        Text(baslik, style = MaterialTheme.typography.titleSmall)
        Text(aciklama, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SiteSatiri(host: String, eylem: String, tikla: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp).padding(start = 16.dp, end = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(host, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 2)
        TextButton(onClick = tikla) { Text(eylem) }
    }
}


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

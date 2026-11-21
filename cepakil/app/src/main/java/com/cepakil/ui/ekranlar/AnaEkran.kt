package com.cepakil.ui.ekranlar

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.YeniUygulamaTakibi
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.cepakil.ui.TaramaViewModel
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguKarti
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.veri.AyarYonlendirici
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val tarihBicimi = DateTimeFormatter.ofPattern("d MMMM yyyy, HH:mm", Locale("tr"))

fun tarihYaz(ms: Long): String = tarihBicimi.format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

@Composable
fun AnaEkran(vm: TaramaViewModel, uygulamayaGit: (String) -> Unit, onerilereGit: () -> Unit) {
    val d by vm.durum.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val kayit = d.kayit
    // CepAkıl her ön plana geldiğinde: son açılıştan beri yeni yüklenen uygulamalar.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.degisiklikleriDenetle() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "CepAkıl",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                "Telefonundaki riskleri anlamana yardımcı olur. Bir antivirüs değildir.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            val (seviye, baslik, aciklama) = when {
                kayit == null -> Triple(
                    Seviye.BILGI, "Henüz tarama yapılmadı",
                    "Telefon ayarlarını ve yüklü uygulamaları kontrol etmek için taramayı başlat.",
                )
                kayit.genelSeviye == Seviye.KIRMIZI -> Triple(Seviye.KIRMIZI, "Öncelikli incelemen gerekenler var", "Aşağıdaki kırmızı işaretli konulara bak.")
                kayit.genelSeviye == Seviye.SARI -> Triple(Seviye.SARI, "İncelemen gerekenler var", "Aşağıdaki işaretler zararlı olduğu anlamına gelmez; gözden geçirmen önerilir.")
                else -> Triple(
                    Seviye.YESIL, "Sorun görünmüyor",
                    "CepAkıl'ın yapabildiği kontrollerde dikkat çeken bir işaret bulunmadı. Bu, telefonun tamamen güvende olduğu anlamına gelmez.",
                )
            }
            DurumKarti(seviye, baslik, aciklama, if (kayit == null) Baglam.GENEL else Baglam.UYGULAMA)
        }

        if (d.degisiklikler.isNotEmpty()) {
            item { BolumBasligi("Son açılıştan beri") }
            items(d.degisiklikler, key = { "d-" + it.sonuc.bilgi.paket }) { o ->
                val s = o.sonuc
                val riskli = s.seviye == Seviye.KIRMIZI || s.seviye == Seviye.SARI
                val bulgu = when (o.tur) {
                    YeniUygulamaTakibi.Tur.YENI -> Bulgu(
                        if (riskli) s.seviye else Seviye.BILGI,
                        "Yeni yüklendi" + if (riskli) " · ${s.bulgular.first().baslik}" else "",
                        if (riskli) "Ayrıntılar ve kod incelemesi için dokun." else "Dikkat çeken işaret yok. Ayrıntılar ve kod incelemesi için dokun.",
                    )
                    YeniUygulamaTakibi.Tur.YENI_IZIN -> Bulgu(
                        maxOf(Seviye.SARI, s.seviye, compareBy<Seviye> { it.agirlik }),
                        "Güncellemeyle yeni izin istedi: ${YeniUygulamaTakibi.izinGruplari(o.yeniIzinler)}",
                        "Gerekli mi diye düşün; izni uygulama ayarlarından kaldırabilirsin. Ayrıntı için dokun.",
                    )
                }
                BulguKarti(bulgu, ust = s.bilgi.ad, onClick = { uygulamayaGit(s.bilgi.paket) })
            }
            item { IkincilDugme("Tamam, gördüm", vm::degisiklikleriGordum) }
        }

        item {
            Text(
                if (kayit == null) "Son tarama: yok"
                else "Son tarama: ${tarihYaz(kayit.zaman)} · ${kayit.incelenenUygulamaSayisi} uygulama ve telefon ayarları incelendi" +
                    if (kayit.sistemDahil) " (sistem uygulamaları dahil)" else "",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            BuyukDugme(
                metin = if (d.taraniyor) "Taranıyor…" else "Taramayı başlat",
                onClick = vm::taramayiBaslat,
                ikon = Icons.Filled.Search,
                yukleniyor = d.taraniyor,
            )
        }

        d.hata?.let { hata ->
            item {
                Text(
                    hata,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
            }
        }

        if (kayit != null) {
            val cihazOnemli = kayit.cihazBulgulari.filter { it.seviye.agirlik >= Seviye.SARI.agirlik }
            val cihazNot = kayit.cihazBulgulari.filter { it.seviye == Seviye.BILGI }
            if (cihazOnemli.isNotEmpty() || cihazNot.isNotEmpty()) {
                item { BolumBasligi("Telefon ayarları") }
                items(cihazOnemli + cihazNot) { b ->
                    BulguKarti(b, onClick = cihazEylemi(context, b))
                }
            }

            item { BolumBasligi("Uygulamalar") }
            if (kayit.uygulamalar.isEmpty()) {
                item {
                    Text(
                        "İncelenen ${kayit.incelenenUygulamaSayisi} uygulamada dikkat çeken bir işaret bulunmadı.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            } else {
                items(kayit.uygulamalar, key = { it.paket }) { u ->
                    val ana = u.bulgular.first()
                    val ek = if (u.bulgular.size > 1) " (+${u.bulgular.size - 1} işaret daha)" else ""
                    BulguKarti(
                        Bulgu(u.seviye, ana.baslik + ek, "Ayrıntılar ve uygulama ayarları için dokun."),
                        ust = u.ad,
                        onClick = { uygulamayaGit(u.paket) },
                    )
                }
            }
        }

        item {
            SinirNotu(
                baslik = "Bu tarama neleri kontrol eder?",
                metin = "Ekran kilidi, güvenlik güncellemesi tarihi, USB hata ayıklama ve yüklü uygulamaların izinleri, " +
                    "nereden yüklendikleri ile açık erişilebilirlik/cihaz yöneticisi/bildirim erişimi hizmetleri. " +
                    "Uygulamaların kodunu incelemez, zararlı yazılım imza veritabanı kullanmaz ve internete bağlanmaz. " +
                    "Tarama yalnız sen düğmeye bastığında çalışır.",
            )
        }

        item { IkincilDugme("Güvenlik önerileri", onerilereGit, ikon = Icons.Filled.Lightbulb) }
    }
}

/** Telefon ayarı bulgusuna dokunulunca ilgili Android ekranını açar. */
private fun cihazEylemi(context: Context, b: Bulgu): (() -> Unit)? = when {
    b.baslik.startsWith("Ekran kilidi") -> { { AyarYonlendirici.ekranKilidi(context) } }
    b.baslik.contains("güncelleme", ignoreCase = true) || b.baslik.contains("Android sürümü") -> { { AyarYonlendirici.sistemGuncelleme(context) } }
    b.baslik.contains("USB") || b.baslik.contains("Geliştirici") -> { { AyarYonlendirici.gelistiriciSecenekleri(context) } }
    b.baslik.contains("yama", ignoreCase = true) -> { { AyarYonlendirici.sistemGuncelleme(context) } }
    else -> null
}

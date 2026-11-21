package com.cepakil.ui.ekranlar

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.YeniUygulamaTakibi
import com.cepakil.ui.TaramaViewModel
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguSatiri
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumRozeti
import com.cepakil.ui.bilesenler.Grup
import com.cepakil.ui.bilesenler.GrupAyraci
import com.cepakil.ui.bilesenler.Kutucuk
import com.cepakil.ui.bilesenler.Satir
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.TonluSimge
import com.cepakil.ui.bilesenler.durumGorunumu
import com.cepakil.veri.AyarYonlendirici
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val tarihBicimi = DateTimeFormatter.ofPattern("d MMMM yyyy, HH:mm", Locale("tr"))

fun tarihYaz(ms: Long): String = tarihBicimi.format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

@Composable
fun AnaEkran(
    vm: TaramaViewModel,
    uygulamayaGit: (String) -> Unit,
    onerilereGit: () -> Unit,
    dosyayaGit: () -> Unit,
    baglantiyaGit: () -> Unit,
) {
    val d by vm.durum.collectAsStateWithLifecycle()
    val context = LocalContext.current
    // CepAkıl her ön plana geldiğinde: son açılıştan beri yeni yüklenen uygulamalar.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.degisiklikleriDenetle() }
    AnaEkranIcerik(
        d = d,
        taramayiBaslat = vm::taramayiBaslat,
        gordum = vm::degisiklikleriGordum,
        uygulamayaGit = uygulamayaGit,
        onerilereGit = onerilereGit,
        dosyayaGit = dosyayaGit,
        baglantiyaGit = baglantiyaGit,
        cihazEylemi = { cihazEylemi(context, it) },
    )
}

/** Durumdan bağımsız görünüm (ekran görüntüsü testlerinde de kullanılır). */
@Composable
fun AnaEkranIcerik(
    d: TaramaViewModel.Durum,
    taramayiBaslat: () -> Unit,
    gordum: () -> Unit,
    uygulamayaGit: (String) -> Unit,
    onerilereGit: () -> Unit,
    dosyayaGit: () -> Unit,
    baglantiyaGit: () -> Unit,
    cihazEylemi: (Bulgu) -> (() -> Unit)? = { null },
) {
    val kayit = d.kayit
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                TonluSimge(Icons.Filled.Psychology, MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.onPrimary, 36.dp)
                Spacer(Modifier.width(10.dp))
                Text("CepAkıl", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
            }
        }

        item { DurumPanosu(d, taramayiBaslat) }

        if (kayit != null) {
            item {
                val incelenecek = kayit.uygulamalar.size
                val ayar = kayit.cihazBulgulari.count { it.seviye.agirlik >= Seviye.SARI.agirlik }
                val g = durumGorunumu(if (incelenecek > 0) kayit.uygulamalar.maxOf { it.seviye.agirlik }.let { a -> Seviye.entries.first { it.agirlik == a } } else Seviye.YESIL, Baglam.UYGULAMA)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Kutucuk(kayit.incelenenUygulamaSayisi.toString(), "uygulama incelendi", Modifier.weight(1f))
                    Kutucuk(incelenecek.toString(), "incelenecek uygulama", Modifier.weight(1f), if (incelenecek > 0) g.renk.vurgu else MaterialTheme.colorScheme.onSurface)
                    Kutucuk(ayar.toString(), "telefon ayarı uyarısı", Modifier.weight(1f))
                }
            }
        }

        if (d.degisiklikler.isNotEmpty()) {
            item { BolumBasligi("Son açılıştan beri") }
            item {
                Grup {
                    d.degisiklikler.forEachIndexed { i, o ->
                        if (i > 0) GrupAyraci()
                        val s = o.sonuc
                        val riskli = s.seviye == Seviye.KIRMIZI || s.seviye == Seviye.SARI
                        val bulgu = when (o.tur) {
                            YeniUygulamaTakibi.Tur.YENI -> Bulgu(
                                if (riskli) s.seviye else Seviye.BILGI,
                                "Yeni yüklendi" + if (riskli) " · ${s.bulgular.first().baslik}" else "",
                                if (riskli) "Ayrıntılar ve kod incelemesi için dokun." else "Dikkat çeken işaret yok.",
                            )
                            YeniUygulamaTakibi.Tur.YENI_IZIN -> Bulgu(
                                maxOf(Seviye.SARI, s.seviye, compareBy<Seviye> { it.agirlik }),
                                "Yeni izin istedi: ${YeniUygulamaTakibi.izinGruplari(o.yeniIzinler)}",
                                "Güncellemeyle geldi. Gerekli değilse uygulama ayarlarından kaldırabilirsin.",
                            )
                        }
                        BulguSatiri(bulgu, ust = s.bilgi.ad, onClick = { uygulamayaGit(s.bilgi.paket) })
                    }
                    GrupAyraci()
                    TextButton(onClick = gordum, modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) { Text("Tamam, gördüm") }
                }
            }
        }

        if (kayit != null) {
            val cihaz = kayit.cihazBulgulari.sortedByDescending { it.seviye.agirlik }
            if (cihaz.isNotEmpty()) {
                item { BolumBasligi("Telefon ayarları") }
                item {
                    Grup {
                        cihaz.forEachIndexed { i, b ->
                            if (i > 0) GrupAyraci()
                            BulguSatiri(b, onClick = cihazEylemi(b))
                        }
                    }
                }
            }
            if (kayit.uygulamalar.isNotEmpty()) {
                item { BolumBasligi("İncelenecek uygulamalar") }
                item {
                    Grup {
                        kayit.uygulamalar.forEachIndexed { i, u ->
                            if (i > 0) GrupAyraci()
                            Satir(
                                baslik = u.ad,
                                aciklama = u.bulgular.first().baslik + if (u.bulgular.size > 1) " · +${u.bulgular.size - 1}" else "",
                                bas = { UygulamaSimgesi(u.paket, 40) },
                                son = { DurumRozeti(u.seviye, Baglam.UYGULAMA) },
                                onClick = { uygulamayaGit(u.paket) },
                                aciklamaSatiri = 2,
                            )
                        }
                    }
                }
            }
        }

        item { BolumBasligi("Araçlar") }
        item {
            Grup {
                val zemin = MaterialTheme.colorScheme.primaryContainer
                val renk = MaterialTheme.colorScheme.primary
                Satir("Dosya kontrolü", "PDF, APK ya da arşiv dosyasını incele", bas = { TonluSimge(Icons.AutoMirrored.Filled.InsertDriveFile, zemin, renk) }, onClick = dosyayaGit)
                GrupAyraci()
                Satir("Bağlantı kontrolü", "Şüpheli bir bağlantıyı açmadan denetle", bas = { TonluSimge(Icons.Filled.Link, zemin, renk) }, onClick = baglantiyaGit)
                GrupAyraci()
                Satir("Güvenlik önerileri", "Güncelleme, ekran kilidi ve izin ayarları", bas = { TonluSimge(Icons.Filled.Lightbulb, zemin, renk) }, onClick = onerilereGit)
            }
        }

        item {
            SinirNotu(
                baslik = "Bu tarama neleri kontrol eder?",
                metin = "Ekran kilidi, güvenlik güncellemesi tarihi, USB hata ayıklama ve yüklü uygulamaların izinleri, " +
                    "nereden yüklendikleri ile açık erişilebilirlik / cihaz yöneticisi / bildirim erişimi hizmetleri. " +
                    "CepAkıl bir antivirüs değildir: zararlı yazılım imza veritabanı kullanmaz ve internete bağlanmaz. " +
                    "Tarama yalnız sen düğmeye bastığında çalışır.",
            )
        }
    }
}

/** Ekranın üstündeki büyük durum göstergesi ve tarama düğmesi. */
@Composable
private fun DurumPanosu(d: TaramaViewModel.Durum, taramayiBaslat: () -> Unit) {
    val kayit = d.kayit
    val seviye = when {
        kayit == null -> Seviye.BILGI
        kayit.genelSeviye == Seviye.KIRMIZI -> Seviye.KIRMIZI
        kayit.genelSeviye == Seviye.SARI -> Seviye.SARI
        else -> Seviye.YESIL
    }
    val g = durumGorunumu(seviye, if (kayit == null) Baglam.GENEL else Baglam.UYGULAMA)
    val (baslik, aciklama) = when {
        kayit == null -> "Henüz tarama yapılmadı" to "Telefon ayarlarını ve yüklü uygulamaları tek dokunuşla kontrol et."
        seviye == Seviye.KIRMIZI -> "Öncelikli incelemen gerekenler var" to "Kırmızı işaretli konulara göz at."
        seviye == Seviye.SARI -> "İncelemen gerekenler var" to "İşaretler zararlı olduğu anlamına gelmez; gözden geçirmen önerilir."
        else -> "Sorun görünmüyor" to "CepAkıl'ın kontrollerinde dikkat çeken bir işaret bulunmadı."
    }
    Grup {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 22.dp).semantics { liveRegion = LiveRegionMode.Polite },
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(112.dp)) {
                CircularProgressIndicator(
                    progress = { 1f },
                    modifier = Modifier.size(112.dp),
                    color = g.renk.vurgu,
                    trackColor = g.renk.zemin,
                    strokeWidth = 8.dp,
                )
                TonluSimge(g.ikon, g.renk.zemin, g.renk.vurgu, 84.dp)
            }
            Spacer(Modifier.size(16.dp))
            Text(baslik, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
            Spacer(Modifier.size(4.dp))
            Text(aciklama, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            Spacer(Modifier.size(6.dp))
            Text(
                if (kayit == null) "Son tarama: yok" else "Son tarama: ${tarihYaz(kayit.zaman)}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.size(18.dp))
            BuyukDugme(
                metin = when {
                    d.taraniyor -> "Taranıyor…"
                    kayit == null -> "Taramayı başlat"
                    else -> "Yeniden tara"
                },
                onClick = taramayiBaslat,
                ikon = if (kayit == null) Icons.Filled.Search else Icons.Filled.Refresh,
                yukleniyor = d.taraniyor,
            )
            d.hata?.let {
                Spacer(Modifier.size(10.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            }
        }
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

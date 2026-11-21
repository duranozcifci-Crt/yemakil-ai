package com.cepkalkan.ui.ekranlar

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.selection.toggleable
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cepkalkan.analiz.Seviye
import com.cepkalkan.analiz.UygulamaDegerlendirici
import com.cepkalkan.ui.UygulamalarViewModel
import com.cepkalkan.ui.bilesenler.Baglam
import com.cepkalkan.ui.bilesenler.BilgiDurumu
import com.cepkalkan.ui.bilesenler.DurumRozeti
import com.cepkalkan.ui.bilesenler.SinirNotu
import com.cepkalkan.ui.bilesenler.UstCubuk
import com.cepkalkan.veri.UygulamaKaynagi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

@Composable
fun UygulamalarEkrani(vm: UygulamalarViewModel, ayrintiyaGit: (String) -> Unit) {
    val durum by vm.durum.collectAsStateWithLifecycle()
    val sistemDahil by vm.sistemDahil.collectAsStateWithLifecycle()
    var arama by rememberSaveable { mutableStateOf("") }
    var yalnizIncelenecek by rememberSaveable { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Uygulamalar")
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text(
                    "Bir uygulamaya dokunarak istediği hassas izinleri ve neden işaretlendiğini gör. " +
                        "Bir izin, uygulamanın zararlı olduğunu tek başına göstermez.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            item {
                OutlinedTextField(
                    value = arama,
                    onValueChange = { arama = it },
                    label = { Text("Uygulama ara") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !yalnizIncelenecek, onClick = { yalnizIncelenecek = false }, label = { Text("Tümü") })
                    FilterChip(selected = yalnizIncelenecek, onClick = { yalnizIncelenecek = true }, label = { Text("İncelenecekler") })
                }
            }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp)
                        .toggleable(value = sistemDahil, role = Role.Switch, onValueChange = vm::sistemDahilDegistir),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Sistem uygulamalarını da göster", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Switch(checked = sistemDahil, onCheckedChange = null)
                }
            }

            when (val d = durum) {
                UygulamalarViewModel.Durum.Yukleniyor -> item {
                    Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(Modifier.size(12.dp))
                        Text("Uygulamalar okunuyor…", style = MaterialTheme.typography.bodyLarge)
                    }
                }
                is UygulamalarViewModel.Durum.Hata -> item {
                    BilgiDurumu(Icons.Filled.ErrorOutline, "Liste alınamadı", d.mesaj, "Tekrar dene", vm::yukle)
                }
                is UygulamalarViewModel.Durum.Hazir -> {
                    if (d.sonuclar.isEmpty()) {
                        item {
                            BilgiDurumu(
                                Icons.Filled.Apps, "Uygulama bulunamadı",
                                "Android, CepKalkan'a yüklü uygulamaların listesini vermedi. İş telefonu profili ya da üretici kısıtlaması olabilir. " +
                                    "\"Sistem uygulamalarını da göster\" seçeneğini açmayı deneyebilirsin.",
                                "Yeniden yükle", vm::yukle,
                            )
                        }
                    } else {
                        val aranan = arama.trim().lowercase(Locale("tr"))
                        val gosterilen = d.sonuclar
                            .filter { !yalnizIncelenecek || it.seviye == Seviye.KIRMIZI || it.seviye == Seviye.SARI }
                            .filter { aranan.isEmpty() || it.bilgi.ad.lowercase(Locale("tr")).contains(aranan) || it.bilgi.paket.contains(aranan) }
                            .sortedWith(compareByDescending<UygulamaDegerlendirici.Sonuc> { if (yalnizIncelenecek) it.seviye.agirlik else 0 }.thenBy { it.bilgi.ad.lowercase() })
                        item {
                            val incelenecek = d.sonuclar.count { it.seviye == Seviye.KIRMIZI || it.seviye == Seviye.SARI }
                            Text(
                                "${d.sonuclar.size} uygulama · $incelenecek tanesinde incelenecek işaret var",
                                style = MaterialTheme.typography.labelLarge,
                            )
                        }
                        if (d.sonuclar.size < 5 && !sistemDahil) {
                            item {
                                SinirNotu("Çok az uygulama görünüyor. Android bazı cihazlarda ya da iş profillerinde uygulama listesini kısıtlayabilir.", "Liste eksik olabilir")
                            }
                        }
                        if (gosterilen.isEmpty()) {
                            item {
                                BilgiDurumu(
                                    Icons.Filled.SearchOff,
                                    if (yalnizIncelenecek && aranan.isEmpty()) "İncelenecek uygulama yok" else "Sonuç yok",
                                    if (yalnizIncelenecek && aranan.isEmpty()) "Listelenen uygulamalarda dikkat çeken bir işaret bulunmadı." else "Aramana uyan bir uygulama bulunamadı.",
                                )
                            }
                        }
                        items(gosterilen, key = { it.bilgi.paket }) { s ->
                            UygulamaSatiri(s) { ayrintiyaGit(s.bilgi.paket) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UygulamaSatiri(s: UygulamaDegerlendirici.Sonuc, onClick: () -> Unit) {
    val hassasSayisi = s.bilgi.izinler.keys.count { com.cepkalkan.analiz.IzinSozlugu.tanim(it)?.grup?.hassas == true }
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {
            stateDescription = "${s.bulgular.count { it.seviye.agirlik >= Seviye.SARI.agirlik }} işaret"
        },
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            UygulamaSimgesi(s.bilgi.paket, 44)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(s.bilgi.ad, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(
                    if (hassasSayisi == 0) "Hassas izin istemiyor" else "$hassasSayisi hassas izin istiyor",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.size(6.dp))
                DurumRozeti(s.seviye, Baglam.UYGULAMA)
            }
        }
    }
}

/** Uygulama simgesini arka planda yükler; yüklenemezse genel bir simge gösterir. */
@Composable
fun UygulamaSimgesi(paket: String, boyutDp: Int) {
    val context = LocalContext.current
    val kaynak = remember { UygulamaKaynagi(context.applicationContext) }
    val resim by produceState<ImageBitmap?>(null, paket) {
        value = withContext(Dispatchers.IO) {
            try { kaynak.simge(paket)?.toBitmap(boyutDp * 3, boyutDp * 3)?.asImageBitmap() } catch (e: Exception) { null }
        }
    }
    Box(Modifier.size(boyutDp.dp), contentAlignment = Alignment.Center) {
        val r = resim
        if (r != null) Image(r, contentDescription = null, modifier = Modifier.size(boyutDp.dp))
        else Icon(Icons.Filled.Android, contentDescription = null, modifier = Modifier.size((boyutDp * 0.8).dp))
    }
}

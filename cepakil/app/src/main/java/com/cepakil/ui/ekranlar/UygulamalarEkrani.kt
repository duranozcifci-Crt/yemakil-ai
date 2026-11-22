package com.cepakil.ui.ekranlar

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.runtime.LaunchedEffect
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
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.ui.UygulamalarViewModel
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BilgiDurumu
import com.cepakil.ui.bilesenler.DurumRozeti
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.UygulamaKaynagi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

@Composable
fun UygulamalarEkrani(vm: UygulamalarViewModel, ayrintiyaGit: (String) -> Unit) {
    val durum by vm.durum.collectAsStateWithLifecycle()
    val sistemDahil by vm.sistemDahil.collectAsStateWithLifecycle()
    var arama by rememberSaveable { mutableStateOf("") }
    var yalnizIncelenecek by rememberSaveable { mutableStateOf(false) }
    // Bir uygulama kaldırılıp geri dönüldüğünde liste güncel olsun.
    androidx.lifecycle.compose.LifecycleEventEffect(androidx.lifecycle.Lifecycle.Event.ON_RESUME) { vm.sessizYenile() }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Uygulamalar")
        LazyColumn(
            // Klavye açılınca alanlar ve düğmeler klavyenin altında kalmasın.
            modifier = Modifier.imePadding(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
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
                    placeholder = { Text("Uygulama ara") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    shape = MaterialTheme.shapes.medium,
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
                                "Android, CepAkıl'a yüklü uygulamaların listesini vermedi. İş telefonu profili ya da üretici kısıtlaması olabilir. " +
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
    val hassasSayisi = s.bilgi.izinler.keys.count { com.cepakil.analiz.IzinSozlugu.tanim(it)?.grup?.hassas == true }
    com.cepakil.ui.bilesenler.Grup {
        com.cepakil.ui.bilesenler.Satir(
            baslik = s.bilgi.ad,
            aciklama = if (hassasSayisi == 0) "Hassas izin istemiyor" else "$hassasSayisi hassas izin",
            bas = { UygulamaSimgesi(s.bilgi.paket, 40) },
            alt = { DurumRozeti(s.seviye, Baglam.UYGULAMA) },
            onClick = onClick,
        )
    }
}

/** Uygulama simgesini arka planda yükler; yüklenemezse genel bir simge gösterir. */
@Composable
fun UygulamaSimgesi(paket: String, boyutDp: Int) {
    if (androidx.compose.ui.platform.LocalInspectionMode.current) {
        // Önizleme / ekran görüntüsü testi: gerçek simge yok.
        Box(Modifier.size(boyutDp.dp), contentAlignment = Alignment.Center) {
            com.cepakil.ui.bilesenler.TonluSimge(Icons.Filled.Android, MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.secondary, boyutDp.dp)
        }
        return
    }
    val context = LocalContext.current
    val kaynak = remember { UygulamaKaynagi(context.applicationContext) }
    var resim by remember(paket) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(paket) {
        resim = withContext(Dispatchers.IO) {
            try { kaynak.simge(paket)?.toBitmap(boyutDp * 3, boyutDp * 3)?.asImageBitmap() } catch (e: Exception) { null }
        }
    }
    Box(Modifier.size(boyutDp.dp), contentAlignment = Alignment.Center) {
        val r = resim
        if (r != null) Image(r, contentDescription = null, modifier = Modifier.size(boyutDp.dp))
        else Icon(Icons.Filled.Android, contentDescription = null, modifier = Modifier.size((boyutDp * 0.8).dp))
    }
}

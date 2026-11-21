package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cepakil.analiz.IzinSozlugu
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BilgiDurumu
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguKarti
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.AyarYonlendirici
import com.cepakil.veri.UygulamaKaynagi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private sealed interface DetayDurumu {
    data object Yukleniyor : DetayDurumu
    data object Bulunamadi : DetayDurumu
    data class Hazir(val sonuc: UygulamaDegerlendirici.Sonuc, val ayrinti: UygulamaKaynagi.Ayrinti?) : DetayDurumu
}

/** Ekranda gösterilecek tek izin grubu satırı. */
private data class IzinSatiri(val grup: IzinSozlugu.Grup, val durum: String, val teknik: List<String>)

@Composable
fun UygulamaDetayEkrani(paket: String, geri: () -> Unit) {
    val context = LocalContext.current
    val durum by produceState<DetayDurumu>(DetayDurumu.Yukleniyor, paket) {
        value = withContext(Dispatchers.Default) {
            val k = UygulamaKaynagi(context.applicationContext)
            val bilgi = k.uygulama(paket)
            if (bilgi == null) DetayDurumu.Bulunamadi
            else DetayDurumu.Hazir(UygulamaDegerlendirici.degerlendir(bilgi), k.ayrinti(paket, bilgi.yukleyen))
        }
    }
    var teknikAcik by rememberSaveable { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Uygulama ayrıntısı", geri)
        when (val d = durum) {
            DetayDurumu.Yukleniyor -> Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
            }
            DetayDurumu.Bulunamadi -> Column(Modifier.padding(16.dp)) {
                BilgiDurumu(Icons.Filled.SearchOff, "Uygulama bulunamadı", "Bu uygulama kaldırılmış ya da Android bilgisini vermiyor olabilir.", "Geri dön", geri)
            }
            is DetayDurumu.Hazir -> {
                val s = d.sonuc
                val u = s.bilgi
                val satirlar = izinSatirlari(u)
                val digerIzinler = u.izinler.keys.filter { IzinSozlugu.tanim(it)?.grup?.hassas != true }.sorted()

                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            UygulamaSimgesi(u.paket, 56)
                            Spacer(Modifier.width(14.dp))
                            Column {
                                Text(u.ad, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text(u.paket, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (u.surum != null) Text("Sürüm ${u.surum}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    item {
                        when (s.seviye) {
                            Seviye.KIRMIZI -> DurumKarti(Seviye.KIRMIZI, "Öncelikli incelemen önerilir", "Aşağıdaki işaretlere bak. Uygulamayı tanımıyorsan ayarlarından kaldırmayı düşün.")
                            Seviye.SARI -> DurumKarti(Seviye.SARI, "İncelemen önerilir", "Bu işaretler uygulamanın zararlı olduğunu göstermez; amacına uygun olup olmadığını düşün.")
                            else -> DurumKarti(s.seviye, "Dikkat çeken işaret yok", "CepAkıl'ın kurallarına göre beklenmedik bir durum bulunmadı. Bu, uygulamanın kesinlikle zararsız olduğu anlamına gelmez.", Baglam.UYGULAMA)
                        }
                    }
                    item {
                        BuyukDugme("Uygulama ayarlarını aç", { AyarYonlendirici.uygulamaAyarlari(context, u.paket) }, ikon = Icons.Filled.Settings)
                        Text(
                            "İzinleri kaldırmak, uygulamayı durdurmak ya da kaldırmak için Android'in kendi ekranı açılır. CepAkıl hiçbir uygulamayı kendisi silmez veya devre dışı bırakmaz.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }

                    if (s.bulgular.isNotEmpty()) {
                        item { BolumBasligi("Neden işaretlendi?") }
                        items(s.bulgular) { BulguKarti(it, Baglam.UYGULAMA) }
                    }

                    item { BolumBasligi("Yükleme bilgisi") }
                    item {
                        val yukleyen = when {
                            u.sistemUygulamasi -> "Telefonla birlikte gelen sistem uygulaması"
                            u.yukleyen == null -> "Bilinmiyor (Android bildirmiyor)"
                            else -> (d.ayrinti?.yukleyenAdi ?: u.yukleyen) +
                                if (UygulamaDegerlendirici.magazadanMi(u.yukleyen)) " (bilinen mağaza)" else " (mağaza değil)"
                        }
                        BilgiSatirlari(
                            listOfNotNull(
                                "Yükleyen" to yukleyen,
                                d.ayrinti?.let { "İlk yükleme" to tarihYaz(it.ilkYukleme) },
                                d.ayrinti?.let { "Son güncelleme" to tarihYaz(it.sonGuncelleme) },
                                "Hedef Android API" to u.hedefSdk.toString(),
                            ),
                        )
                    }

                    item { BolumBasligi("İstediği hassas izinler") }
                    if (satirlar.isEmpty()) {
                        item { Text("Bu uygulama hassas sayılan bir izin istemiyor.", style = MaterialTheme.typography.bodyLarge) }
                    }
                    items(satirlar) { IzinKarti(it) }

                    item {
                        Text(
                            "Ayrıca ${digerIzinler.size} izin daha istiyor (internet, titreşim gibi). Bunlar Android'in kullanıcıya sormadığı, düşük riskli sayılan izinlerdir.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (digerIzinler.isNotEmpty()) {
                            TextButton(onClick = { teknikAcik = !teknikAcik }) {
                                Icon(if (teknikAcik) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text(if (teknikAcik) "Teknik listeyi gizle" else "Teknik listeyi göster")
                            }
                        }
                    }
                    if (teknikAcik) {
                        item {
                            Text(
                                digerIzinler.joinToString("\n") { IzinSozlugu.kisaAd(it) },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    item {
                        SinirNotu(
                            "Bu değerlendirme uygulamanın istediği izinlere, nereden yüklendiğine ve açık özel hizmetlerine dayanır. " +
                                "Uygulamanın ne yaptığını (kodunu, internet trafiğini) incelemez. Özel izinlerin (ör. üstte gösterme) " +
                                "verilip verilmediği her telefonda okunamaz; kesin durum için uygulama ayarlarına bak.",
                        )
                    }
                }
            }
        }
    }
}

private fun izinSatirlari(u: UygulamaDegerlendirici.UygulamaBilgisi): List<IzinSatiri> {
    val gruplar = linkedMapOf<IzinSozlugu.Grup, MutableList<Pair<String, IzinSozlugu.Tanim>>>()
    u.izinler.keys.forEach { izin ->
        val t = IzinSozlugu.tanim(izin) ?: return@forEach
        if (!t.grup.hassas) return@forEach
        gruplar.getOrPut(t.grup) { mutableListOf() } += izin to t
    }
    val satirlar = gruplar.entries.sortedBy { it.key.ordinal }.map { (grup, izinler) ->
        val tur = izinler.first().second.tur
        val durum = when {
            grup == IzinSozlugu.Grup.UYGULAMA_YUKLEME && u.bilinmeyenKaynakIzni == true -> "İstiyor · açık"
            grup == IzinSozlugu.Grup.UYGULAMA_YUKLEME && u.bilinmeyenKaynakIzni == false -> "İstiyor · kapalı"
            tur == IzinSozlugu.Tur.CALISMA_ZAMANI ->
                if (izinler.any { u.izinler[it.first] == true }) "Verilmiş" else "İstiyor · verilmemiş"
            else -> "İstiyor · durumu ayarlardan kontrol et"
        }
        IzinSatiri(grup, durum, izinler.map { IzinSozlugu.kisaAd(it.first) })
    }.toMutableList()
    // Hizmet izinleri "istenen izin" listesinde görünmez; açık olduklarını ayrıca biliyoruz.
    if (u.erisilebilirlikAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.ERISILEBILIRLIK, "Açık", emptyList()))
    if (u.cihazYoneticisiAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.CIHAZ_YONETICISI, "Etkin", emptyList()))
    if (u.bildirimErisimiAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.BILDIRIM_ERISIMI, "Açık", emptyList()))
    return satirlar
}

@Composable
private fun IzinKarti(s: IzinSatiri) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(s.grup.ad, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                Text(
                    s.durum,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (s.durum == "Verilmiş" || s.durum.startsWith("Açık") || s.durum == "Etkin" || s.durum.endsWith("açık"))
                        MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.size(4.dp))
            Text(s.grup.aciklama, style = MaterialTheme.typography.bodyMedium)
            if (s.teknik.isNotEmpty()) {
                Text(s.teknik.joinToString(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
fun BilgiSatirlari(satirlar: List<Pair<String, String>>) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        satirlar.forEach { (etiket, deger) ->
            Row(Modifier.semantics(mergeDescendants = true) {}) {
                Text(etiket, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.4f))
                Text(deger, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(0.6f))
            }
        }
    }
}

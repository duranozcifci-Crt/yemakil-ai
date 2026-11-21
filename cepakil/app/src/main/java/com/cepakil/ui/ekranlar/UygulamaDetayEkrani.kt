package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Contacts
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.InstallMobile
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.QueryStats
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shop
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.IzinSozlugu
import com.cepakil.analiz.KodIncelemesi
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BilgiDurumu
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguGrubu
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.DurumRozeti
import com.cepakil.ui.bilesenler.Etiket
import com.cepakil.ui.bilesenler.Grup
import com.cepakil.ui.bilesenler.GrupAyraci
import com.cepakil.ui.bilesenler.Satir
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.TonluSimge
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
data class IzinSatiri(val grup: IzinSozlugu.Grup, val durum: String, val acik: Boolean, val teknik: List<String>)

@Composable
fun UygulamaDetayEkrani(paket: String, geri: () -> Unit, kaldirmayaGit: () -> Unit) {
    val context = LocalContext.current
    var durum by remember(paket) { mutableStateOf<DetayDurumu>(DetayDurumu.Yukleniyor) }
    var kod by remember(paket) { mutableStateOf<List<Bulgu>?>(null) }
    LaunchedEffect(paket) {
        val k = UygulamaKaynagi(context.applicationContext)
        durum = withContext(Dispatchers.Default) {
            val bilgi = k.uygulama(paket)
            if (bilgi == null) DetayDurumu.Bulunamadi
            else DetayDurumu.Hazir(UygulamaDegerlendirici.degerlendir(bilgi), k.ayrinti(paket, bilgi.yukleyen))
        }
        // Kod incelemesi ayrıca, arka iş parçacığında (birkaç saniye sürebilir).
        kod = withContext(Dispatchers.IO) {
            val dosyalar = k.apkDosyalari(paket)
            if (dosyalar.isEmpty()) {
                listOf(Bulgu(Seviye.BILGI, "Kod okunamadı", "Android bu uygulamanın dosyasını okumaya izin vermedi."))
            } else {
                try {
                    KodIncelemesi.bulgular(KodIncelemesi.incele(dosyalar.map { f -> { f.inputStream() } }))
                } catch (e: OutOfMemoryError) {
                    listOf(Bulgu(Seviye.BILGI, "Kod incelenemedi", "Uygulama bu telefonda incelenemeyecek kadar büyük."))
                }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Uygulama ayrıntısı", geri)
        when (val d = durum) {
            DetayDurumu.Yukleniyor -> Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
            }
            DetayDurumu.Bulunamadi -> Column(Modifier.padding(16.dp)) {
                BilgiDurumu(Icons.Filled.SearchOff, "Uygulama bulunamadı", "Bu uygulama kaldırılmış ya da Android bilgisini vermiyor olabilir.", "Geri dön", geri)
            }
            is DetayDurumu.Hazir -> UygulamaDetayIcerik(
                s = d.sonuc,
                ayrinti = d.ayrinti,
                kodBulgulari = kod,
                ayarlariAc = { AyarYonlendirici.uygulamaAyarlari(context, paket) },
                kaldir = kaldirmayaGit,
            )
        }
    }
}

/** Durumdan bağımsız görünüm (ekran görüntüsü testlerinde de kullanılır). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun UygulamaDetayIcerik(
    s: UygulamaDegerlendirici.Sonuc,
    ayrinti: UygulamaKaynagi.Ayrinti?,
    kodBulgulari: List<Bulgu>?,
    ayarlariAc: () -> Unit,
    kaldir: () -> Unit,
) {
    val u = s.bilgi
    val satirlar = izinSatirlari(u)
    val digerIzinler = u.izinler.keys.filter { IzinSozlugu.tanim(it)?.grup?.hassas != true }.sorted()
    val magaza = UygulamaDegerlendirici.magazadanMi(u.yukleyen)

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Üst kart: simge, ad, etiketler, eylemler
        item {
            Grup {
                Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    UygulamaSimgesi(u.paket, 64)
                    Spacer(Modifier.size(12.dp))
                    Text(u.ad, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
                    Text(u.paket, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    Spacer(Modifier.size(10.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        DurumRozeti(s.seviye, Baglam.UYGULAMA)
                        when {
                            u.sistemUygulamasi -> Etiket("Sistem uygulaması", Icons.Filled.Settings)
                            magaza -> Etiket(ayrinti?.yukleyenAdi ?: "Bilinen mağaza", Icons.Filled.Shop)
                            else -> Etiket("Mağaza dışı", Icons.Filled.Warning)
                        }
                        if (u.surum != null) Etiket("Sürüm ${u.surum}")
                    }
                    Spacer(Modifier.size(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = ayarlariAc, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = MaterialTheme.shapes.medium) {
                            Icon(Icons.Filled.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Ayarlar", style = MaterialTheme.typography.labelLarge, maxLines = 1)
                        }
                        if (!u.sistemUygulamasi) {
                            OutlinedButton(onClick = kaldir, modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = MaterialTheme.shapes.medium) {
                                Icon(Icons.Filled.DeleteForever, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Kaldır", style = MaterialTheme.typography.labelLarge, maxLines = 1)
                            }
                        }
                    }
                }
            }
        }

        item {
            when (s.seviye) {
                Seviye.KIRMIZI -> DurumKarti(Seviye.KIRMIZI, "Öncelikli incelemen önerilir", "Uygulamayı tanımıyorsan kaldırmayı düşün.")
                Seviye.SARI -> DurumKarti(Seviye.SARI, "İncelemen önerilir", "İşaretler zararlı olduğu anlamına gelmez; amacına uygun mu, düşün.")
                else -> DurumKarti(s.seviye, "Dikkat çeken işaret yok", "CepAkıl'ın kurallarına göre beklenmedik bir durum bulunmadı.", Baglam.UYGULAMA)
            }
        }

        if (s.bulgular.isNotEmpty()) {
            item { BolumBasligi("Neden işaretlendi?") }
            item { BulguGrubu(s.bulgular, Baglam.UYGULAMA) }
        }

        item { BolumBasligi("Kod incelemesi") }
        item {
            when {
                kodBulgulari == null -> Grup {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.5.dp)
                        Spacer(Modifier.width(14.dp))
                        Text("Uygulamanın kodu inceleniyor…", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                kodBulgulari.isEmpty() -> BulguGrubu(listOf(Bulgu(Seviye.YESIL, "Kodda dikkat çeken yetenek yok", "SMS, ekran kontrolü, gizli kod yükleme gibi yetenekler bulunmadı.")), Baglam.UYGULAMA)
                else -> BulguGrubu(kodBulgulari, Baglam.UYGULAMA)
            }
        }

        item { BolumBasligi("İzinler") }
        item {
            Grup {
                if (satirlar.isEmpty()) {
                    Satir("Hassas izin istemiyor", "SMS, konum, mikrofon gibi izinlerden hiçbirini istemiyor.")
                }
                satirlar.forEachIndexed { i, r ->
                    if (i > 0) GrupAyraci()
                    Satir(
                        baslik = r.grup.ad,
                        aciklama = r.grup.aciklama,
                        bas = {
                            TonluSimge(
                                grupSimgesi(r.grup),
                                if (r.acik) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                                if (r.acik) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        },
                        son = {
                            Text(
                                r.durum, style = MaterialTheme.typography.labelMedium,
                                color = if (r.acik) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        },
                        aciklamaSatiri = 3,
                    )
                }
                if (digerIzinler.isNotEmpty()) {
                    GrupAyraci()
                    Satir(
                        "Diğer ${digerIzinler.size} izin",
                        "İnternet, titreşim gibi Android'in sormadığı düşük riskli izinler: " +
                            digerIzinler.joinToString(", ") { IzinSozlugu.kisaAd(it) },
                        bas = { TonluSimge(Icons.Filled.Apps, MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.colorScheme.onSurfaceVariant) },
                        aciklamaSatiri = 3,
                    )
                }
            }
        }

        item { BolumBasligi("Yükleme bilgisi") }
        item {
            Grup {
                val yukleyen = when {
                    u.sistemUygulamasi -> "Telefonla birlikte gelen sistem uygulaması"
                    u.yukleyen == null -> "Bilinmiyor (Android bildirmiyor)"
                    else -> (ayrinti?.yukleyenAdi ?: u.yukleyen) + if (magaza) " · bilinen mağaza" else " · mağaza değil"
                }
                Satir("Yükleyen", yukleyen)
                ayrinti?.let {
                    GrupAyraci(16.dp); Satir("İlk yükleme", tarihYaz(it.ilkYukleme))
                    GrupAyraci(16.dp); Satir("Son güncelleme", tarihYaz(it.sonGuncelleme))
                }
                GrupAyraci(16.dp); Satir("Hedef Android sürümü", "API ${u.hedefSdk}")
            }
        }

        item {
            SinirNotu(
                "Bu değerlendirme uygulamanın istediği izinlere, nereden yüklendiğine, açık özel hizmetlerine ve kodunda geçen Android özelliklerine dayanır. " +
                    "Uygulamanın gerçekte ne yaptığını (ağ trafiğini, sunucuya ne gönderdiğini) göremez. " +
                    "Özel izinlerin (ör. üstte gösterme) durumu her telefonda okunamaz; kesin durum için uygulama ayarlarına bak. " +
                    KodIncelemesi.SINIR_NOTU,
            )
        }
    }
}

private fun grupSimgesi(g: IzinSozlugu.Grup): ImageVector = when (g) {
    IzinSozlugu.Grup.SMS -> Icons.Filled.Sms
    IzinSozlugu.Grup.KISILER -> Icons.Filled.Contacts
    IzinSozlugu.Grup.ARAMA_KAYITLARI -> Icons.Filled.Call
    IzinSozlugu.Grup.TELEFON -> Icons.Filled.Phone
    IzinSozlugu.Grup.KONUM, IzinSozlugu.Grup.ARKA_PLAN_KONUM -> Icons.Filled.LocationOn
    IzinSozlugu.Grup.MIKROFON -> Icons.Filled.Mic
    IzinSozlugu.Grup.KAMERA -> Icons.Filled.PhotoCamera
    IzinSozlugu.Grup.TAKVIM -> Icons.Filled.CalendarMonth
    IzinSozlugu.Grup.MEDYA -> Icons.Filled.Photo
    IzinSozlugu.Grup.TUM_DOSYALAR -> Icons.Filled.Folder
    IzinSozlugu.Grup.VUCUT -> Icons.Filled.MonitorHeart
    IzinSozlugu.Grup.UST_KATMAN -> Icons.Filled.Layers
    IzinSozlugu.Grup.UYGULAMA_YUKLEME -> Icons.Filled.InstallMobile
    IzinSozlugu.Grup.KULLANIM_VERISI -> Icons.Filled.QueryStats
    IzinSozlugu.Grup.ERISILEBILIRLIK -> Icons.Filled.Accessibility
    IzinSozlugu.Grup.CIHAZ_YONETICISI -> Icons.Filled.AdminPanelSettings
    IzinSozlugu.Grup.BILDIRIM_ERISIMI -> Icons.Filled.Notifications
    IzinSozlugu.Grup.UYGULAMA_LISTESI -> Icons.Filled.Apps
}

fun izinSatirlari(u: UygulamaDegerlendirici.UygulamaBilgisi): List<IzinSatiri> {
    val gruplar = linkedMapOf<IzinSozlugu.Grup, MutableList<Pair<String, IzinSozlugu.Tanim>>>()
    u.izinler.keys.forEach { izin ->
        val t = IzinSozlugu.tanim(izin) ?: return@forEach
        if (!t.grup.hassas) return@forEach
        gruplar.getOrPut(t.grup) { mutableListOf() } += izin to t
    }
    val satirlar = gruplar.entries.sortedBy { it.key.ordinal }.map { (grup, izinler) ->
        val tur = izinler.first().second.tur
        val (durum, acik) = when {
            grup == IzinSozlugu.Grup.UYGULAMA_YUKLEME && u.bilinmeyenKaynakIzni == true -> "Açık" to true
            grup == IzinSozlugu.Grup.UYGULAMA_YUKLEME && u.bilinmeyenKaynakIzni == false -> "Kapalı" to false
            tur == IzinSozlugu.Tur.CALISMA_ZAMANI ->
                if (izinler.any { u.izinler[it.first] == true }) "Verilmiş" to true else "Verilmemiş" to false
            else -> "Ayarlara bak" to false
        }
        IzinSatiri(grup, durum, acik, izinler.map { IzinSozlugu.kisaAd(it.first) })
    }.toMutableList()
    // Hizmet izinleri "istenen izin" listesinde görünmez; açık olduklarını ayrıca biliyoruz.
    if (u.erisilebilirlikAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.ERISILEBILIRLIK, "Açık", true, emptyList()))
    if (u.cihazYoneticisiAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.CIHAZ_YONETICISI, "Etkin", true, emptyList()))
    if (u.bildirimErisimiAcik) satirlar.add(0, IzinSatiri(IzinSozlugu.Grup.BILDIRIM_ERISIMI, "Açık", true, emptyList()))
    return satirlar
}

@Composable
fun BilgiSatirlari(satirlar: List<Pair<String, String>>) {
    Grup {
        satirlar.forEachIndexed { i, (etiket, deger) ->
            if (i > 0) GrupAyraci(16.dp)
            Satir(etiket, deger)
        }
    }
}

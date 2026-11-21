package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.text.input.KeyboardType
import com.cepakil.analiz.EpostaBulucu
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Shop
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.AyarYonlendirici
import com.cepakil.veri.UygulamaKaynagi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Bir uygulamayı iz bırakmadan kaldırma rehberi.
 *
 * CepAkıl hiçbir uygulamayı kendisi silmez: kaldırma düğmesi Android'in kendi
 * onay penceresini açar. Kaldırma, uygulamanın telefondaki özel verilerini
 * (girişler, kayıtlı bilgiler, önbellek) Android tarafından siler. Geriye
 * kalabilecek izler (ortak klasörlerdeki dosyalar, eklenen hesap, şirketin
 * sunucusundaki veriler) için kullanıcı adım adım yönlendirilir.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun KaldirmaEkrani(paket: String, geri: () -> Unit) {
    val context = LocalContext.current
    val kaynak = remember { UygulamaKaynagi(context.applicationContext) }
    // İlk açılıştaki bilgi: kaldırıldıktan sonra da adı ve işaretleri göstermek için saklanır.
    var ilk by remember(paket) { mutableStateOf<UygulamaDegerlendirici.Sonuc?>(null) }
    var yuklu by remember(paket) { mutableStateOf<Boolean?>(null) }

    suspend fun denetle() {
        val b = withContext(Dispatchers.Default) { kaynak.uygulama(paket) }
        if (b != null && ilk == null) ilk = UygulamaDegerlendirici.degerlendir(b)
        yuklu = b != null
    }
    LaunchedEffect(paket) { denetle() }
    // Android'in kaldırma penceresinden dönünce uygulamanın gidip gitmediğine bak.
    var yeniden by remember { mutableStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { yeniden++ }
    LaunchedEffect(yeniden) { if (yeniden > 0) denetle() }

    // Silme talebi için: uygulamanın içinde şirketin e-posta adresi (kaldırmadan önce okunmalı).
    var adresler by remember(paket) { mutableStateOf<List<String>?>(null) }
    var alici by rememberSaveable(paket) { mutableStateOf("") }
    var adSoyad by rememberSaveable { mutableStateOf("") }
    var hesap by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(paket) {
        val bulunan = withContext(Dispatchers.IO) {
            try {
                EpostaBulucu.bul(kaynak.apkDosyalari(paket).map { f -> { f.inputStream() } }, paket)
            } catch (e: Throwable) { emptyList() }
        }
        adresler = bulunan
        if (alici.isBlank()) alici = bulunan.firstOrNull().orEmpty()
    }

    val s = ilk
    val ad = s?.bilgi?.ad ?: paket
    val riskli = s != null && (s.seviye == Seviye.KIRMIZI || s.seviye == Seviye.SARI)

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Tamamen kaldır", geri)
        if (yuklu == null) {
            Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) { CircularProgressIndicator() }
            return@Column
        }
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (yuklu == true) {
                item {
                    Text(
                        "\"$ad\" uygulamasını ve telefondaki izlerini kaldırmak için adımları sırayla izle.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
                var no = 1
                if (s?.bilgi?.cihazYoneticisiAcik == true) {
                    val n = no++
                    item {
                        Adim(n, "Önce cihaz yöneticisi yetkisini kaldır",
                            "Bu uygulama cihaz yöneticisi olarak etkin; Android bu yetki kaldırılmadan uygulamayı silmeye izin vermez.") {
                            IkincilDugme("Cihaz yöneticisi ayarlarını aç", { AyarYonlendirici.cihazYoneticileri(context) }, ikon = Icons.Filled.AdminPanelSettings)
                        }
                    }
                }
                val n2 = no++
                item {
                    Adim(n2, "Hesabını ve verilerini sildir (önce yapılmalı)",
                        "Üye olduysan bilgilerin şirketin sunucusunda durur; uygulamayı kaldırmak bunları silmez. " +
                            "CepAkıl şirkete KVKK silme talebini hazırlar: adresi uygulamanın içinden bulur, metni bilgilerinle doldurur. Sana yalnız e-postada \"Gönder\"e basmak kalır.") {
                        val liste = adresler
                        when {
                            liste == null -> Row(verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                                Spacer(Modifier.size(10.dp))
                                Text("Şirketin e-posta adresi uygulamanın içinde aranıyor…", style = MaterialTheme.typography.bodyMedium)
                            }
                            liste.isEmpty() -> Text(
                                "Uygulamanın içinde şirket adresi bulunamadı. Play Store sayfasındaki \"Uygulama desteği / Geliştirici iletişim\" bölümündeki e-postayı aşağıya yaz.",
                                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            liste.size > 1 -> FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                liste.forEach { a -> FilterChip(selected = alici == a, onClick = { alici = a }, label = { Text(a, style = MaterialTheme.typography.labelMedium) }) }
                            }
                        }
                        Spacer(Modifier.size(8.dp))
                        OutlinedTextField(alici, { alici = it }, label = { Text("Şirketin e-posta adresi") }, singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
                        Spacer(Modifier.size(6.dp))
                        OutlinedTextField(adSoyad, { adSoyad = it }, label = { Text("Ad soyad") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
                        Spacer(Modifier.size(6.dp))
                        OutlinedTextField(hesap, { hesap = it }, label = { Text("Hesaptaki e-posta ya da telefon") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
                        Spacer(Modifier.size(10.dp))
                        BuyukDugme("Silme talebini gönder", { AyarYonlendirici.silmeTalebiEpostasi(context, ad, paket, alici, adSoyad, hesap) }, ikon = Icons.Filled.Email)
                        Text(
                            "E-posta uygulaman her şeyi doldurulmuş olarak açılır; kontrol edip Gönder'e bas. Talebin \"Gönderilenler\"de kanıt olarak kalır. Şirket 30 gün içinde yanıt vermek zorundadır. Yazdığın bilgiler CepAkıl'da saklanmaz.",
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                        Spacer(Modifier.size(10.dp))
                        IkincilDugme("Uygulamada \"Hesabımı sil\" ara", { AyarYonlendirici.uygulamayiAc(context, paket) }, ikon = Icons.AutoMirrored.Filled.OpenInNew)
                        Spacer(Modifier.size(8.dp))
                        IkincilDugme("Play veri silme sayfasını aç", { AyarYonlendirici.veriGuvenligiSayfasi(context, paket) }, ikon = Icons.Filled.Shop)
                    }
                }
                val n3 = no++
                item {
                    Adim(n3, "Uygulamayı kaldır",
                        "Android'in onay penceresi açılır. Kaldırınca uygulamanın telefondaki tüm özel verileri (girişler, kayıtlı bilgiler, önbellek) Android tarafından silinir. " +
                            "Pencerede \"uygulama verilerini sakla\" seçeneği çıkarsa İŞARETLEME.") {
                        BuyukDugme("Uygulamayı kaldır", { AyarYonlendirici.kaldir(context, paket) }, ikon = Icons.Filled.DeleteForever)
                    }
                }
                item { KalanIzler(no, riskli) }
            } else {
                item {
                    Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                        DurumKarti(
                            Seviye.YESIL, "Uygulama kaldırıldı",
                            "\"$ad\" ve telefondaki özel verileri silindi. Aşağıdaki adımlarla geride kalabilecek izleri de temizle.",
                        )
                    }
                }
                item { KalanIzler(1, riskli) }
            }
            item {
                SinirNotu(
                    "CepAkıl hiçbir uygulamayı kendisi silemez; Android her kaldırmada senin onayını ister. Başka uygulamaların ortak klasörlere bıraktığı dosyaları ve " +
                        "şirketlerin sunucularındaki verileri CepAkıl göremez; bunlar için seni ilgili ekrana yönlendirir.",
                )
            }
        }
    }
}

@Composable
private fun KalanIzler(baslangic: Int, riskli: Boolean) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Adim(baslangic, "Ortak klasörlerde kalan dosyalar",
            "Uygulamanın indirdiği ya da kaydettiği dosyalar (ör. İndirilenler, Belgeler, uygulama adını taşıyan klasörler) kaldırınca silinmeyebilir. Göz at, gerekmeyenleri sil.") {
            IkincilDugme("İndirilenler'i aç", { AyarYonlendirici.indirilenler(context) }, ikon = Icons.Filled.Download)
        }
        Adim(baslangic + 1, "Telefona eklenen hesap",
            "Uygulama Ayarlar > Hesaplar bölümüne kendi hesabını eklediyse orada kalabilir. Listede gördüğün o uygulamaya ait hesabı kaldır.") {
            IkincilDugme("Hesaplar ayarlarını aç", { AyarYonlendirici.hesaplar(context) }, ikon = Icons.Filled.AccountCircle)
        }
        Adim(baslangic + 2, "Girdiğin bilgiler",
            (if (riskli) "Bu uygulama işaretlenmişti. " else "") +
                "Bu uygulamaya şifre girdiysen o şifreyi (ve aynı şifreyi kullandığın her yerde) değiştir. Kart bilgisi girdiysen bankanı arayıp kartı kapattır. " +
                "Uygulamayı kaldırmak, daha önce dışarı gönderilmiş olabilecek bilgileri geri getirmez.") {}
    }
}

@Composable
private fun Adim(no: Int, baslik: String, aciklama: String, eylemler: @Composable () -> Unit) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text("$no. $baslik", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.size(6.dp))
            Text(aciklama, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.size(10.dp))
            eylemler()
        }
    }
}

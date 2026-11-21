package com.cepkalkan.ui.ekranlar

import android.os.Build
import android.text.format.Formatter
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cepkalkan.analiz.DosyaDenetleyici
import com.cepkalkan.analiz.Seviye
import com.cepkalkan.ui.DosyaViewModel
import com.cepkalkan.ui.bilesenler.Baglam
import com.cepkalkan.ui.bilesenler.BilgiDurumu
import com.cepkalkan.ui.bilesenler.BolumBasligi
import com.cepkalkan.ui.bilesenler.BulguKarti
import com.cepkalkan.ui.bilesenler.BuyukDugme
import com.cepkalkan.ui.bilesenler.DurumKarti
import com.cepkalkan.ui.bilesenler.IkincilDugme
import com.cepkalkan.ui.bilesenler.SinirNotu
import com.cepkalkan.ui.bilesenler.UstCubuk

@Composable
fun DosyaEkrani(vm: DosyaViewModel) {
    val durum by vm.durum.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val pano = LocalClipboardManager.current
    // Android'in sistem dosya seçicisi: depolama izni gerekmez, yalnız seçilen dosyaya erişilir.
    val secici = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> vm.secildi(uri) }
    val sec = { secici.launch(arrayOf("*/*")) }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Dosya Kontrolü")
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    "Kontrol etmek istediğin dosyayı Android'in dosya seçicisiyle seç. CepKalkan yalnız seçtiğin dosyayı okur; " +
                        "dosyayı değiştirmez, silmez ve hiçbir yere göndermez.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            item {
                BuyukDugme(
                    if (durum is DosyaViewModel.Durum.Sonuc) "Başka dosya seç" else "Dosya seç",
                    sec,
                    ikon = Icons.Filled.FolderOpen,
                    yukleniyor = durum is DosyaViewModel.Durum.Inceleniyor,
                )
            }

            when (val d = durum) {
                DosyaViewModel.Durum.Bos -> item {
                    BilgiDurumu(
                        Icons.AutoMirrored.Filled.InsertDriveFile, "Henüz dosya seçilmedi",
                        "Örneğin WhatsApp ya da e-postayla gelen bir PDF, APK veya ZIP dosyasını seçebilirsin.",
                    )
                }
                DosyaViewModel.Durum.SecimIptal -> item {
                    BilgiDurumu(
                        Icons.AutoMirrored.Filled.InsertDriveFile, "Dosya seçilmedi",
                        "Dosya seçici kapatıldı. CepKalkan sen bir dosya seçmeden hiçbir dosyaya erişemez.",
                        "Tekrar dene", sec,
                    )
                }
                DosyaViewModel.Durum.Inceleniyor -> item {
                    Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(Modifier.size(12.dp))
                        Text("Dosya inceleniyor…", style = MaterialTheme.typography.bodyLarge)
                    }
                }
                is DosyaViewModel.Durum.Hata -> item {
                    BilgiDurumu(Icons.Filled.ErrorOutline, "Dosya incelenemedi", d.mesaj, "Başka dosya seç", sec)
                }
                is DosyaViewModel.Durum.Sonuc -> {
                    val s = d.sonuc
                    item {
                        val baslik = when (s.seviye) {
                            Seviye.KIRMIZI -> "Tehlike göstergeleri bulundu"
                            Seviye.SARI -> "İncelemen gereken işaretler var"
                            else -> "Bilinen göstergelere göre risk bulunamadı"
                        }
                        val aciklama = when (s.seviye) {
                            Seviye.KIRMIZI -> "Bu dosyayı açmaman önerilir."
                            Seviye.SARI -> "Kimden geldiğinden emin değilsen açma."
                            else -> "Bu, dosyanın temiz olduğu anlamına gelmez; CepKalkan zararlı yazılım imza veritabanı kullanmaz."
                        }
                        Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                            DurumKarti(s.seviye, baslik, aciklama, Baglam.DOSYA)
                        }
                    }
                    item {
                        BilgiSatirlari(
                            listOfNotNull(
                                "Dosya adı" to s.ad,
                                "Gerçek türü" to s.tur.ad,
                                "Boyut" to Formatter.formatFileSize(context, s.boyut),
                                s.apk?.paket?.let { "Paket adı" to it },
                                s.apk?.surum?.let { "Sürüm" to it },
                            ),
                        )
                    }
                    if (s.bulgular.isNotEmpty()) {
                        item { BolumBasligi("Bulunan işaretler") }
                        items(s.bulgular) { BulguKarti(it, Baglam.DOSYA) }
                    }
                    item { BolumBasligi("Dosyanın parmak izi (SHA-256)") }
                    item {
                        SelectionContainer {
                            Text(s.sha256, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                        }
                        Text(
                            "Bu kod dosyaya özgüdür. İstersen kendin bir tarama hizmetinde aratabilirsin; CepKalkan bunu senin yerine hiçbir yere göndermez.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                        Spacer(Modifier.size(8.dp))
                        IkincilDugme("Parmak izini kopyala", {
                            pano.setText(AnnotatedString(s.sha256))
                            if (Build.VERSION.SDK_INT < 33) Toast.makeText(context, "Kopyalandı", Toast.LENGTH_SHORT).show()
                        }, ikon = Icons.Filled.ContentCopy)
                    }
                    item { SinirNotu(DosyaDenetleyici.SINIR_NOTU) }
                }
            }

            if (durum !is DosyaViewModel.Durum.Sonuc) {
                item {
                    SinirNotu(
                        "Dosyanın gerçek türü, adı ve uzantısı karşılaştırılır; APK izinleri, makrolu Office belgeleri, PDF içindeki " +
                            "JavaScript ve arşivdeki program dosyaları aranır. Zararlı yazılım imza veritabanı kullanılmaz; bu yüzden " +
                            "hiçbir dosya \"temiz\" ilan edilmez.",
                        "Neler kontrol edilir?",
                    )
                }
            }
        }
    }
}

package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cepakil.ui.TaramaViewModel
import com.cepakil.ui.UygulamalarViewModel
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.TaramaDeposu

@Composable
fun AyarlarEkrani(taramaVm: TaramaViewModel, uygulamalarVm: UygulamalarViewModel) {
    val context = LocalContext.current
    val sistemDahil by uygulamalarVm.sistemDahil.collectAsStateWithLifecycle()
    val tarama by taramaVm.durum.collectAsStateWithLifecycle()
    var silOnayi by rememberSaveable { mutableStateOf(false) }
    var silindi by rememberSaveable { mutableStateOf(false) }
    val surum = remember {
        try { context.packageManager.getPackageInfo(context.packageName, 0).versionName } catch (e: Exception) { null } ?: "?"
    }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Ayarlar")
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { BolumBasligi("Tarama") }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                        .toggleable(value = sistemDahil, role = Role.Switch, onValueChange = uygulamalarVm::sistemDahilDegistir),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Sistem uygulamalarını da incele", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "Telefonla gelen uygulamalar da listelenir. Genellikle gerekmez; liste uzar.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(checked = sistemDahil, onCheckedChange = null)
                }
            }

            item { BolumBasligi("Gizlilik") }
            item {
                Madde(
                    "İnternet izni yok", "CepAkıl'ın internete bağlanma izni yoktur. Dosyaların, bağlantıların, uygulama listen ve tarama sonuçların hiçbir sunucuya gönderilemez. " +
                        "Reklam, analiz ya da takip aracı içermez.",
                )
            }
            item { Madde("Veriler telefonda kalır", "Yalnız son tarama özeti bu uygulamanın kendi klasöründe saklanır. Buluta yedeklenmez, başka telefona aktarılmaz.") }
            item {
                Madde(
                    "Dosyalara yalnız seçtiğinde erişilir",
                    "Dosya kontrolü Android'in dosya seçicisini kullanır; depolama izni istenmez. Seçilen dosya değiştirilmez ve silinmez. " +
                        "APK dosyaları incelenirken Android'in paket okuyucusu için uygulamanın kendi önbelleğine geçici bir kopya alınır ve inceleme biter bitmez silinir.",
                )
            }
            item { Madde("Arka planda çalışmaz", "Gizli izleme, zamanlanmış tarama ya da otomatik silme yoktur. Her kontrol yalnız sen başlattığında yapılır.") }
            item { Madde("Pano yalnız sen istediğinde okunur", "Bağlantı kontrolündeki \"Panodan yapıştır\" düğmesine basmadıkça panodaki metin okunmaz.") }

            item { BolumBasligi("İzinler ve nedenleri") }
            item {
                Madde(
                    "Uygulama listesini görme (QUERY_ALL_PACKAGES)",
                    "CepAkıl'ın istediği tek izin budur. Android 11 ve sonrasında telefondaki uygulamaları listeleyip izinlerini göstermek için gerekir. " +
                        "Yükleme sırasında verilir, ayrıca sorulmaz. Bu izinle uygulamaların yalnız adı, sürümü, nereden yüklendiği ve istediği izinler okunur; uygulamaların içindeki verilere erişilemez.",
                )
            }
            item {
                Madde(
                    "İstenmeyen izinler",
                    "SMS, kişiler, konum, mikrofon, kamera, depolama, bildirim, erişilebilirlik ve cihaz yöneticisi izinleri bilerek istenmez. " +
                        "Bu yüzden CepAkıl sana hiçbir izin penceresi göstermez.",
                )
            }

            item { BolumBasligi("CepAkıl neleri yapamaz?") }
            item {
                Madde(
                    "Antivirüs değildir",
                    "Zararlı yazılım imza veritabanı kullanmaz, uygulamaların kodunu incelemez. Bulduğu işaretler \"incele\" önerisidir, kesin hüküm değildir.",
                )
            }
            item {
                Madde(
                    "Android'in sınırları",
                    "Android, normal uygulamaların diğer uygulamaların dosyalarına, ağ trafiğine ve bellek içeriğine erişmesine izin vermez. " +
                        "Bu yüzden hiçbir uygulama (CepAkıl dahil) telefonun tamamen güvende olduğunu doğrulayamaz. Uygulamaları silmek ya da durdurmak için her zaman Android'in kendi ekranı kullanılır.",
                )
            }
            item {
                Madde(
                    "Bağlantılar açılmaz",
                    "Bağlantı kontrolü internete bağlanmadan yalnız adresin yazılışına bakar. Yeni açılmış sahte siteleri tanıyamaz; bu yüzden hiçbir bağlantıyı \"güvenli\" ilan etmez.",
                )
            }

            item { BolumBasligi("Kayıtlı veriler") }
            item {
                if (tarama.kayit == null) {
                    Text(
                        if (silindi) "Tarama kaydı silindi." else "Kayıtlı tarama sonucu yok.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                } else {
                    IkincilDugme("Son tarama kaydını sil", { silOnayi = true }, ikon = Icons.Filled.DeleteOutline)
                }
            }

            item { BolumBasligi("Hakkında") }
            item { Text("CepAkıl sürüm $surum · Tüm kontroller telefonun üzerinde çalışır.", style = MaterialTheme.typography.bodyMedium) }
        }
    }

    if (silOnayi) {
        AlertDialog(
            onDismissRequest = { silOnayi = false },
            title = { Text("Tarama kaydı silinsin mi?") },
            text = { Text("Son taramanın özeti bu telefondan silinir. Uygulamalarına ya da dosyalarına dokunulmaz.") },
            confirmButton = {
                TextButton(onClick = {
                    TaramaDeposu(context).sil()
                    taramaVm.yenidenYukle()
                    silindi = true
                    silOnayi = false
                }) { Text("Sil") }
            },
            dismissButton = { TextButton(onClick = { silOnayi = false }) { Text("Vazgeç") } },
        )
    }
}

@Composable
private fun Madde(baslik: String, aciklama: String) {
    Column(Modifier.fillMaxWidth()) {
        Text(baslik, style = MaterialTheme.typography.titleSmall)
        Text(aciklama, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
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
import androidx.compose.runtime.rememberCoroutineScope
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun AyarlarEkrani(taramaVm: TaramaViewModel, uygulamalarVm: UygulamalarViewModel) {
    val context = LocalContext.current
    val sistemDahil by uygulamalarVm.sistemDahil.collectAsStateWithLifecycle()
    val tarama by taramaVm.durum.collectAsStateWithLifecycle()
    var silOnayi by rememberSaveable { mutableStateOf(false) }
    val kapsam = rememberCoroutineScope()
    var surumDenetleniyor by remember { mutableStateOf(false) }
    var surumSonucu by remember { mutableStateOf<String?>(null) }
    var yeniSurum by remember { mutableStateOf<Int?>(null) }
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
            item { BolumBasligi("Koruma") }
            item { KorumaBolumu() }

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
                    "Hiçbir verin gönderilmez", "CepAkıl internete yalnız herkese açık tehdit listelerini İNDİRMEK için çıkar. Dosyaların, mesajların, bağlantıların, " +
                        "açtığın siteler, uygulama listen ve tarama sonuçların hiçbir sunucuya gönderilmez; karşılaştırma telefonda yapılır. " +
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
            item {
                Madde(
                    "Arka planda yalnız senin açtıkların çalışır",
                    "Liste güncellemesi, anlık uygulama koruması ve web koruması yukarıdaki anahtarlarla açılıp kapatılır. " +
                        "Gizli izleme ya da otomatik silme yoktur; uyarılar bildirim olarak gelir, kararı sen verirsin.",
                )
            }
            item { Madde("Pano yalnız sen istediğinde okunur", "Bağlantı kontrolündeki \"Panodan yapıştır\" düğmesine basmadıkça panodaki metin okunmaz.") }

            item { BolumBasligi("İzinler ve nedenleri") }
            item {
                Madde(
                    "Uygulama listesini görme (QUERY_ALL_PACKAGES)",
                    "Android 11 ve sonrasında telefondaki uygulamaları listeleyip izinlerini göstermek için gerekir. " +
                        "Yükleme sırasında verilir, ayrıca sorulmaz. Bu izinle uygulamaların yalnız adı, sürümü, nereden yüklendiği ve istediği izinler okunur; uygulamaların içindeki verilere erişilemez.",
                )
            }
            item {
                Madde(
                    "Uygulama kaldırma penceresini açma (REQUEST_DELETE_PACKAGES)",
                    "\"Tamamen kaldır\" düğmesinin Android'in kaldırma onay penceresini açabilmesi için. Yükleme sırasında verilir. Bu izinle hiçbir uygulama sessizce silinemez; Android her seferinde sana sorar.",
                )
            }
            item {
                Madde(
                    "Ağ durumunu görme (ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE)",
                    "Wi-Fi kontrolü için: bağlı olduğun ağın şifresiz ya da eski şifreli olup olmadığını okur. Yükleme sırasında verilir. İnternete erişim SAĞLAMAZ; ağ adı ve konum okunmaz.",
                )
            }
            item {
                Madde(
                    "İnternet (INTERNET)",
                    "Yalnız herkese açık tehdit listelerini indirmek ve web korumasında site adı sorgularını telefonun kendi DNS sunucusuna iletmek için. Yükleme sırasında verilir.",
                )
            }
            item {
                Madde(
                    "Bildirim gösterme (POST_NOTIFICATIONS)",
                    "Anlık koruma ve web koruması seni uyarabilsin diye. Android 13 ve sonrasında yalnız bu özelliklerden birini açtığında sorulur.",
                )
            }
            item {
                Madde(
                    "Açılışta başlama, sürekli çalışma ve pil (RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)",
                    "Web koruması telefon yeniden başlayınca kendiliğinden açılsın, Android onu uyutmasın ve \"pil kısıtlamasını kaldır\" sorusu gösterilebilsin diye. Kişisel veriye erişim vermezler.",
                )
            }
            item {
                Madde(
                    "VPN (isteğe bağlı)",
                    "Yalnız \"Web koruması\" açıksa. Android onay penceresi gösterir. Yalnız site adı sorguları telefonda denetlenir; trafiğin başka bir sunucuya yönlendirilmez.",
                )
            }
            item {
                Madde(
                    "İstenmeyen izinler",
                    "SMS, kişiler, arama kayıtları, konum, mikrofon, kamera, depolama, erişilebilirlik, bildirim okuma ve cihaz yöneticisi izinleri bilerek istenmez. Bu sayede Google Play Protect kurulumu engellemez.",
                )
            }

            item { BolumBasligi("CepAkıl neleri yapamaz?") }
            item {
                Madde(
                    "Kesin hüküm vermez",
                    "Tehdit listeleri yalnız bilinen ve bildirilmiş zararlıları içerir; yeni çıkmış bir tehdidi tanımayabilir. " +
                        "Bulunan işaretler \"incele\" önerisidir; bir şey bulunmaması güvenli olduğu anlamına gelmez.",
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
                    "Bağlantı kontrolü adresi açmaz; yazılışına ve telefondaki tehdit listelerine bakar. Çok yeni açılmış sahte siteleri tanımayabilir; bu yüzden hiçbir bağlantıyı \"güvenli\" ilan etmez.",
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
            item { Text("CepAkıl sürüm $surum · Tüm kontroller telefonun üzerinde yapılır.", style = MaterialTheme.typography.bodyMedium) }
            item {
                Column {
                    IkincilDugme(if (surumDenetleniyor) "Denetleniyor…" else "Yeni sürüm var mı?", {
                        if (!surumDenetleniyor) {
                            surumDenetleniyor = true
                            kapsam.launch {
                                val yeni = withContext(Dispatchers.IO) { com.cepakil.koruma.Guncelleme.denetle(context) }
                                yeniSurum = yeni
                                surumSonucu = when {
                                    yeni != null -> "Yeni sürüm var: 0.2.$yeni"
                                    com.cepakil.koruma.KorumaAyarlari(context).yayindakiSurum > 0 -> "En güncel sürümü kullanıyorsun."
                                    else -> "Denetlenemedi. İnternet bağlantını kontrol et."
                                }
                                surumDenetleniyor = false
                            }
                        }
                    })
                    surumSonucu?.let { Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp)) }
                    yeniSurum?.let {
                        TextButton(onClick = { com.cepakil.veri.AyarYonlendirici.tarayicidaAc(context, com.cepakil.koruma.Guncelleme.APK_ADRESI) }) { Text("İndir") }
                    }
                    Text(
                        "Bu düğme yalnız küçük bir sürüm bilgisini okur; hiçbir verin gönderilmez. İndirilen dosyayı açınca kurulumu Android sana sorar.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
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

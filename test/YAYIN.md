# Yayın kuralı (YemAkıl Rasyon)

1. `node test/selftest.js /mnt/user-data/outputs/rasyon.html` çalıştır. **Tek bir ✗ varsa yayınlama.**
2. Düzeltilen her hata için selftest.js'e bir "altın örnek" ekle (aynı hata ikinci kez geçemez).
3. Yeni modül eklenince: tutarlılık kontrolü (veri tabloları birbirini görüyor mu), bir sayısal altın örnek (ders kitabı değeriyle), bir UI kontrolü (390 px, JS hatası) ekle.
4. Sürüm etiketini ve sw.js önbellek adını artır; index.html'yi rfind(`</body></html>`) ile üret; commit; GitHub Pages yayını tamamlanınca linki gönder.
5. Her 5 sürümde bir bağımsız gözden geçirme (taze gözle 4 paralel denetim) yaptır.
6. **Otomatik yayın (kullanıcı onayı, 2026-11-07):** Öz-denetim tamamen geçerse (tek ✗ yok) değişiklik çalışma dalına commit+push edilir, PR açılır ve kullanıcıya ayrıca sormadan `main`'e birleştirilir (GitHub Pages yayını). Tek bir ✗ varsa birleştirme yapılmaz, kullanıcıya bildirilir. Birleştirmeden sonra kullanıcıya yeni sürüm numarası ve telefonda bir kez yeniden açması gerektiği söylenir.
7. **Deneme sürümü (2026-11-09):** Yeni özellikler önce `deneme/index.html`'e yazılır (site adresi `/deneme/`; veriler `rasyon-v1-deneme` anahtarında, asıl verilere dokunmaz; servis çalışanı kaydedilmez). Kullanıcı deneyip "yayına al" deyince `deneme/index.html` → `index.html` kopyalanır, sürüm etiketi ve sw.js önbellek adı artırılır. Kullanıcıyı etkileyen acil hata düzeltmeleri doğrudan ikisine de uygulanabilir.
8. **Otomatik öz-denetim (GitHub Actions):** `.github/workflows/selftest.yml` her push ve PR'da asıl ve deneme sürümünü test eder. PR'da bu kontrol yeşil olmadan `main`'e birleştirme yapılmaz (madde 6 bu koşulla geçerlidir).

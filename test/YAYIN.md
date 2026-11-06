# Yayın kuralı (YemAkıl Rasyon)

1. `node test/selftest.js /mnt/user-data/outputs/rasyon.html` çalıştır. **Tek bir ✗ varsa yayınlama.**
2. Düzeltilen her hata için selftest.js'e bir "altın örnek" ekle (aynı hata ikinci kez geçemez).
3. Yeni modül eklenince: tutarlılık kontrolü (veri tabloları birbirini görüyor mu), bir sayısal altın örnek (ders kitabı değeriyle), bir UI kontrolü (390 px, JS hatası) ekle.
4. Sürüm etiketini ve sw.js önbellek adını artır; index.html'yi rfind(`</body></html>`) ile üret; commit; GitHub Pages yayını tamamlanınca linki gönder.
5. Her 5 sürümde bir bağımsız gözden geçirme (taze gözle 4 paralel denetim) yaptır.

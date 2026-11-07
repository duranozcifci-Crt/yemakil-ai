# YemAkıl — çalışma notları

- Uygulama tek dosya: `index.html` (PWA, GitHub Pages `main` dalından yayınlanır).
- Yayın kuralları: `test/YAYIN.md` — her değişiklikten önce okuyun.
- Öz-denetim: `node test/selftest.js index.html` → tamamı geçerse kullanıcı onayıyla otomatik olarak `main`'e birleştirilir (YAYIN.md madde 6).
- Kullanıcıyla Türkçe, teknik olmayan bir dille konuşun.
- Referans (kararlı) sürümler — geri dönüş noktaları; bu dallara asla yazmayın:
  - `kararli-v104` (V104, 108/108 test) — **güncel referans**: tek tuşla tam çözüm (ek tablo + katkı planı), çiftlik rasyonuna dönüş, premiks aktarımı, sıfırdan karışımda fabrika yemleri.
  - `kararli-v100` (V100, 83/83 test) — bağımsız denetim düzeltmeleri.
  Kullanıcı "vXXX'e geri dön" derse `main`'i ilgili dalın içeriğine döndüren yeni bir commit yapın (geçmişi silmeden).

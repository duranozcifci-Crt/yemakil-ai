# YemAkıl — çalışma notları

- Uygulama tek dosya: `index.html` (PWA, GitHub Pages `main` dalından yayınlanır).
- Yayın kuralları: `test/YAYIN.md` — her değişiklikten önce okuyun.
- Öz-denetim: `node test/selftest.js index.html` → tamamı geçerse kullanıcı onayıyla otomatik olarak `main`'e birleştirilir (YAYIN.md madde 6).
- Kullanıcıyla Türkçe, teknik olmayan bir dille konuşun.
- Referans (kararlı) sürümler — geri dönüş noktaları; bu dallara asla yazmayın:
  - `kararli-v109` (V109, 147/147 test) — **güncel referans**: V105 + besi sağlık riskleri (asidoz/apse, şişme, idrar taşı, PEM, sıcak stresi), çiftlik yemi sağlık ve yem güvenliği riskleri (üre, gossipol, aflatoksin, yasal sınırlar), etiket okuma iyileştirmeleri (42 etiketlik derlem, %99,7), premiks rasyon toplamı/yasal sınır kontrolü, etiketten çiftlik rasyonuna ekleme ve birlikte değerlendirme.
  - `kararli-v105` (V105, 118/118 test): V104 + sağmal inek sağlık ve döl riskleri (asidoz/SARA, ketozis, döl tutma–kızgınlık; kaynaklı eşikler, dozlu öneriler), risk odaklı tek tuş çözüm, MUN/doğumdaki kondisyon/sıcaklık girdileri.
  - `kararli-v104` (V104, 108/108 test): tek tuşla tam çözüm (ek tablo + katkı planı), çiftlik rasyonuna dönüş, premiks aktarımı, sıfırdan karışımda fabrika yemleri.
  - `kararli-v100` (V100, 83/83 test) — bağımsız denetim düzeltmeleri.
  Kullanıcı "vXXX'e geri dön" derse `main`'i ilgili dalın içeriğine döndüren yeni bir commit yapın (geçmişi silmeden).

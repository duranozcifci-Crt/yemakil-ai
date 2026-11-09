/* ===== Hastalık rehberi (V115): beslenmeye bağlı hastalıklar — belirti, ilk müdahale, tedavi seçenekleri (etken madde/grup, DOZSUZ), sık hatalar, önleme. Kaynak: Merck Veterinary Manual (MSD), NASEM 2021 ve hakemli çalışmalar. Teşhis ve reçeteli tedavi veteriner hekimindir. ===== */
var HZS={ist:"İştah azaldı, yem bırakıyor",kesif:"Kesif yemi bırakıp yalnız kaba yem yiyor",sut:"Süt verimi birden düştü",yat:"Yatıyor, kalkamıyor",tit:"Kas titremesi, seğirme, sendeleme",soguk:"Kulak, burun, ayaklar soğuk",aseton:"Nefeste veya sütte aseton (çürük elma) kokusu",kilo:"Kondisyon hızla kayboluyor",ishal:"Sulu, köpüklü, ekşi kokulu dışkı",kuru:"Dışkı az ve kuru",solsis:"Sol karın şişkin",nefes:"Nefes darlığı, ağzı açık soluma",ping:"Sol kaburga arkasında 'ping' sesi (veteriner bulgusu)",topal:"Topallık, sırt kamburu, kısa adım",ates:"Ateş (39,5 °C üstü)",akinti:"Kötü kokulu rahim akıntısı",son:"Son (eş) 12–24 saatte atılmadı",sinir:"Aşırı hassasiyet, saldırganlık, sinirsel belirti",yag:"Süt yağı düştü (yağ/protein < 1,0)",gevis:"Geviş getirme azaldı",dogum:"Doğumdan sonraki ilk 3 hafta",dogum0:"Doğumdan hemen önce veya ilk 3 gün",mera:"Taze/yeşil meraya çıktı veya baklagil yedi",tahil:"Fazla tahıl, ekmek veya yeni kesif yedi",meme:"Memede şişlik, sütte pıhtı veya sulanma"};
var HZ={sut:[
 {k:"hipoca",n:"Süt humması (doğum felci, hipokalsemi)",rk:"",sg:{dogum0:3,dogum:1,yat:4,soguk:2,tit:2,ist:1,kuru:1},
  w:"Doğumdan önceki 24 saat ile doğumdan sonraki 72 saat. Üçüncü ve sonraki doğumlarda ve Jersey ırkında daha sık.",
  b:["1. evre (ayakta): huzursuzluk, kas titremesi, ayak değiştirme, iştahsızlık.","2. evre: göğüs üstü yatar, başını böğrüne çevirir; kulak ve burun soğuk, dışkılama durur.","3. evre: yan yatar, şişer, bilinç kaybı; tedavi edilmezse saatler içinde ölüm.","Belirtisiz (subklinik) form ketozis, abomazum kayması, sonun atılamaması ve mastitis riskini artırır."],
  i:["Hayvan ayakta ve yutabiliyorsa ağızdan kalsiyum (bolus veya jel; ürün etiketindeki doz).","Yatan hayvana ağızdan sıvı veya jel vermeyin: soluk borusuna kaçar.","Yan yatıyorsa göğüs üstüne çevirip destekleyin (şişme ve kas hasarı azalır); yumuşak zemin.","Kalkamayan ineği 3–4 saatte bir yan değiştirin; kalça kaldırıcıyı yalnız kısa süre ve doğru kullanın.","Veteriner hekimi hemen çağırın."],
  t:[["Kalsiyum boroglukonat (damardan, yavaş)","V","Yatan inekte temel tedavi; 10–20 dakikada, kalp dinlenerek verilir."],["Kalsiyum–magnezyum–fosfor–dekstroz karışık solüsyonları (damardan)","V","Magnezyum veya fosfor düşüklüğü eşlik ettiğinde."],["Deri altı kalsiyum","V","Damar içi tedaviden sonra nüksü azaltmak için; yatan inekte tek başına yetersiz (emilimi yavaş)."],["Ağızdan kalsiyum (kalsiyum klorür/propiyonat bolus veya jel)","Ç","Damar içi tedaviden 12–24 saat sonra tekrar; riskli ineklerde doğumda koruyucu. Reçetesiz."],["Fosfor (sodyum fosfat)","V","Kalsiyuma yanıt vermeyen 'kalkamayan inek' durumunda veteriner kararıyla."]],
  h:["Kalsiyumu hızlı damardan vermek: kalp ritim bozukluğu ve ani ölüm.","Yatan hayvana ağızdan sıvı vermek: zatürre (aspirasyon).","Tedavi sonrası 24–48 saatte nüksü izlememek.","Kalkamayan inekte yalnız ikinci doz kalsiyumla yetinip kas–sinir hasarı, mastitis veya fosfor düşüklüğünü araştırmamak."],
  q:["Kalsiyum ne kadar sürede verildi, kalp dinlendi mi?","Magnezyum ve fosfor da gerekli mi?","Nüksü önlemek için ağızdan kalsiyum planı var mı?"],
  o:["Doğuma son 3 haftada DCAD'ı düşürün (anyonik tuz; Holstein'da idrar pH'ı 6,0–7,0 hedef) veya kalsiyumu kısıtlayın; potasyumu yüksek kaba yemi (yonca) sınırlayın.","Rasyon magnezyumu %0,35–0,45.","Kuru dönem kondisyonu 3–3,5.","Program: kuru dönem risk kartı ve DCAD satırı."],
  a:"Yatan inek: hemen veteriner; her saat kas hasarı artar.",s:"Merck Veterinary Manual (Parturient Paresis in Cows); Goff 2008 Vet J; Oetzel 2013; NASEM 2021"},
 {k:"keto",n:"Ketozis (asetonemi) ve yağlı karaciğer",rk:"keto",sg:{dogum:3,kesif:3,sut:2,aseton:3,kilo:2,kuru:1,sinir:1,ist:1},
  w:"Doğumdan sonra 2–6. hafta; yağlı karaciğer (tip 2) ilk 2 haftada, kuru dönemde aşırı yağlanmış ineklerde.",
  b:["Önce kesif yemi bırakır, kaba yemi yemeye devam eder.","Süt verimi birden düşer, kondisyon hızla kaybolur, dışkı az ve kuru.","Nefeste ve sütte aseton kokusu (herkes alamaz).","Sinirsel tipte yalama, sendeleme, saldırganlık.","Belirtisiz (subklinik) ketozis: kan BHB ≥ 1,2 mmol/L."],
  i:["Kan keton ölçerle (BHB) doğrulayın; süt ve idrar çubukları yardımcıdır.","Ağızdan propilen glikol (ürün etiketindeki doz; genelde 3–5 gün).","Taze, lezzetli kaba yem; yemlik hep dolu."],
  t:[["Propilen glikol (ağızdan)","Ç","Temel tedavi; reçetesiz."],["Dekstroz %50 (damardan)","V","Hızlı ama kısa etkili; ağızdan propilen glikolle birlikte."],["Glukokortikoid (ör. deksametazon)","V","Reçeteli; kan şekerini yükseltir. Gebe hayvanda dikkat; arınma süresine uyun."],["B12 vitamini + fosfor (butafosfan)","V","Destek tedavisi."],["Rumen korumalı kolin","Ç","Yağlı karaciğerin önlenmesi ve desteği; rasyona katılır."],["Monensin bolusu (önleme)","V","AB'de ketozis önlemi için reçeteli bolus olarak ruhsatlı; Türkiye'deki ruhsat durumunu veteriner hekiminize sorun."]],
  h:["Yalnız damardan şeker verip ağızdan propilen glikole devam etmemek: şeker birkaç saatte düşer.","Ketozisi tek hastalık sanmak: abomazum kayması, rahim iltihabı, mastitis veya topallık arkada yatan neden olabilir.","Yağlı karaciğerli inekte kortikosteroidi tek tedavi saymak."],
  q:["Abomazum kayması veya rahim iltihabı için muayene yapıldı mı?","Propilen glikol kaç gün sürecek?","Kortikosteroid kullanıldıysa süt ve et arınma süresi ne kadar?"],
  o:["Kuru dönemde kondisyonu 3–3,5'ta tutun; aşırı yağlanmayı önleyin.","Yakın dönemde KM tüketimi düşüşünü azaltın, taze dönemde enerjiyi kademeli artırın.","Rumen korumalı kolin; riskli ineklerde doğumdan sonra 3–16. günlerde BHB taraması.","Program: ketozis risk kartı ve 'bu riske göre çözüm'."],
  a:"Sinirsel belirti, yatma veya hiç yem yememe: veteriner.",s:"Merck Veterinary Manual (Ketosis in Cattle); McArt 2012 ve 2013 JDS; Oetzel 2007; NASEM 2021"},
 {k:"acid",n:"Asidoz (akut tahıl zehirlenmesi ve SARA)",rk:"acid",sg:{tahil:3,ishal:3,solsis:1,ist:2,yag:3,gevis:2,topal:1,yat:1,sut:1},
  w:"Akut: kaçak veya fazla tahıl, ekmek, meyve yeme; ani rasyon değişikliği. SARA: yüksek nişastalı, düşük etkili lifli rasyonda sürekli.",
  b:["Akut: saatler içinde iştahsızlık, şişkin ve çalkantılı sol karın, sulu–köpüklü–ekşi kokulu gri/sarı dışkı.","Akut: susuzluk (göz çukura kaçar), sendeleme, yatma, hızlı kalp atışı; günler sonra laminit.","SARA: KM tüketimi dalgalanır, süt yağı düşer (yağ/protein < 1,0), geviş azalır.","SARA: dışkı kıvamı değişken, köpüklü, içinde sindirilmemiş tane; topallık ve karaciğer apsesi artar."],
  i:["Akutta tahılı hemen kesin, kaliteli kuru ot verin, veteriner hekimi çağırın (ilk 6–12 saat kritik).","SARA'da rasyonu programın önerisiyle düzeltin, tampon (sodyum bikarbonat) ekleyin; doz programda."],
  t:[["Ağızdan antasit / alkalileştirici (magnezyum oksit veya hidroksit)","V","Hafif–orta akut vakada veteriner yönlendirmesiyle; aşırı ve tekrarlı kullanım alkaloz yapar."],["Damardan sıvı ve sodyum bikarbonat","V","Susuzluk ve kan asidozunda."],["Rumen boşaltma (sondayla yıkama) veya rumenotomi","V","Ağır vakada."],["Tiamin (B1 vitamini)","V","Destek; PEM gelişimini önlemek için."],["Antibiyotik","V","Rumen duvarı hasarı ve karaciğer apsesi riskinde, veteriner kararıyla; reçeteli, arınma süresine uyun."],["Ağrı kesici / iltihap giderici (NSAID)","V","Laminit için; reçeteli."],["Sağlıklı inekten rumen sıvısı nakli","V","İyileşmeyi hızlandırır."]],
  h:["Antasiti bol ve tekrar tekrar vermek (alkaloz).","İyileşti diye tahılı aynı gün geri vermek: 2–3 haftada kademeli dönülmeli.","SARA'yı ilaçla çözmeye çalışmak: kalıcı çözüm rasyondadır."],
  q:["Rumen sıvısında pH ölçüldü mü?","Susuzluk ne düzeyde, sıvı tedavisi gerekli mi?","Laminit için ağrı kesici planı var mı?"],
  o:["peNDF ≥ %22, kaba yem NDF'si ≥ %19, rumende yıkılan nişasta ≤ %20–22.","Kesif geçişini 2–3 haftaya yayın; TMR elek analizi; yemlik düzeni; tampon.","Program: asidoz risk kartı ve 'bu riske göre çözüm'."],
  a:"Kaçak tahıl yeme: belirti çıkmadan veteriner (ilk 6–12 saat).",s:"Merck Veterinary Manual (Grain Overload); Oetzel 2007; Plaizier 2008; Zebeli 2012"},
 {k:"da",n:"Abomazum kayması (deplasmanı)",rk:"",sg:{dogum:2,ist:1,kesif:1,sut:1,ping:6,aseton:1,kuru:1},
  w:"Vakaların çoğu doğumdan sonraki ilk 4 haftada; çoğunlukla sola kayar.",
  b:["İştah azalır (özellikle kesif yeme), süt düşer, dışkı az ve yumuşak.","Sol son kaburgaların arkasında vurmalı dinlemede 'ping' sesi (veteriner bulgusu).","Çoğunlukla ikincil ketozis (aseton kokusu) eşlik eder.","Sağa kayma veya dönme: ani karın ağrısı, hızlı kalp atışı, sağ karın şişkin; ACİL."],
  i:["Veteriner hekim muayenesi isteyin.","Ketozis ve kalsiyum düşüklüğünü destekleyin: propilen glikol, ağızdan kalsiyum (etiket dozu)."],
  t:[["Cerrahi düzeltme (sağ veya sol karından sabitleme)","V","Kalıcı çözüm."],["Kapalı yöntemler (yuvarlama, deri dikişli sabitleme)","V","Yalnız sola kaymada; sağa kayma ve dönmede asla uygulanmaz. Daha ucuz, nüks riski daha yüksek."],["Eşlik eden ketozis ve kalsiyum düşüklüğü tedavisi","V/Ç","Propilen glikol, kalsiyum."],["Ağrı kesici ve antibiyotik","V","Ameliyat sonrası veteriner kararıyla; reçeteli, arınma süresine uyun."]],
  h:["Yalnız ketozis tedavisi yapıp kaymayı atlamak: ketozis tekrar eder.","Sağa dönmede beklemek: saatler içinde ölüm.","Yuvarlama sonrası nüksü izlememek."],
  q:["Ping sol tarafta mı, sağ tarafta mı?","Hangi yöntem seçildi, nüks riski ne?","Ameliyat sonrası ilaçların süt arınma süresi?"],
  o:["Yakın dönemde KM tüketimini koruyun; kaba yem uzun kıyımlı ve yeterli.","Süt humması ve ketozisi önleyin; rahim iltihabını erken tedavi ettirin.","Kesif geçişi kademeli; ani yem değişikliği yok."],
  a:"Ani karın ağrısı, sağ karın şişkinliği: acil veteriner.",s:"Merck Veterinary Manual (Left/Right Displaced Abomasum); LeBlanc 2005 JDS; Shaver 1997"},
 {k:"topal",n:"Topallık (laminit, tırnak sorunları)",rk:"acid",sg:{topal:4,yag:1,sut:1,ist:1},
  w:"Asidozdan 6–8 hafta sonra; doğumdan sonraki 2–4 ay; sert zemin ve uzun ayakta kalma.",
  b:["Sırt kamburu, kısa adım, ağırlığı tırnağın dış kısmından kaçırma.","Tabanda kanama lekeleri, beyaz çizgi ayrılması, taban ülseri.","Yumuşak, çatlak, yavaş büyüyen tırnak: biotin veya çinko eksikliği şüphesi."],
  i:["Topal hayvanı ayırın; kuru ve yumuşak zemin.","Tırnak bakımcısı veya veteriner hekime muayene ettirin."],
  t:[["Tırnak kesimi ve sağlam tırnağa takoz (blok) yapıştırma","V/Ç","Tırnak bakımcısı veya veteriner."],["Ağrı kesici / iltihap giderici (NSAID; ör. meloksikam, ketoprofen)","V","Reçeteli; iyileşmeyi ve verimi destekler."],["Antibiyotik","V","Yalnız enfeksiyon varsa (ayak çürüğü, derin enfeksiyon); siğilde (dijital dermatit) yerel oksitetrasiklin sprey/bandaj ve sürüde ayak banyosu (bakır sülfat veya formalin) kullanılır."],["Biotin ve çinko (rasyonda)","Ç","Tırnak kalitesi için uzun vadeli; en az 4–6 ay."]],
  h:["Ağrı kesici vermeden yalnız tırnak kesmek.","Siğili (dijital dermatit) laminitle karıştırmak.","Biotinin haftalar içinde etki etmesini beklemek: tırnak ayda yaklaşık 5 mm büyür."],
  q:["Sorun ülser mi, beyaz çizgi mi, siğil mi?","Takoz takıldı mı, ağrı kesici verildi mi?"],
  o:["Asidozu önleyin (program kartı).","Biotin ve çinko; ayak banyosu; 6 ayda bir koruyucu tırnak kesimi; yatak konforu."],
  a:"Ayağa hiç basamama, şişlik ve ateş: veteriner.",s:"Merck Veterinary Manual (Lameness in Cattle); Hoblet ve Weiss 2001; Laven 2008"},
 {k:"son",n:"Sonun atılamaması ve rahim iltihabı (metritis)",rk:"",sg:{son:4,akinti:3,ates:3,dogum:2,ist:1,sut:1},
  w:"Son (eş) doğumdan 12–24 saat sonra atılmamışsa; rahim iltihabı ilk 21 günde.",
  b:["Vulvadan sarkan zar; 12–24 saati geçen son.","Günler içinde kötü kokulu kırmızı–kahverengi sulu akıntı.","Ateş (39,5 °C üstü), iştahsızlık, süt düşüşü: rahim iltihabı işareti."],
  i:["Sonu zorla çekmeyin, elle çıkarmayın: rahim hasarı, enfeksiyon ve döl verimi düşer.","Sarkan kısmı dokunmadan keserek kısaltabilirsiniz.","İlk 10 gün her gün ateş ölçün."],
  t:[["Ateş ve iltihap yoksa ilaçsız izleme","—","Son çoğu zaman 2–10 günde kendiliğinden atılır."],["Sistemik antibiyotik (ör. penisilin, oksitetrasiklin)","V","Ateş ve rahim iltihabı varsa; reçeteli. 3. kuşak sefalosporinler (ör. seftiofur) insan sağlığı için kritik önemdedir; veteriner hekim yalnız gerekçeyle seçer."],["Ağrı kesici / ateş düşürücü (NSAID)","V","Reçeteli."],["Oksitosin, PGF2α","V","Sonun atılmasına etkisi sınırlı ve tartışmalı; veteriner kararı."],["Rahim içi tablet veya yıkama","V","Rutin kullanımı önerilmez."]],
  h:["Sonu elle çıkarmaya çalışmak.","Ateş yokken rutin antibiyotik: direnç ve gereksiz arınma süresi.","Ateşi ölçmemek; eşlik eden kalsiyum düşüklüğü ve ketozisi atlamak."],
  q:["Ateş var mı, antibiyotik gerçekten gerekli mi?","Sütün arınma süresi kaç gün?","Kalsiyum düşüklüğü kontrol edildi mi?"],
  o:["Selenyum (rasyonda 0,3 mg/kg KM) ve E vitamini yeterli olsun.","Süt hummasını önleyin; kuru dönem kondisyonu 3–3,5.","Temiz doğum bölmesi; ikiz ve güç doğumları izleyin."],
  a:"Ateş, iştahsızlık ve kötü kokulu akıntı birlikteyse: veteriner.",s:"Merck Veterinary Manual (Retained Fetal Membranes; Metritis); LeBlanc 2008; NASEM 2021"},
 {k:"tetani",n:"Çayır tetanisi (magnezyum düşüklüğü)",rk:"",sg:{mera:3,sinir:3,tit:3,yat:2},
  w:"Taze, hızlı büyüyen, potasyum ve azotça zengin meraya çıkışta (ilkbahar, sonbahar); emziren inekler; magnezyumu düşük kaba yemle kış.",
  b:["Huzursuzluk, kulak ve göz kapağı seğirmesi, aşırı hassasiyet.","Sendeleyerek yürüme, saldırganlık.","Yere düşme, kasılma nöbetleri, ölüm; bazen yalnız ölü bulunur."],
  i:["Hayvanı heyecanlandırmayın: nöbeti tetikler.","Veteriner hekimi hemen çağırın.","Sürünün geri kalanına hemen ek magnezyum (magnezyum oksit) başlayın."],
  t:[["Kalsiyum–magnezyum solüsyonu (damardan, yavaş)","V","Hızlı vermek kalbi ve solunumu durdurabilir."],["Magnezyum sülfat (deri altı)","V","Damar içi tedaviden sonra."],["Rektal magnezyum (lavman)","V","Hızlı ek yol."],["Ağızdan magnezyum (magnezyum oksit, magnezyum klorür)","Ç","İyileşme döneminde ve sürü önleminde."]],
  h:["Magnezyumu hızlı damardan vermek.","Yalnız kalsiyum verip magnezyumu atlamak.","Nöbet sırasında hayvanı zorlamak."],
  q:["Kalsiyumla birlikte magnezyum da verildi mi?","Sürüye hangi magnezyum önlemi alınmalı?"],
  o:["Sağmalda rasyon magnezyumu %0,25–0,35.","Riskli merada magnezyum oksit (yaklaşık 50–60 g/inek/gün).","Potasyumlu gübre atılmış meraya dikkat; sodyum eksikliğini giderin.","Program: magnezyum satırı."],
  a:"Sinirsel belirti veya nöbet: hemen veteriner.",s:"Merck Veterinary Manual (Hypomagnesemic Tetany); Schonewille 2013"},
 {k:"sisme",n:"Şişme (timpani)",rk:"",sg:{solsis:4,nefes:3,mera:2,tahil:1,ist:1},
  w:"Aç hayvanın baklagil meraya (yonca, üçgül) çıkışı: köpüklü şişme. İnce öğütülmüş yüksek tahıl: köpüklü. Yemek borusu tıkanması: gazlı şişme.",
  b:["Sol karın hızla şişer; nefes darlığı, ağzı açık soluma.","Huzursuzluk, karına tekme atma.","Ağır vakada yere düşme ve saatler içinde boğularak ölüm."],
  i:["Hayvanı meradan alın, yürütün.","Köpüklü şişmede ağızdan köpük kırıcı: bitkisel yağ veya silikon/poloksalen içeren ürün (etiket dozu).","Gazlı şişmede (yemek borusu tıkanması) mide sondası: yalnız eğitimli kişi.","Boğulma belirtisinde acil veteriner."],
  t:[["Köpük kırıcı (poloksalen, dimetikon/silikon, bitkisel yağ)","Ç/V","Köpüklü şişmede ilk seçenek; ağızdan veya sondayla."],["Mide sondası","V/Ç","Gazlı şişmede gazı boşaltır; köpüklüde etkisiz."],["Trokar / kanül","V","Hayati tehlikedeki gazlı şişmede."],["Acil rumenotomi","V","Ağır köpüklü şişmede."]],
  h:["Köpüklü şişmede trokar: köpük çıkmaz, işe yaramaz.","Yemek borusundaki tıkanmayı zorla itmek."],
  q:["Şişme köpüklü mü, gazlı mı?","Sürü için hangi önlem alınmalı?"],
  o:["Baklagil meraya tok ve kademeli çıkış; meradan önce kuru ot.","Rasyonda yonca payını sınırlayın; tahılı kaba kırın.","Riskli günlerde köpük önleyici ürünler."],
  a:"Nefes darlığı ve hızla büyüyen şişlik: acil veteriner.",s:"Merck Veterinary Manual (Bloat in Ruminants); Majak 2003"},
 {k:"mast",n:"Mastitis (meme iltihabı) — beslenme yönü",rk:"",sg:{meme:4,ates:1,sut:1,ist:1,dogum:1},
  w:"Doğumdan sonraki ilk ay ve kuru döneme geçiş; selenyum, E vitamini, çinko ve A vitamini eksikliğinde artar.",
  b:["Klinik: sütte pıhtı veya sulanma, memede sıcaklık, şişlik, ağrı.","Ağır (toksik) vakada ateş, iştahsızlık, yatma.","Belirtisiz (subklinik): somatik hücre sayısı mL'de 200.000 üstü."],
  i:["Kaliforniya mastitis testi (CMT).","Etkilenen çeyreği sık sağın (ilk sütü kaba sağın, yere değil); sağım hijyeni.","Ateş veya yatma varsa veteriner."],
  t:[["Meme içi antibiyotik","V","Reçeteli; tedaviden önce süt örneği alıp kültür önerilir. Süt arınma süresine uyun."],["Sistemik antibiyotik","V","Ağır veya toksik vakada."],["Ağrı kesici / iltihap giderici (NSAID)","V","İyileşmeyi hızlandırır; reçeteli."],["Hipertonik tuzlu su (damardan) ve ardından bol ağızdan sıvı, kalsiyum","V","Toksik mastitiste standart destek tedavisi."],["Kuru dönem tedavisi ve meme başı koruyucu","V","Kuruya ayırırken veteriner planıyla."]],
  h:["Kültür yapmadan hep aynı antibiyotiği kullanmak.","Tedaviyi süresi bitmeden bırakmak.","Arınma süresine uymamak: sütte kalıntı.","Toksik mastitiste yalnız meme içi tedavi."],
  q:["Kültür ve antibiyogram yapıldı mı?","Sütün arınma süresi kaç gün?","Kuru dönem planı nedir?"],
  o:["Rasyonda selenyum 0,3 mg/kg KM; E vitamini, çinko ve A vitamini yeterli.","Ketozis ve süt hummasını önleyin: bağışıklığı düşürürler.","Yatak ve sağım hijyeni."],
  a:"Ateş, yatma ve sulu, kırmızımsı süt: acil veteriner.",s:"Merck Veterinary Manual (Mastitis in Large Animals); Weiss 1997; NASEM 2021"}
]};
Object.assign(HZS,{idrar:"Erkek hayvanda ıkınma, damla damla idrar, kuyruk sallama",kum:"Penis kılında kum/kristal",korluk:"Körlük, başı duvara dayama, başı geriye atma",soluma:"Hızlı soluma, dil dışarıda, salya (sıcakta)",olum:"Ani ölüm (ölü bulundu)",kahve:"Mukoza kahverengi-mor, kan çikolata renginde",ure:"Yemi yedikten kısa süre sonra titreme, salya, kasılma",gebe:"Gebeliğin son 6 haftası (ikiz/üçüz)",ayrilir:"Sürüden ayrılıyor, durgun",sari:"Sarılık, koyu kırmızı-kahve idrar",sert:"Kas sertliği, yürümede güçlük (genç hayvan)",emme:"Emme isteği zayıf",susuz:"Göz çukura kaçmış, deri kıvrımı geç düzeliyor",sagsis:"Karın (özellikle sağ) birden şişti, çalkantı sesi",kolos:"İlk 6 saatte yeterli ağız sütü alamadı",kesme:"Sütten yeni kesildi",tuy:"Tüyler kabarık, büyüme durdu"});
HZ.besi=[
 {k:"bacid",n:"Asidoz, karaciğer apsesi ve laminit",rk:"bacid",sg:{tahil:3,ishal:3,ist:2,gevis:2,topal:2,solsis:1,yat:1},
  w:"Besiye girişte kesife hızlı geçiş, kaçak tahıl yeme, bitiş döneminde yüksek nişasta ve az kaba yem.",
  b:["Akut: iştahsızlık, şişkin sol karın, sulu–köpüklü–ekşi kokulu gri/sarı dışkı, susuzluk, sendeleme.","Süreğen: yem tüketimi dalgalanır, artış düşer, dışkıda sindirilmemiş tane.","Haftalar sonra topallık (laminit); karaciğer apsesi genelde canlıda belirti vermez, kesimde görülür."],
  i:["Akutta tahılı hemen kesin, kaliteli kuru ot verin, veteriner hekimi çağırın (ilk 6–12 saat).","Süreğende rasyonu programın önerisiyle düzeltin; kesife geçişi kademeli yapın."],
  t:[["Ağızdan antasit (magnezyum oksit veya hidroksit)","V","Hafif–orta vakada; aşırı kullanım alkaloz yapar."],["Damardan sıvı ve sodyum bikarbonat","V","Susuzluk ve kan asidozunda."],["Rumen boşaltma veya rumenotomi","V","Ağır vakada."],["Tiamin (B1 vitamini)","V","PEM'i önlemek için destek."],["Antibiyotik","V","Rumen hasarı veya enfeksiyonda; reçeteli, arınma süresine uyun. AB ve Türkiye'de yemde büyütme amaçlı antibiyotik yasaktır; ilaçlı yem yalnız veteriner reçetesiyle ve tedavi amaçlı kullanılır (koruyucu toplu kullanım AB'de 2022'den beri yasak)."],["Ağrı kesici (NSAID)","V","Laminit için; reçeteli."]],
  h:["İyileşti diye tahılı hemen eski düzeye çıkarmak.","Antasiti tekrar tekrar vermek.","Topallığı yalnız tırnak sorunu sanıp rasyonu düzeltmemek."],
  q:["Rumen pH'ı ölçüldü mü?","Antibiyotik kullanıldıysa et arınma süresi kaç gün?"],
  o:["Kesife 3–4 haftada adım adım geçin (her adımda kaba yemi 8–10 puan azaltın).","Bitişte kaba yem en az %8–12 (Holstein'da üst uç); rumende yıkılan nişastayı sınırlayın; tahılı kaba kırın.","Program: asidoz risk kartı ve 'bu riske göre çözüm'."],
  a:"Kaçak tahıl yeme veya yatma: acil veteriner.",s:"Merck Veterinary Manual (Grain Overload; Liver Abscesses in Cattle); Nagaraja ve Lechtenberg 2007; NASEM 2016"},
 {k:"bloat",n:"Şişme (timpani)",rk:"bloat",sg:{solsis:4,nefes:3,tahil:2,mera:2,ist:1},
  w:"İnce öğütülmüş yüksek tahıl (köpüklü şişme), baklagil mera veya yeşil yonca (köpüklü), yemek borusu tıkanması (gazlı).",
  b:["Sol karın hızla şişer, nefes darlığı, ağzı açık soluma.","Huzursuzluk, tekme atma; ağır vakada yere düşme ve ölüm."],
  i:["Köpüklü şişmede ağızdan köpük kırıcı (bitkisel yağ veya silikon/poloksalen; etiket dozu).","Gazlı şişmede mide sondası (eğitimli kişi).","Boğulma belirtisinde acil veteriner."],
  t:[["Köpük kırıcı (poloksalen, dimetikon/silikon, bitkisel yağ)","Ç/V","Köpüklü şişmede ilk seçenek."],["Mide sondası","V/Ç","Gazlı şişmede; köpüklüde etkisiz."],["Trokar / kanül","V","Hayati tehlikedeki gazlı şişmede."],["Rumenotomi","V","Ağır köpüklü şişmede."]],
  h:["Köpüklü şişmede trokar: işe yaramaz.","Besi şişmesinde tahılı ince öğütmeye devam etmek."],
  q:["Şişme köpüklü mü, gazlı mı?","Sürüde tekrar ederse rasyonda ne değişmeli?"],
  o:["Tahılı kaba kırın; kaba yemi uzun kıyımlı verin; yonca payını sınırlayın.","İyonofor (monensin) şişmeyi azaltır; ancak AB ve Türkiye'de sığır yeminde katkı olarak izinli değildir (yalnız reçeteli bolus ürünleri vardır); veteriner hekiminize danışın.","Program: şişme risk kartı."],
  a:"Nefes darlığı ve hızla büyüyen şişlik: acil.",s:"Merck Veterinary Manual (Bloat in Ruminants); Cheng 1998"},
 {k:"uro",n:"İdrar taşı (ürolitiyazis)",rk:"uro",sg:{idrar:4,kum:3,ist:1,solsis:1},
  w:"Erkek (özellikle iğdiş) besi hayvanında; düşük Ca:P, yüksek fosfor (kepek, DDGS), az su, kışın soğuk su.",
  b:["Ikınma, damla damla veya hiç idrar yapamama, kuyruk sallama, karına tekme.","Penis kılında kum veya kristal.","Tam tıkanmada 1–3 günde mesane veya idrar yolu yırtılır: karında su toplanması (su göbeği), ölüm."],
  i:["İdrar yapamayan hayvan: acil veteriner.","Sürünün geri kalanına bol temiz su; tuzu artırın; rasyonu düzeltin."],
  t:[["Cerrahi (idrar yolu açma, sondalı mesane drenajı)","V","Tam tıkanmada."],["Kas gevşetici ve ağrı kesici","V","Kısmi tıkanmada taşın geçmesine yardım."],["İdrarı asitleştirici (amonyum klorür)","V","Kısmi tıkanmada ve sürü önleminde; doz veteriner/programla."]],
  h:["Tam tıkanmada idrar söktürücü (diüretik) vermek: mesane yırtılır.","Yalnız hasta hayvanı tedavi edip rasyonu değiştirmemek.","Su tüketimini (soğuk su, kirli yalak) gözden kaçırmak."],
  q:["Tıkanma tam mı, kısmi mi? Mesane sağlam mı?","Taşın türü (fosfat mı, kalsiyum karbonat mı) belirlendi mi?"],
  o:["Ca:P en az 2:1; fosfor ≤ %0,35; tuz rasyonun %1–2'si (en çok %4; su sınırsız olmalı) su tüketimini ve idrarı artırır.","Amonyum klorür (rasyonun yaklaşık %0,5'i) idrarı asitleştirir.","Erkek hayvanda geç kastrasyon idrar yolunun gelişmesine izin verir.","Bol, temiz, kışın donmayan su.","Program: idrar taşı risk kartı."],
  a:"İdrar yapamama: acil veteriner.",s:"Merck Veterinary Manual (Urolithiasis in Ruminants); OSU Beef 2017; NASEM 2016"},
 {k:"pem",n:"PEM (polioensefalomalasi, beyin yumuşaması)",rk:"pem",sg:{korluk:4,tit:2,sinir:2,yat:2,tahil:1},
  w:"Yüksek kükürt (DDGS, melas, mısır gluteni, sülfatlı su), ani kesif geçişi, B1 vitamini (tiamin) eksikliği; çoğunlukla genç besi hayvanında.",
  b:["Körlük (göz kırpma refleksi kaybolabilir), başı duvara dayama, başı geriye atma (yıldıza bakma).","Sendeleme, kas titremesi, yatma, kürek çekme, nöbet.","Çoğu zaman sürüde birden fazla hayvanda."],
  i:["Acil veteriner: tedavinin ilk saatlerde başlaması kritiktir.","Yemdeki ve sudaki kükürt kaynağını gözden geçirin."],
  t:[["Tiamin (B1 vitamini), tekrarlı","V","Temel tedavi; erken başlanırsa iyileşme şansı yüksek. Kükürt kaynaklı vakada yanıt zayıf olabilir."],["Kortikosteroid (beyin ödemi için)","V","Reçeteli."],["Destek: sıvı, kaba yem","V/Ç","Yutabiliyorsa."]],
  h:["Tedaviye geç kalmak: beyin hasarı kalıcı olur.","Tek doz tiaminle bırakmak.","Kükürt kaynağını kesmeden sürüye devam etmek."],
  q:["Kükürt kaynağı ne (yem mi, su mu)?","Sürünün geri kalanı için önlem?"],
  o:["Toplam kükürt (su dahil) yüksek kaba yemde ≤ %0,4, kesif ağırlıklıda ≤ %0,3.","DDGS, melas ve mısır gluteni payını sınırlayın; içme suyu sülfatını ölçtürün.","Kesif geçişi kademeli. Program: PEM risk kartı."],
  a:"Körlük veya sinirsel belirti: acil veteriner.",s:"Merck Veterinary Manual (Polioencephalomalacia); Drewnoski 2014; NASEM 2016"},
 {k:"heat",n:"Sıcak stresi",rk:"",sg:{soluma:4,ist:2,yat:1},
  w:"Sıcak ve nemli günler (THI 75 üstü), gece serinlemeyen dönemler; siyah renkli ve Holstein hayvanlar, bitişteki ağır hayvanlar.",
  b:["Hızlı soluma, ağzı açık soluma, dil dışarıda, salya.","Gölge ve su başında toplanma, yem tüketimi düşer.","Ağır vakada sendeleme, yatma, ölüm."],
  i:["Gölge, bol ve serin su (ek yalak).","Hayvanı iri damla suyla ıslatıp havalandırın (ince sis nemli havada yetersiz kalır).","Sıcakta taşıma, tartım ve işlem yapmayın; yemi akşam serinliğinde verin."],
  t:[["Damardan sıvı ve aktif soğutma","V","Ağır vakada."]],
  h:["Sıcağın en yüksek saatinde hayvanı taşımak veya işlem yapmak.","Su yalağını yetersiz bırakmak.","Yemi sabah tek seferde vermek."],
  q:["Barınakta havalandırma ve gölge yeterli mi?"],
  o:["Kesif yemin büyük kısmını akşama kaydırın; enerjiyi kısmen yağla verin; tampon ve tuz/potasyum yeterli olsun.","Program: sıcak stresi kartı (THI)."],
  a:"Sendeleme veya yatma: acil soğutma ve veteriner.",s:"Mader 2006; Iowa Beef Center; NASEM 2016"},
 {k:"tox",n:"Nitrat ve üre zehirlenmesi",rk:"",sg:{ure:4,kahve:4,nefes:2,olum:2,tit:1},
  w:"Nitrat: kuraklıkta veya bol gübrelenmiş ot, sorgum, mısır sapı, yabani otlar. Üre: fazla veya kötü karıştırılmış üre, aç hayvana üreli yem.",
  b:["Nitrat: mukozalar mor-kahverengi, kan çikolata renginde, nefes darlığı, titreme, gebelerde yavru atma, ani ölüm.","Üre: yemden 20–60 dakika sonra huzursuzluk, salya, titreme, karın ağrısı, şişme, kasılma, ölüm."],
  i:["Şüpheli yemi hemen kesin; sürünün geri kalanını o yemden uzaklaştırın.","Acil veteriner; yem örneğini saklayın (analiz)."],
  t:[["Metilen mavisi (damardan)","V","Nitrat zehirlenmesinde; gıda hayvanında yasal durumu ve arınma süresi veteriner hekimce belirlenir."],["Mide sondasıyla bol soğuk su ve %5 sirke (asetik asit)","V","Üre zehirlenmesinde rumende amonyak emilimini azaltır; kasılan hayvana ağızdan içirmeyin (ciğere kaçar)."],["Rumen boşaltma","V","Ağır üre zehirlenmesinde."]],
  h:["Aynı yemi sürüye vermeye devam etmek.","Üreyi yeme elle, homojen karıştırmadan katmak; aç hayvana üreli yem vermek."],
  q:["Yemde nitrat analizi yapılmalı mı?","Üre oranı ve karıştırma yöntemi güvenli mi?"],
  o:["Üre kesif yemde en çok %1, tam rasyonda yasal üst sınır %0,88; kademeli alıştırma.","Şüpheli otu nitrat analizi yaptırıp seyreltin.","Program: çiftlikte yem güvenlik kartları."],
  a:"Zehirlenme şüphesi: acil veteriner.",s:"Merck Veterinary Manual (Nitrate and Nitrite Poisoning; Urea Poisoning); AB 2023/1708"}
];
HZ.koyun=[
 {k:"gtox",n:"Gebelik toksemisi (ikiz kuzu hastalığı)",rk:"",sg:{gebe:4,ayrilir:3,ist:2,korluk:2,tit:1,yat:2,aseton:2},
  w:"Gebeliğin son 4–6 haftası; ikiz/üçüz taşıyan, çok zayıf veya çok şişman koyunlar; kötü hava, nakil, ani yem değişikliği.",
  b:["Sürüden ayrılma, durgunluk, iştahsızlık.","Körlük, başı yukarı kaldırma, diş gıcırdatma, titreme.","Yatma; nefeste aseton kokusu; tedavisiz 3–7 günde ölüm."],
  i:["Sürüden ayırın; ağızdan propilen glikol veya gliserol (etiket dozu), lezzetli yem ve su.","Keton test çubuğuyla doğrulayın; veteriner hekimi çağırın.","Sürünün geri kalanının kesif yemini hemen artırın."],
  t:[["Propilen glikol veya gliserol (ağızdan)","Ç","Erken vakada temel tedavi."],["Dekstroz (damardan)","V","Hızlı enerji."],["Kalsiyum","V","Kalsiyum düşüklüğü sıklıkla eşlik eder."],["Doğum başlatma (koyunda deksametazon, keçide PGF2α) veya sezaryen","V","Yavruları almak anneyi kurtarmanın en etkili yoludur; veteriner kararı."],["Ağrı kesici (NSAID; ör. fluniksin)","V","Yaşama oranını artırdığı gösterilmiştir; reçeteli."],["Sıvı ve elektrolit","V","Susuzlukta."]],
  h:["Yatmış hayvanda tedaviye geç kalmak: iyileşme şansı çok düşer.","Kalsiyum düşüklüğünü atlamak.","Yalnız hasta koyunu tedavi edip sürünün beslemesini değiştirmemek."],
  q:["Kalsiyum da verildi mi?","Doğum başlatılmalı mı, sezaryen gerekli mi?"],
  o:["Son 6 haftada kesif yemi kademeli artırın (ikiz taşıyanlarda daha fazla); ultrasonla yavru sayısına göre gruplayın.","Kondisyon 3–3,5; ani yem değişikliği ve stres yok.","Program: küçükbaş 'geç gebelik' modu ve ikiz/üçüz seçimi."],
  a:"Körlük, yatma: acil veteriner.",s:"Merck Veterinary Manual (Pregnancy Toxemia in Ewes and Does); NRC 2007"},
 {k:"khipo",n:"Hipokalsemi (koyunda süt humması)",rk:"",sg:{gebe:2,dogum0:3,tit:3,yat:3,ist:1},
  w:"Doğumdan önceki son haftalar ve ilk laktasyon haftaları; ani yem değişikliği, nakil, oksalatlı bitkiler.",
  b:["Sendeleme, kas titremesi, durgunluk.","Göğüs üstü yatma, başı yere uzatma, şişme.","Tedavisiz hızlı ölüm; gebelik toksemisiyle karışır, sıklıkla birlikte görülür."],
  i:["Ayakta ve yutabiliyorsa ağızdan kalsiyum (etiket dozu); yatan hayvana ağızdan sıvı vermeyin.","Veteriner hekimi çağırın."],
  t:[["Kalsiyum boroglukonat (damardan yavaş veya deri altı)","V","Hızlı yanıt tanıyı doğrular."],["Ağızdan kalsiyum","Ç","Ayaktaki hayvanda ve nüksü önlemede."]],
  h:["Kalsiyumu hızlı damardan vermek.","Gebelik toksemisini ayırt etmeden yalnız kalsiyum vermek (ya da tersi)."],
  q:["Gebelik toksemisi de var mı (keton testi)?"],
  o:["Geç gebelik ve erken laktasyonda rasyon kalsiyumu yeterli; ani yem değişikliği yok.","Program: küçükbaş kalsiyum satırı."],
  a:"Yatan koyun: acil veteriner.",s:"Merck Veterinary Manual (Hypocalcemia in Sheep and Goats)"},
 {k:"entero",n:"Enterotoksemi (ani ölüm hastalığı)",rk:"",sg:{olum:5,tahil:2,ishal:1,sinir:2,korluk:1},
  w:"Hızlı büyüyen kuzular, yüksek kesifli besi, ani yem veya mera değişikliği; aşısız sürüler.",
  b:["Çoğu zaman en iyi gelişen kuzu ölü bulunur.","Kasılma, başı geriye atma, kürek çekme, bazen ishal.","Hastalık saatler içinde ölümle sonuçlanır."],
  i:["Rasyonu hemen kaba yemle seyreltin, kesifi azaltın.","Ölen hayvanın otopsisini yaptırın (tanı).","Sürüyü aşılatın (veteriner)."],
  t:[["Antitoksin","V","Erken vakada; çoğu zaman yetişilemez."],["Antibiyotik","V","Veteriner kararıyla; reçeteli."],["Aşı (Clostridium perfringens tip D)","V","Asıl korunma yolu; anaya doğumdan önce, kuzuya rapelli. Aşı programları bölümünde."]],
  h:["Aşısız kuzuyu yüksek kesifle beslemek.","Anaya doğum öncesi aşı yapmayıp kuzuyu korunmasız bırakmak.","Tek doz aşıda kalmak (rapel yapmamak)."],
  q:["Otopsi bulgusu enterotoksemiyle uyumlu mu?","Sürü için aşı takvimi nasıl olmalı?"],
  o:["Kesif yeme kademeli geçiş; kaba yem en az %15.","Aşılama (aşı programları bölümü).","Program: enterotoksemi risk kartı."],
  a:"Sürüde ani ölüm: veteriner ve otopsi.",s:"Merck Veterinary Manual (Enterotoxemia in Sheep and Goats); Uzal ve Songer 2008"},
 {k:"kuro",n:"İdrar taşı (koç ve erkek kuzu)",rk:"uro",sg:{idrar:4,kum:3,ist:1},
  w:"Kesifle beslenen erkek kuzu ve koçlarda; düşük Ca:P, yüksek fosfor, az su.",
  b:["Ikınma, damla damla idrar, kuyruk sallama, karına tekme.","Penis kılında kristal.","Tam tıkanmada idrar yolu veya mesane yırtılır, ölüm."],
  i:["İdrar yapamayan hayvan: acil veteriner.","Sürüye bol temiz su, tuz; rasyonu düzeltin."],
  t:[["Penisin ucundaki ince uzantının (üretral çıkıntı) kesilmesi","V","Taş çoğunlukla burada takılır; ilk müdahale."],["Cerrahi (sondalı mesane drenajı vb.)","V","Tam tıkanmada."],["Kas gevşetici ve ağrı kesici","V","Kısmi tıkanmada."],["İdrarı asitleştirici (amonyum klorür)","V","Kısmi tıkanmada ve sürü önleminde."]],
  h:["Tam tıkanmada idrar söktürücü vermek.","Rasyonu ve su tüketimini düzeltmeden tedaviyle yetinmek."],
  q:["Tıkanma tam mı? Mesane sağlam mı?"],
  o:["Ca:P en az 2:1; fosfor ≤ %0,35; tuz rasyonun %1–2'si (su sınırsız); amonyum klorür yaklaşık %0,5.","Erkek kuzuda geç kastrasyon taş riskini azaltır.","Bol, temiz su. Program: küçükbaş idrar taşı kartı."],
  a:"İdrar yapamama: acil veteriner.",s:"Merck Veterinary Manual (Urolithiasis in Ruminants); NRC 2007"},
 {k:"cutox",n:"Bakır zehirlenmesi",rk:"",sg:{sari:4,ayrilir:2,ist:1,olum:1},
  w:"Sığır yemi, sığır premiksi veya yalama taşı, bakırlı ilaçlar; molibdeni düşük mera. Bakır haftalarca birikir, stres anında (nakil, kırkım, doğum) kriz çıkar.",
  b:["Ani durgunluk, iştahsızlık.","Sarılık, koyu kırmızı-kahverengi idrar, solgun-sarı mukoza.","1–2 günde ölüm; sürüdeki diğerleri de birikim hâlinde olabilir."],
  i:["Bakır kaynağını hemen kesin (sığır yemi, premiksi, yalama taşı).","Sürüyü stresten koruyun; veteriner hekimi çağırın."],
  t:[["Amonyum tetratiyomolibdat","V","Bakırı bağlar; bulunurluğu sınırlı olabilir."],["Bakır bağlayıcılar (ör. D-penisilamin)","V","Reçeteli."],["Sıvı ve kan nakli","V","Ağır vakada."],["Sürü önlemi: rasyona molibden ve sodyum sülfat","V","Veteriner önerisiyle, belirli bir süre."]],
  h:["Krizdeki hayvanı taşımak veya strese sokmak.","Yalnız hasta hayvanı tedavi edip sürünün yemini değiştirmemek.","Koyuna sığır mineral yalama taşı vermek."],
  q:["Sürünün geri kalanında karaciğer bakırı ölçülmeli mi?","Molibden takviyesi ne kadar sürecek?"],
  o:["Koyun rasyonunda bakır 10–12 mg/kg KM'yi geçmesin (yasal sınır 15); koyuna özel premiks.","Keçide bakır yasal sınırı 35 mg/kg'dır ve keçilerde bakır eksikliği daha sık görülür; koyun kısıtı keçiye uygulanmaz.","Program: koyun bakır kartı ve etiket kontrolü."],
  a:"Sarılık ve kahverengi idrar: acil veteriner.",s:"Merck Veterinary Manual (Copper Poisoning); NRC 2007; AB 2018/1039"},
 {k:"wmd",n:"Beyaz kas hastalığı (selenyum / E vitamini eksikliği)",rk:"",sg:{sert:4,emme:2,yat:2,nefes:1,olum:1},
  w:"Doğuştan (zayıf doğan, ememeyen kuzu) veya 2–8 haftalık hızlı büyüyen kuzularda; selenyumu düşük bölgeler ve kaba yemler.",
  b:["Kas sertliği, kambur duruş, yürümede güçlük, yatma, ememe.","Kalp kası tutulursa nefes darlığı ve ani ölüm."],
  i:["Veteriner hekimi çağırın; kuzuyu emzirmeye yardım edin.","Sürünün selenyum durumunu gözden geçirin."],
  t:[["Selenyum + E vitamini enjeksiyonu","V","Reçeteli; doz kritik: selenyum zehirlenmesi öldürür."],["Ağızdan E vitamini","V/Ç","Destek."]],
  h:["Selenyumu fazla vermek veya birden fazla selenyumlu ürünü birlikte kullanmak (zehirlenme).","Kalp tutulumu olan kuzuyu zorlamak, heyecanlandırmak."],
  q:["Kuzulara ve gebe koyunlara koruyucu selenyum planı gerekli mi?"],
  o:["Gebeliğin son döneminde anaya selenyum ve E vitamini (rasyon veya veteriner planı); toplam selenyum yasal sınır 0,5 mg/kg.","Program: selenyum satırı ve premiks."],
  a:"Nefes darlığı veya yatma: veteriner.",s:"Merck Veterinary Manual (Nutritional Myopathy); NRC 2007"},
 {k:"kacid",n:"Asidoz (tahıl zehirlenmesi)",rk:"",sg:{tahil:4,ishal:3,ist:2,yat:2,solsis:1},
  w:"Kaçak tahıl yeme, kuzu besisinde kesife hızlı geçiş.",
  b:["İştahsızlık, şişkin karın, sulu ve ekşi kokulu dışkı.","Susuzluk, sendeleme, yatma; ağır vakada ölüm, sonradan topallık ve PEM."],
  i:["Tahılı hemen kesin, kuru ot verin, veteriner hekimi çağırın."],
  t:[["Ağızdan antasit (magnezyum oksit/hidroksit)","V","Hafif–orta vakada."],["Damardan sıvı ve bikarbonat","V","Ağır vakada."],["Tiamin (B1)","V","PEM'i önlemek için."],["Rumenotomi","V","Ağır vakada."]],
  h:["Antasiti tekrar tekrar vermek.","İyileşince kesifi birden eski düzeye çıkarmak."],
  q:["PEM önlemi için tiamin gerekli mi?"],
  o:["Kesife 2–3 haftada kademeli geçiş; kaba yem en az %15; tahılı kaba kırın.","Program: küçükbaş asit ve enterotoksemi kartı."],
  a:"Kaçak tahıl yeme: belirti çıkmadan veteriner.",s:"Merck Veterinary Manual (Grain Overload)"},
 {k:"kpem",n:"PEM (polioensefalomalasi)",rk:"",sg:{korluk:4,tit:2,yat:2,sinir:2},
  w:"Yüksek kükürt, kesife ani geçiş, B1 vitamini eksikliği; genç kuzu ve toklular.",
  b:["Körlük, başı geriye atma (yıldıza bakma), sendeleme, titreme.","Yatma, kürek çekme, nöbet."],
  i:["Acil veteriner: ilk saatler kritik."],
  t:[["Tiamin (B1), tekrarlı","V","Erken başlanırsa iyileşme yüksek."],["Kortikosteroid","V","Beyin ödemi için; reçeteli."]],
  h:["Tedaviye geç kalmak.","Kükürt kaynağını kesmemek."],
  q:["Kükürt kaynağı ne?"],
  o:["Kükürt ≤ %0,3–0,4; kesife kademeli geçiş.","Program: kükürt satırı."],
  a:"Körlük veya sinirsel belirti: acil veteriner.",s:"Merck Veterinary Manual (Polioencephalomalacia)"}
];
HZ.buzagi=[
 {k:"ishal",n:"Buzağı ishali (beslenme ve enfeksiyon)",rk:"",sg:{ishal:4,susuz:3,emme:3,yat:2,ates:1},
  w:"İlk 4 hafta. Beslenmeye bağlı: yanlış karıştırılmış mama, soğuk veya bozuk süt, düzensiz saat, büyük öğün. Enfeksiyon: E. coli (ilk 3–5 gün), rota/korona virüs ve kriptosporidi (1–3 hafta), koksidiyoz (3 haftadan sonra).",
  b:["Sulu veya macun kıvamlı dışkı, kuyruk ve arka bacak kirli.","Susuzluk: göz çukura kaçar, deri kıvrımı 2 saniyeden geç düzelir, ağız soğuk.","Emme isteği azalır, yatma; ağır vakada ölüm."],
  i:["Sütü kesmeyin: süt veya mamayı sürdürün, aralarda ağızdan elektrolit verin.","Bikarbonatlı elektrolitleri sütten 2–3 saat ayrı verin (sütün pıhtılaşmasını bozar); asetatlı ürünler etiketi izin veriyorsa sütle verilebilir; doz ürün etiketine göre.","Hasta buzağıyı ayırın; eldiven ve el yıkama (kriptosporidi ve salmonella insana bulaşabilir).","Emme yoksa, yatıyorsa veya ağız soğuksa: veteriner (damardan sıvı gerekir)."],
  t:[["Ağızdan elektrolit","Ç","Tedavinin temeli; susuzluğu giderir."],["Damardan sıvı ve bikarbonat","V","Emmeyen veya yatan buzağıda."],["Antibiyotik","V","Yalnız ateş, kanlı dışkı veya genel durum bozukluğunda (bakteriyel/septisemi); virüs ishalinde etkisiz. Reçeteli."],["Halofuginon","V","Kriptosporidi ishalinde koruyucu/tedavi; reçeteli. Susuz veya emmeyen buzağıya verilmez; güvenli doz aralığı dardır."],["Toltrazuril / diklazuril","V","Koksidiyozda; reçeteli."],["Ağrı kesici (NSAID; ör. meloksikam)","V","Susuzluk giderildikten sonra, veteriner kararıyla (böbrek ve abomazum ülseri riski); iştahı ve iyileşmeyi artırır."]],
  h:["Sütü kesmek: buzağı enerjisiz kalır, iyileşme gecikir.","Her ishale antibiyotik vermek.","Bikarbonatlı elektroliti sütün içine karıştırmak.","Susuzluğu geç fark etmek."],
  q:["İshalin nedeni (bakteri, virüs, kriptosporidi, koksidiyoz) belirlendi mi?","Antibiyotik gerçekten gerekli mi?"],
  o:["İlk 2 saatte yeterli ağız sütü.","Mamayı etikete göre (%12,5–15 kuru madde) ve 38–40 °C'de, her gün aynı saatte verin; kova ve biberon hijyeni.","Anneye doğum öncesi ishal aşısı (aşı programları bölümü).","Program: buzağı süt ve öğün hesapları."],
  a:"Emmeme, yatma, soğuk ağız: acil veteriner.",s:"Merck Veterinary Manual (Diarrhea in Neonatal Ruminants); Smith 2012; NASEM 2021"},
 {k:"kolostrum",n:"Ağız sütü (kolostrum) yetersizliği",rk:"",sg:{kolos:4,ishal:1,emme:1,ates:1},
  w:"İlk 24 saat belirleyicidir; ağız sütü bağırsaktan en iyi ilk 6 saatte emilir, 24 saatten sonra emilim neredeyse durur.",
  b:["Kendisi belirti vermez; sonuçları görülür: ishal, zatürre ve ölüm sıklığı artar, büyüme düşer.","Test: 1–7 günlük buzağıda kan serum toplam proteini ≥ 5,5 g/dL (refraktometre) yeterli kabul edilir."],
  i:["Doğumdan sonraki ilk 2 saatte 3–4 L (canlı ağırlığın %10–12'si) kaliteli ağız sütü; ilk 12 saatte ikinci öğün.","Kaliteyi Brix refraktometresiyle ölçün (%22 ve üstü iyi).","Emmiyorsa yemek borusu sondasıyla (eğitimli kişi)."],
  t:[["Ağız sütü ikamesi (toz)","Ç","Kaliteli ağız sütü yoksa."],["Plazma veya serum nakli","V","Bağışıklığı yetersiz ve hastalanan buzağıda."]],
  h:["İlk ağız sütünü geç vermek.","Kalitesini ölçmeden düşük kaliteli sütle yetinmek.","Sondayı yanlışlıkla soluk borusuna yerleştirmek."],
  q:["Buzağılarda serum toplam protein taraması yapılabilir mi?"],
  o:["Kuru dönemde anne beslemesi (protein, selenyum, E vitamini) ve anneye ishal aşısı.","Kaliteli ağız sütünü dondurup saklayın (ağız sütü bankası)."],
  a:"Ağız sütü alamamış ve hastalanan buzağı: veteriner.",s:"Merck Veterinary Manual (Failure of Passive Transfer); Godden 2019; NASEM 2021"},
 {k:"abobloat",n:"Abomazum şişmesi",rk:"",sg:{sagsis:4,emme:1,yat:2,olum:2},
  w:"1–8 haftalık buzağılarda; büyük öğün, çok yoğun mama, soğuk/bozuk süt, düzensiz besleme saatleri.",
  b:["Besledikten sonra karın (özellikle sağ taraf) birden şişer; çalkantı sesi.","Karın ağrısı, tekme, salya, yatma; hızlı ölüm."],
  i:["O öğünü atlayın; veteriner hekimi çağırın."],
  t:[["Sondayla gaz boşaltma, sıvı tedavisi","V","Acil."],["Antibiyotik","V","Clostridium/Sarcina şüphesinde; reçeteli."],["Cerrahi","V","Ağır vakada."]],
  h:["İyileşince hemen eski öğün miktarına dönmek.","Mamayı ölçmeden, göz kararı karıştırmak."],
  q:["Öğün büyüklüğü ve mama yoğunluğu uygun mu?"],
  o:["Öğün başına en çok 4 L (yenidoğanda daha az); günlük sütü 3 öğüne bölün.","Mamayı etikete göre karıştırın; süt sıcaklığı ve saat her gün aynı; kova hijyeni.","Program: buzağı öğün uyarısı."],
  a:"Karında hızlı şişkinlik: acil veteriner.",s:"Merck Veterinary Manual (Abomasal Bloat in Calves); Panciera 2007"},
 {k:"bwmd",n:"Beyaz kas hastalığı (selenyum / E vitamini eksikliği)",rk:"",sg:{sert:4,emme:2,yat:2,nefes:1},
  w:"Doğuştan veya ilk haftalarda; selenyumu düşük bölgeler, anneye selenyum verilmemesi.",
  b:["Kas sertliği, yürümede güçlük, yatma, ememe.","Kalp tutulumunda nefes darlığı, ani ölüm."],
  i:["Veteriner hekimi çağırın."],
  t:[["Selenyum + E vitamini enjeksiyonu","V","Reçeteli; doz kritik (selenyum zehirlenmesi)."]],
  h:["Birden fazla selenyumlu ürünü birlikte kullanmak."],
  q:["Annelere kuru dönemde selenyum verilmeli mi?"],
  o:["Kuru dönemde anne rasyonunda selenyum 0,3 mg/kg KM ve yeterli E vitamini."],
  a:"Nefes darlığı: veteriner.",s:"Merck Veterinary Manual (Nutritional Myopathy)"},
 {k:"kesme",n:"Sütten kesme sonrası sorunlar (büyüme durması, şişme, asidoz)",rk:"",sg:{kesme:4,ist:2,tuy:2,ishal:1,solsis:1},
  w:"Sütten kesmeden sonraki 1–3 hafta; başlangıç yemi yeterince yenmeden ani kesme, ani yem değişikliği.",
  b:["İştah ve büyüme düşer, tüyler kabarık.","Karın şişkinliği, gevşek dışkı; bazen asidoz belirtileri."],
  i:["Kesmeyi kademeli yapın; kaliteli kuru ot ve sürekli temiz su."],
  t:[["Yönetim ve rasyon düzeltmesi","Ç","Çoğu vakada yeterli."],["Şişme veya asidoz tedavisi","V","Belirti ağırsa."]],
  h:["Buzağı günde 1–1,5 kg başlangıç yemi yemeden sütü kesmek.","Kesimle aynı anda yer, grup ve yem değiştirmek."],
  q:["Kesme zamanı ve yöntemi uygun mu?"],
  o:["3 gün üst üste 1–1,5 kg başlangıç yemi yiyince kesin; sütü son 1–2 haftada yarıya indirin.","Program: buzağı sütten kesme göstergeleri."],
  a:"Şişme veya yatma: veteriner.",s:"NASEM 2021 (buzağı bölümü); Penn State Extension"}
];
/* ===== Aşı programı ve takvimi (V117). Resmî aşılar Tarım ve Orman Bakanlığı kampanyalarıyla yapılır; tarih ve kapsam il/bölgeye göre değişir. Önerilen aşılarda zamanlama genel çerçevedir; her aşının prospektüsü ve veteriner hekim esastır. ===== */
var VXK={genc:"Buzağı / düve (doğum tarihine göre)",anne:"İnek (beklenen doğum tarihine göre)",besi:"Besi grubu (besiye giriş tarihine göre)",kuzu:"Kuzu / oğlak (doğum tarihine göre)",koyun:"Koyun / keçi (beklenen doğum tarihine göre)",kbesi:"Kuzu besisi (girişe göre)"};
var VX={sigir:[
 {k:"sap",n:"Şap",o:1,for:["genc","anne","besi"],sch:[{g:"camp",l:"Kampanya"}],w:"Bakanlık kampanyasıyla, genelde yılda 2 kez; buzağıda ilk aşı yaşı ve rapel il/ilçe müdürlüğünce belirlenir.",nt:"Ücretsiz; il/ilçe müdürlüğü veya yetkili veteriner uygular. Hayvan hareketleri için aşı kaydı gerekir."},
 {k:"bru",n:"Brusella (yavru atma) — S19",o:1,fem:1,for:["genc"],sch:[{g:"dob",a:90,b:180,l:"Tek doz (dişi buzağı)"}],w:"Dişi buzağılara 3–6 aylıkken, tek doz.",nt:"Resmî program; yalnız dişi buzağılara. Uygulayan: resmî/yetkili veteriner hekim. İnsana bulaşabilen bir hastalıktır."},
 {k:"lsd",n:"Sığırların nodüler ekzantematöz dermatiti (LSD)",o:1,for:["genc","anne","besi"],sch:[{g:"camp",l:"Kampanya"}],w:"Bakanlık kampanyasıyla, genelde yılda bir.",nt:"Bölgeye ve yıla göre değişir; il/ilçe müdürlüğünden teyit edin."},
 {k:"sarbon",n:"Şarbon",o:1,for:["genc","anne","besi"],sch:[{g:"camp",l:"Riskli bölgede kampanya"}],w:"Şarbon görülen bölgelerde, genelde yılda bir.",nt:"Bölgenizde uygulanıp uygulanmadığını il/ilçe müdürlüğüne sorun."},
 {k:"teil",n:"Teileriyoz (kene humması)",o:0,opt:1,for:["genc","anne","besi"],sch:[{g:"camp",l:"Endemik bölgede, kene mevsiminden önce"}],w:"Hastalığın görüldüğü bölgelerde, kene mevsiminden önce (ürüne göre).",nt:"Bölgenizde gerekip gerekmediğini veteriner hekiminize sorun; kene mücadelesiyle birlikte."},
 {k:"mavidil",n:"Mavi dil",o:1,opt:1,for:["genc","anne","besi"],sch:[{g:"camp",l:"Bölgesel kampanya"}],w:"Bakanlığın bölgesel programına göre.",nt:"İl/ilçe müdürlüğünden teyit edin."},
 {k:"clos",n:"Clostridium (yanıkara, ani ölüm; çok değerlikli)",o:0,for:["genc","besi","anne"],sch:[{g:"dob",a:60,b:90,l:"1. doz"},{g:"prev",a:28,b:42,l:"Rapel"},{g:"entry",a:0,b:3,l:"Girişte 1. doz"},{g:"prev",a:21,b:42,l:"Rapel"},{g:"calv",a:-60,b:-30,l:"Yıllık rapel (doğumdan önce)"},{g:"year",l:"Yıllık"}],w:"Buzağıda 2–3 aylıkta, 4–6 hafta sonra rapel; besiye girişte 2 doz; sonra yılda bir.",nt:"Ani ölümlerin önemli bir nedeni; ucuz ve etkilidir."},
 {k:"solunum",n:"Solunum ve üreme viral aşıları (IBR, BVD, PI3, BRSV)",o:0,for:["genc","besi","anne"],sch:[{g:"dob",a:60,b:120,l:"1. doz"},{g:"prev",a:21,b:35,l:"Rapel"},{g:"entry",a:0,b:3,l:"Girişte 1. doz"},{g:"prev",a:21,b:28,l:"Rapel"},{g:"calv",a:-325,b:-311,l:"Tohumlamadan 4–6 hafta önce (bir sonraki gebelik için)"},{g:"year",l:"Yıllık"}],w:"Buzağıda 2–4 aylıkta başlayıp rapel; besiye girişte; inek ve düvede tohumlamadan 4–6 hafta önce, yılda bir.",nt:"Canlı aşıların gebe hayvanda kullanımı prospektüse bağlıdır; veteriner hekiminize sorun."},
 {k:"pasto",n:"Pastörella / Mannheimia (zatürre)",o:0,for:["genc","besi"],sch:[{g:"entry",a:0,b:3,l:"Girişte"},{g:"prev",a:21,b:28,l:"Rapel"},{g:"dob",a:60,b:120,l:"1. doz"},{g:"prev",a:21,b:28,l:"Rapel"}],w:"Besiye girişte veya buzağıda solunum aşılarıyla birlikte.",nt:"Nakil ve gruplama stresinden önce yapılması en etkilidir."},
 {k:"ishal",n:"Buzağı ishali aşısı (E. coli, rota, korona) — anneye",o:0,for:["anne"],sch:[{g:"calv",a:-84,b:-21,l:"Doğumdan 3–12 hafta önce (ürüne göre)"}],w:"Gebe ineğe doğumdan önce; ilk yıl çoğu üründe 2 doz, sonraki gebeliklerde tek doz.",nt:"Buzağıyı ağız sütü yoluyla korur; buzağının ilk 2 saatte yeterli ağız sütü alması şarttır."},
 {k:"mast",n:"Mastitis aşısı (E. coli J5 vb.)",o:0,for:["anne"],sch:[{g:"calv",a:-60,b:-45,l:"Kuruya ayırırken"},{g:"calv",a:-30,b:-14,l:"Doğumdan önce"},{g:"calv",a:0,b:14,l:"Doğumdan sonra 2 hafta içinde"}],opt:1,w:"İsteğe bağlı; koliform mastitis sorunu olan sürülerde, prospektüse göre.",nt:"Mastitisi önlemez, ağırlığını azaltır."}
],koyun:[
 {k:"ksap",n:"Şap",o:1,for:["kuzu","koyun","kbesi"],sch:[{g:"camp",l:"Kampanya"}],w:"Bakanlık kampanyasıyla.",nt:"İl/ilçe müdürlüğünden teyit edin."},
 {k:"rev1",n:"Brusella (yavru atma) — Rev-1",o:1,fem:1,for:["kuzu"],sch:[{g:"dob",a:90,b:180,l:"Tek doz (dişi kuzu/oğlak)"}],w:"Dişi kuzu ve oğlaklara 3–6 aylıkken.",nt:"Resmî program; insana bulaşabilen bir hastalıktır."},
 {k:"ppr",n:"Koyun-keçi vebası (PPR)",o:1,for:["kuzu","koyun","kbesi"],sch:[{g:"camp",l:"Kampanya"}],w:"Bakanlık kampanyasıyla.",nt:"Bölge ve yaşa göre; il/ilçe müdürlüğüne sorun."},
 {k:"cicek",n:"Koyun-keçi çiçeği",o:1,for:["kuzu","koyun","kbesi"],sch:[{g:"camp",l:"Kampanya"}],w:"Bakanlık kampanyasıyla, genelde yılda bir.",nt:"İl/ilçe müdürlüğünden teyit edin."},
 {k:"ksarbon",n:"Şarbon",o:1,for:["kuzu","koyun","kbesi"],sch:[{g:"camp",l:"Riskli bölgede kampanya"}],w:"Şarbon görülen bölgelerde, genelde yılda bir.",nt:"İl/ilçe müdürlüğüne sorun."},
 {k:"kmavidil",n:"Mavi dil",o:1,opt:1,for:["kuzu","koyun","kbesi"],sch:[{g:"camp",l:"Bölgesel kampanya"}],w:"Bakanlığın bölgesel programına göre.",nt:"İl/ilçe müdürlüğünden teyit edin."},
 {k:"entero",n:"Enterotoksemi ve diğer Clostridium hastalıkları (+ tetanoz)",o:0,for:["koyun","kuzu","kbesi"],sch:[{g:"calv",a:-42,b:-21,l:"Kuzulamadan 3–6 hafta önce (anne)"},{g:"dob",a:42,b:56,l:"Kuzuya 1. doz (6–8 hafta)"},{g:"prev",a:28,b:35,l:"Kuzuya rapel"},{g:"entry",a:0,b:3,l:"Besiye girişte"},{g:"prev",a:21,b:28,l:"Rapel"}],w:"Anneye kuzulamadan önce (ilk yıl 2 doz); kuzuya 6–8 haftalıkken ve 4 hafta sonra; besiye girişte; yılda bir.",nt:"Kuzu besisinde ani ölümlere karşı en önemli korunma. Anası aşısızsa kuzuya daha erken başlanır; veteriner hekiminize sorun."},
 {k:"kpasto",n:"Pastörella (zatürre)",o:0,for:["kuzu","koyun","kbesi"],sch:[{g:"entry",a:0,b:3,l:"Girişte"},{g:"prev",a:21,b:28,l:"Rapel"},{g:"calv",a:-42,b:-21,l:"Kuzulamadan önce (anne)"}],w:"Sürüde zatürre sorunu varsa; besiye girişte ve kuzulama öncesi.",nt:"Prospektüse göre."},
 {k:"orf",n:"Ektima (ağız uçuğu)",o:0,opt:1,for:["kuzu","koyun"],sch:[{g:"dob",a:7,b:30,l:"Sürüde sorun varsa"}],w:"Yalnız hastalığın görüldüğü sürülerde.",nt:"Canlı aşıdır; hastalık olmayan sürüye sokulmaz."}
]};
function vxSp(sp){return sp==="koyun"?"koyun":"sigir"}
function vxDays(a,b){return Math.round((b-a)/86400000)}
function vxDate(s){if(!s)return null;var d=new Date(s+"T00:00:00");return isNaN(d)?null:d}
function vxFmt(d){return d?d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—"}
function vxPlan(g){var L=VX[vxSp(g.sp)].filter(function(v){return v.for.indexOf(g.kind)>=0&&!(v.fem&&g.sex==="e")}),out=[],today=new Date();today.setHours(0,0,0,0);
 var ref={dob:vxDate(g.dob),calv:vxDate(g.calv),entry:vxDate(g.entry)};
 L.forEach(function(v){var prev=null,lastDone=null;v.sch.forEach(function(s,i){var key=v.k+"_"+i,done=(g.done||{})[key],from=null,to=null;
   if(s.g==="camp"){out.push({v:v,s:s,key:key,camp:1,done:done});return}
   if(s.g==="year"){var yb=done?vxDate(done.d):lastDone;if(!yb)return;if(done&&today>=new Date(yb.getTime()+335*864e5)){done=null}from=new Date(yb.getTime()+335*864e5);to=new Date(yb.getTime()+365*864e5)} /* yıllık doz her yıl yenilenir */
   else if(s.g==="prev"){if(!prev)return;from=new Date(prev.getTime()+s.a*864e5);to=new Date(prev.getTime()+s.b*864e5)}
   else{var r=ref[s.g];if(!r){prev=null;return}from=new Date(r.getTime()+s.a*864e5);to=new Date(r.getTime()+s.b*864e5)}
   var dd=done?vxDate(done.d):null;prev=dd||from;if(dd)lastDone=dd;
   var st=dd?"ok":v.opt?"opt":today>to?(s.g==="calv"&&ref.calv&&ref.calv>today&&s.a<0?"past":"late"):today>=from?"now":vxDays(today,from)<=14?"soon":"plan";
   out.push({v:v,s:s,key:key,from:from,to:to,done:done,st:st})})});
 return out}
function vxGroupHTML(g){var P=vxPlan(g),ST={ok:["Yapıldı","ok"],late:["Gecikti","no"],now:["Zamanı geldi","wa"],soon:["Yaklaşıyor","wa"],plan:["Planlandı",""],opt:["İsteğe bağlı (sürüde sorun varsa)",""],past:["Bu gebelik için geçti",""]};
 var rows=P.map(function(p){var lab=p.v.n+(p.v.o?' <small class="wa">resmî</small>':'')+'<br><small style="color:var(--mu)">'+p.s.l+'</small>';
  var bt='<br><button class="ed" data-vxd="'+g.id+'|'+p.key+'" style="min-height:0;padding:0 6px;margin-top:2px">'+(p.done?'Düzelt':p.camp?'Kaydet':'Yapıldı')+'</button>';
  if(p.camp)return '<tr><td>'+lab+'</td><td>'+(p.done?'<b class="ok">Yapıldı</b> '+vxFmt(vxDate(p.done.d))+(p.done.lot?'<br><small>seri '+esc(p.done.lot)+'</small>':''):'<small>Tarihi il/ilçe müdürlüğünden öğrenin</small>')+bt+'</td></tr>';
  var s=ST[p.st];return '<tr><td>'+lab+'</td><td>'+(p.done?vxFmt(vxDate(p.done.d))+(p.done.lot?'<br><small>seri '+esc(p.done.lot)+'</small>':''):vxFmt(p.from)+'<br><small>– '+vxFmt(p.to)+'</small>')+'<br><b class="'+s[1]+'">'+s[0]+'</b>'+bt+'</td></tr>'}).join('');
 var need=g.kind==="genc"||g.kind==="kuzu"?"dob":g.kind==="besi"||g.kind==="kbesi"?"entry":"calv";
 return '<div class="card" style="margin:8px 0"><b>'+esc(g.name||VXK[g.kind].replace(/ \(.*$/,''))+'</b>'+(g.name?' <small style="color:var(--mu)">'+VXK[g.kind].replace(/ \(.*$/,'')+'</small>':'')
 +'<div class="g" style="grid-template-columns:1fr 1fr;margin:6px 0"><label>'+(need==="dob"?"Doğum tarihi":need==="entry"?"Besiye giriş tarihi":"Beklenen doğum tarihi")+'<input type="date" data-vxg="'+g.id+'" data-vxf="'+need+'" value="'+(g[need]||'')+'"></label><label>Grup adı<input type="text" data-vxg="'+g.id+'" data-vxf="name" value="'+esc(g.name||'')+'"></label>'+(g.kind==="genc"||g.kind==="kuzu"?'<label>Cinsiyet<select data-vxg="'+g.id+'" data-vxf="sex"><option value=""'+(g.sex?'':' selected')+'>Karışık / dişi</option><option value="e"'+(g.sex==="e"?' selected':'')+'>Yalnız erkek</option></select></label>':'')+'</div>'
 +'<table class="c"><tr><th>Aşı</th><th>Tarih / durum</th></tr>'+rows+'</table><button class="ed" data-vxdel="'+g.id+'" style="min-height:0;padding:0 6px;margin-top:4px">Grubu sil</button></div>'}
function vxGuide(sp){var V=VX[vxSp(sp)];S.vx=S.vx||[];var G=S.vx.filter(function(g){return vxSp(g.sp)===vxSp(sp)}),kinds=vxSp(sp)==="koyun"?["kuzu","koyun","kbesi"]:["genc","anne","besi"];
 var due=0;G.forEach(function(g){vxPlan(g).forEach(function(p){if(p.st==="late"||p.st==="soon"||p.st==="now")due++})});
 return '<details class="dt" id="vxBox" style="margin-top:10px"'+(S.ui&&S.ui.vx?' open':'')+'><summary>Aşı programı ve takvimi'+(due?' <b class="wa">('+due+' yaklaşan/geciken)</b>':'')+'</summary>'
 +'<div class="card" style="border-color:var(--wa);margin:6px 0"><p class="s" style="margin:0"><b>Önemli:</b> Resmî aşılar (şap, brusella, LSD, PPR, çiçek, şarbon) Tarım ve Orman Bakanlığı kampanyalarıyla uygulanır; tarih ve kapsam il ve yıla göre değişir, il/ilçe müdürlüğünden teyit edin. Önerilen aşıların zamanlaması genel çerçevedir; aşının prospektüsü ve veteriner hekiminiz esastır. Aşılar soğuk zincirde (2–8 °C) saklanmalıdır. Selenyum, E vitamini, A vitamini ve çinko eksikliği aşıya yanıtı düşürür: aşı öncesi rasyon eksiklerini kapatın.</p></div>'
 +'<h3 style="margin:8px 0 4px;font-size:14px">Program</h3><ul class="nt">'+V.map(function(v){return '<li><b>'+v.n+'</b>'+(v.o?' <small class="wa">resmî</small>':' <small style="color:var(--mu)">önerilen</small>')+'<br>'+v.w+'<br><small style="color:var(--mu)">'+v.nt+'</small></li>'}).join('')+'</ul>'
 +'<h3 style="margin:10px 0 4px;font-size:14px">Takvim ve kayıt</h3><p class="s">Bir hayvan grubu ekleyin, tarihini girin; program aşı tarihlerini hesaplar, yapılan aşıyı tarih ve seri numarasıyla kaydedersiniz.</p>'
 +G.map(vxGroupHTML).join('')
 +'<div class="row" style="flex-wrap:wrap;gap:6px">'+kinds.map(function(k){return '<button class="btn l" data-vxadd="'+k+'" data-vxsp="'+sp+'" style="margin:0">+ '+VXK[k].replace(/ \(.*$/,'')+'</button>'}).join('')+'</div>'
 +'<small>Kaynak: T.C. Tarım ve Orman Bakanlığı hayvan hastalıkları ile mücadele programları; Merck Veterinary Manual; aşı prospektüsleri.</small></details>'}
function vxRerender(){try{renderCmp()}catch(e){}var b=$("vxBox");if(b){b.open=true;}}
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.dataset)return;S.vx=S.vx||[];
 if(t.dataset.vxadd){S.vx.push({id:Date.now(),sp:t.dataset.vxsp,kind:t.dataset.vxadd,name:"",done:{}});S.ui=S.ui||{};S.ui.vx=true;save();vxRerender();return}
 if(t.dataset.vxdel){if(!confirm("Bu grup ve aşı kayıtları silinsin mi?"))return;S.vx=S.vx.filter(function(g){return String(g.id)!==t.dataset.vxdel});save();vxRerender();return}
 if(t.dataset.vxd){var p=t.dataset.vxd.split("|"),g=S.vx.filter(function(x){return String(x.id)===p[0]})[0];if(!g)return;g.done=g.done||{};var cur=g.done[p[1]]||{},td=new Date().toISOString().slice(0,10);
  var d=prompt("Aşı tarihi (YYYY-AA-GG). Kaydı silmek için boş bırakın:",cur.d||td);if(d===null)return;d=d.trim();if(!d){delete g.done[p[1]];save();vxRerender();return}if(!vxDate(d)){alert("Tarih YYYY-AA-GG biçiminde olmalı, ör. "+td);return}
  var lot=prompt("Aşı seri (parti) numarası (isteğe bağlı):",cur.lot||"");g.done[p[1]]={d:d,lot:lot?lot.trim():""};save();vxRerender()}});
document.addEventListener("change",function(e){var t=e.target;if(!t||!t.dataset||!t.dataset.vxg)return;var g=(S.vx||[]).filter(function(x){return String(x.id)===t.dataset.vxg})[0];if(!g)return;g[t.dataset.vxf]=t.value;save();vxRerender()});
document.addEventListener("toggle",function(e){if(e.target&&e.target.id==="vxBox"){S.ui=S.ui||{};S.ui.vx=e.target.open;try{save()}catch(er){}}},true);
var HZSEL={};
function hzRank(sp){var L=HZ[sp]||[],sel=Object.keys(HZSEL).filter(function(k){return HZSEL[k]});if(!sel.length)return [];return L.map(function(d){var sc=0,mx=0;Object.keys(d.sg).forEach(function(k){mx+=d.sg[k];if(HZSEL[k])sc+=d.sg[k]});return {d:d,sc:sc,pc:mx>0?sc/mx:0}}).filter(function(r){return r.sc>=3}).sort(function(a,b){return b.sc-a.sc||b.pc-a.pc}).slice(0,4)}
function hzResHTML(sp){var R=hzRank(sp);if(!Object.keys(HZSEL).some(function(k){return HZSEL[k]}))return '<p class="s">Gördüğünüz belirtileri işaretleyin; olası hastalıklar burada sıralanır.</p>';if(!R.length)return '<p class="s">İşaretlenen belirtiler rehberdeki beslenmeye bağlı hastalıklarla yeterince örtüşmüyor. Enfeksiyon veya başka bir hastalık olabilir: veteriner hekime danışın.</p>';
 return '<ol class="nt">'+R.map(function(r){return '<li><b>'+r.d.n+'</b> <small>(eşleşme %'+Math.round(r.pc*100)+')</small> <button class="ed" data-hzo="'+r.d.k+'" style="min-height:0;padding:0 6px">Kartı aç</button></li>'}).join('')+'</ol><p class="s">Bu sıralama yalnız yön göstericidir, teşhis değildir.</p>'}
function hzCard(d){var li=function(a){return a.map(function(t){return '<li>'+t+'</li>'}).join('')},KIM={V:"Veteriner hekim",Ç:"Çiftçi (reçetesiz)","V/Ç":"Veteriner veya eğitimli çiftçi","Ç/V":"Çiftçi veya veteriner","—":"—"};
 return '<details class="dt" id="hz_'+d.k+'" style="margin:6px 0"><summary><b>'+d.n+'</b></summary><p class="s" style="margin:4px 0"><b>Ne zaman:</b> '+d.w+'</p>'
 +'<p class="s" style="margin:6px 0 0"><b>Belirtiler</b></p><ul class="nt">'+li(d.b)+'</ul>'
 +'<p class="s" style="margin:6px 0 0"><b>Çiftlikte ilk müdahale</b></p><ul class="nt">'+li(d.i)+'</ul>'
 +'<p class="s" style="margin:6px 0 0"><b>Tedavi seçenekleri</b> (etken madde / yöntem; doz ve uygulama veteriner hekimindir)</p><table class="c"><tr><th>İlaç / yöntem</th><th>Kim</th></tr>'+d.t.map(function(t){return '<tr><td>'+t[0]+'<br><small style="color:var(--mu)">'+t[2]+'</small></td><td>'+(KIM[t[1]]||t[1])+'</td></tr>'}).join('')+'</table>'
 +'<p class="s" style="margin:6px 0 0"><b>Sık yapılan hatalar</b></p><ul class="nt">'+li(d.h)+'</ul>'
 +'<p class="s" style="margin:6px 0 0"><b>Veteriner hekiminize sorabilecekleriniz</b></p><ul class="nt">'+li(d.q)+'</ul>'
 +'<p class="s" style="margin:6px 0 0"><b>Önleme ve rasyon</b></p><ul class="nt">'+li(d.o)+'</ul>'
 +'<p class="s" style="margin:6px 0 0;color:var(--no)"><b>Ne zaman acil:</b> '+d.a+'</p><small>Kaynak: '+d.s+'</small></details>'}
function hzGuide(sp){var L=HZ[sp];if(!L)return '';
 return '<details class="dt" id="hzBox" style="margin-top:10px"'+(S.ui&&S.ui.hz?' open':'')+'><summary>Hastalık rehberi: beslenmeye bağlı hastalıklar, belirtiler, ilk müdahale ve tedavi seçenekleri</summary>'
 +'<div class="card" style="border-color:var(--wa);margin:6px 0"><p class="s" style="margin:0"><b>Önemli:</b> Bu rehber teşhis koymaz ve veteriner hekimin yerini tutmaz. Reçeteli ilaçlarda doz verilmez; dozu ve uygulamayı veteriner hekim belirler. Türkiye\'de antibiyotik ve hormonlar veteriner hekimin e-reçetesiyle alınır; arınma süresi reçetede ve prospektüste yazar. Reçetesiz ürünlerde ürün etiketindeki dozu uygulayın. <b>Kullanılan her ilacın süt ve et arınma süresi prospektüste yazar; bu süre boyunca süt ve et satılamaz.</b> Tedavi listeleri, uygulanan tedaviyi standart seçeneklerle karşılaştırıp veteriner hekiminizle konuşabilmeniz içindir; veteriner muayeneye göre farklı ve haklı bir seçim yapabilir.</p></div>'
 +'<h3 style="margin:8px 0 4px;font-size:14px">Belirti kontrol listesi</h3><div class="g" style="grid-template-columns:1fr">'+Object.keys(HZS).filter(function(k){return L.some(function(d){return d.sg[k]})}).map(function(k){return '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" class="hzs" data-hz="'+k+'"'+(HZSEL[k]?' checked':'')+' style="width:20px;height:20px;margin:0;flex:none">'+HZS[k]+'</label>'}).join('')+'</div><div id="hzRes" data-sp="'+sp+'">'+hzResHTML(sp)+'</div>'
 +'<h3 style="margin:10px 0 4px;font-size:14px">Hastalık kartları</h3>'+L.map(hzCard).join('')+'</details>'}
document.addEventListener("change",function(e){var t=e.target;if(!t||!t.classList||!t.classList.contains("hzs"))return;HZSEL[t.dataset.hz]=t.checked;var r=$("hzRes");if(r)r.innerHTML=hzResHTML(r.dataset.sp)});
document.addEventListener("click",function(e){var t=e.target;if(t&&t.dataset&&t.dataset.hzo){var d=$("hz_"+t.dataset.hzo);if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})}}});
document.addEventListener("toggle",function(e){if(e.target&&e.target.id==="hzBox"){S.ui=S.ui||{};S.ui.hz=e.target.open;try{save()}catch(er){}}},true);

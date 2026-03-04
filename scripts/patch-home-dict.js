const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'app', 'dictionaries');
const files = ['en.json', 'tr.json', 'zh.json'];

const patches = {
  en: {
    welcomeTagline: 'Your trusted travel agency in Cappadocia',
    welcomeHeading: 'Welcome to Kısmet Göreme',
    welcomeBody1: "Based in the heart of Göreme, Kısmet Göreme Travel specialises in tailor-made experiences across Turkey. From the fairy chimneys and cave hotels of Cappadocia to Istanbul's vibrant streets and the turquoise coast, we create unforgettable journeys.",
    welcomeBody2: "Whether it's hot air balloon flights over Cappadocia, guided valley walks, or unique experiences across Turkey, we offer authentic hospitality and memories that last a lifetime.",
    bestSellingTours: 'Best Selling Tours',
    activitiesTitle: 'Activities & Services',
    activityBalloon: 'Balloon Flight',
    activityTours: 'Day Tours',
    activityTransfer: 'Airport Transfer',
    whyUsTitle: 'Why choose us',
    whyUs1: 'Premium experiences',
    whyUs2: 'Local experts',
    whyUs3: 'Best price guarantee',
    ctaTitle: "Need help? We're here for you.",
    ctaButton: 'Contact us',
    viewAllTours: 'View all tours',
  },
  tr: {
    welcomeTagline: "Kapadokya'da güvenilir seyahat acenteniz",
    welcomeHeading: "Kısmet Göreme'ye hoş geldiniz",
    welcomeBody1: "Kapadokya'nın kalbi Göreme'de bulunan Kısmet Göreme Travel, Türkiye genelinde kişiye özel turlar konusunda uzmandır. Peribacalarından ve mağara otellerinden İstanbul'un canlı sokaklarına, turkuaz kıyılara kadar ikonik destinasyonları keşfedin.",
    welcomeBody2: "Kapadokya üzerinde sıcak hava balonu turlarından vadilerde rehberli yürüyüşlere ve eşsiz deneyimlere kadar, unutulmaz yolculuklar ve otantik Türk misafirperverliği sunuyoruz.",
    bestSellingTours: 'En Çok Satan Turlar',
    activitiesTitle: 'Aktiviteler ve Hizmetler',
    activityBalloon: 'Balon Turu',
    activityTours: 'Gün Turları',
    activityTransfer: 'Havalimanı Transferi',
    whyUsTitle: 'Neden bizi seçmelisiniz',
    whyUs1: 'Premium deneyimler',
    whyUs2: 'Yerel uzmanlar',
    whyUs3: 'En iyi fiyat garantisi',
    ctaTitle: 'Yardıma mı ihtiyacınız var? Yanınızdayız.',
    ctaButton: 'İletişime geçin',
    viewAllTours: 'Tüm turlar',
  },
  zh: {
    welcomeTagline: '卡帕多奇亚值得信赖的旅行社',
    welcomeHeading: '欢迎来到Kısmet Göreme',
    welcomeBody1: 'Kısmet Göreme Travel位于格雷梅中心，专为土耳其各地量身定制旅程。从仙女烟囱和洞穴酒店到伊斯坦布尔充满活力的街道和碧蓝海岸，我们打造难忘之旅。',
    welcomeBody2: '无论是卡帕多奇亚的热气球飞行、山谷导览徒步，还是土耳其各地的独特体验，我们提供地道的土耳其式款待与持久回忆。',
    bestSellingTours: '最畅销旅游',
    activitiesTitle: '活动与服务',
    activityBalloon: '热气球',
    activityTours: '一日游',
    activityTransfer: '机场接送',
    whyUsTitle: '为什么选择我们',
    whyUs1: '优质体验',
    whyUs2: '当地专家',
    whyUs3: '最优价格保证',
    ctaTitle: '需要帮助？我们随时为您服务。',
    ctaButton: '联系我们',
    viewAllTours: '查看全部',
  },
};

files.forEach((file, i) => {
  const lang = file.replace('.json', '');
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.home) data.home = {};
  Object.assign(data.home, patches[lang] || patches.en);
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log('Patched', file);
});

export const homeLanguages = ["en", "ar", "ur", "hi"] as const;
export type HomeLanguage = (typeof homeLanguages)[number];
export function homeLanguage(value?: string): HomeLanguage {
  return homeLanguages.includes(value as HomeLanguage) ? (value as HomeLanguage) : "en";
}
export const homeCopy = {
  en: {
    eyebrow: "PREMIUM AIRPORT TRANSFERS IN UAE",
    first: "Luxury in",
    second: "Every Journey",
    description: "Luxury transfers across Dubai and the UAE with comfort, reliability and style.",
    book: "Book Your Transfer",
    services: "Discover our services",
    login: "Login",
    bookNow: "Book Now",
    links: ["Home", "Airport Transfers", "Our Fleet", "Track Your Ride", "About Us", "Contact"],
  },
  ar: {
    eyebrow: "خدمات نقل فاخرة من وإلى المطارات في الإمارات",
    first: "رحلتك،",
    second: "بتواصل رائع",
    description: "تنقلات فاخرة في دبي والإمارات براحة وموثوقية وأناقة.",
    book: "احجز تنقلك",
    services: "اكتشف خدماتنا",
    login: "تسجيل الدخول",
    bookNow: "احجز الآن",
    links: ["الرئيسية", "نقل المطار", "أسطولنا", "تتبع رحلتك", "من نحن", "اتصل بنا"],
  },
  ur: {
    eyebrow: "متحدہ عرب امارات میں پریمیم ایئرپورٹ ٹرانسفر",
    first: "آپ کا سفر،",
    second: "خوبصورت رابطے کے ساتھ",
    description: "دبئی اور متحدہ عرب امارات میں آرام، اعتماد اور انداز کے ساتھ سفر۔",
    book: "اپنا ٹرانسفر بک کریں",
    services: "ہماری خدمات دریافت کریں",
    login: "لاگ ان",
    bookNow: "ابھی بک کریں",
    links: ["ہوم", "ایئرپورٹ ٹرانسفر", "ہمارا فلیٹ", "سفر ٹریک کریں", "ہمارے بارے میں", "رابطہ"],
  },
  hi: {
    eyebrow: "यूएई में प्रीमियम एयरपोर्ट ट्रांसफर",
    first: "आपकी यात्रा,",
    second: "बेहतर जुड़ाव के साथ",
    description: "दुबई और यूएई में आराम, भरोसे और शैली के साथ लग्ज़री ट्रांसफर।",
    book: "अपना ट्रांसफर बुक करें",
    services: "हमारी सेवाएँ जानें",
    login: "लॉगिन",
    bookNow: "अभी बुक करें",
    links: [
      "होम",
      "एयरपोर्ट ट्रांसफर",
      "हमारे वाहन",
      "यात्रा ट्रैक करें",
      "हमारे बारे में",
      "संपर्क",
    ],
  },
} as const;

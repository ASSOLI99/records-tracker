# Contributing · المساهمة

**English** · [العربية](#العربية)

Thanks for helping make Records Tracker better!

## Getting started

```bash
npm install --legacy-peer-deps
```

```bash
npx expo run:android
```

The app needs a development build (not Expo Go). See [docs/development.md](docs/development.md).

## Before you open a pull request

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

## House rules

1. **Two languages, always.** Every user-facing string goes in `src/i18n/strings.ts`, in both `en`
   and `ar`. Insert values with `t('key', { name })`; never concatenate strings, because that breaks
   bidi isolation.
2. **RTL is not an afterthought.** Use `start` and `end`, not `left` and `right`, get the direction
   from `useDir()`, and check every screen in Arabic. (The journey map is the one deliberate
   exception: it is drawn the same way in both directions.) Icons that point forward or back must mirror
   (`useDirIcon`).
3. **The on-disk format is a contract.** `src/model/types.ts` is saved to users' folders. Add
   fields; never rename or remove them.
4. **No network and no tracking.** The app is local-first by design, so a pull request that adds an
   analytics SDK or a remote call won't be merged.
5. **Use Expo's tools.** Add packages with `npx expo install <package>`, and never edit `android/`
   or `ios/` by hand, because they are generated.
6. **Keep logic in `src/model/`** and cover it with tests in `src/model/__tests__/`.

## Reporting bugs

Please use the [issue templates](https://github.com/ASSOLI99/records-tracker/issues/new/choose).
Don't attach your real `record-tracker` folder; it holds your personal data.

---

<div dir="rtl">

## العربية

شكرًا لمساعدتك في تحسين «متتبّع السجلات»!

### البداية

ثبّت الحزم بالأمر `npm install --legacy-peer-deps`، ثم شغّل التطبيق بالأمر `npx expo run:android`.
يحتاج التطبيق إلى نسخة تطوير وليس Expo Go. التفاصيل في [ملاحظات التطوير](docs/development.ar.md).

### قبل فتح طلب الدمج

تأكد من نجاح `npm run typecheck` و `npm run lint` و `npm test`.

### قواعد المشروع

1. **لغتان دائمًا.** كل نص يظهر للمستخدم يُكتب في `src/i18n/strings.ts` بالنسختين `en` و `ar`.
   أدرج القيم بـ `t('key', { name })`، ولا تجمع النصوص يدويًا لأن ذلك يكسر عزل الاتجاه.
2. **الاتجاه من اليمين إلى اليسار ليس أمرًا ثانويًا.** استخدم `start` و `end` بدل `left` و `right`، وخذ
   الاتجاه من `useDir()`، وجرّب كل شاشة بالعربية. الأيقونات التي تشير إلى الأمام أو الخلف يجب أن
   تنعكس (`useDirIcon`). الاستثناء الوحيد المقصود هو خريطة الرحلة، فهي تُرسم بالطريقة نفسها في الاتجاهين.
3. **صيغة الملفات المحفوظة عقد ثابت.** الأنواع في `src/model/types.ts` تُحفظ في مجلدات المستخدمين.
   أضف حقولًا جديدة، ولا تغيّر أسماء الحقول الموجودة أو تحذفها.
4. **لا اتصال بالشبكة ولا تتبّع.** التطبيق محلي بالتصميم، فلن يُقبل طلب دمج يضيف أداة إحصاءات أو اتصالًا بخادم.
5. **استخدم أدوات Expo.** أضف الحزم بـ `npx expo install <package>`، ولا تعدّل مجلدي `android/` و `ios/`
   يدويًا لأنهما يُولَّدان تلقائيًا.
6. **ضع المنطق في `src/model/`** واكتب له اختبارات في `src/model/__tests__/`.

### الإبلاغ عن الأخطاء

استخدم [نماذج الـ issues](https://github.com/ASSOLI99/records-tracker/issues/new/choose)، ولا ترفق
مجلد `record-tracker` الحقيقي لأنه يحتوي بياناتك الشخصية.

</div>

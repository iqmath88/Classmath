# اختبارات نيبور كلاس

## المتطلبات
- Node.js 18 أو أحدث.
- Playwright مع Chromium:
  ```bash
  npm i -g playwright
  npx playwright install chromium
  ```
- Python 3، للاختبارات الثابتة.
- `poppler-utils` (`pdfinfo` و`pdftoppm`) لبعض اختبارات PDF.

## التشغيل
من جذر المصدر (المجلد الذي فيه `index.html`):

**اختبار واحد:**
```bash
NODE_PATH=$(npm root -g) node data-safety-sync.e2e.js
```

**كل الاختبارات:**
```bash
for f in tests/*/*.e2e.js; do NODE_PATH=$(npm root -g) node "$f" | tail -1; done
python3 run_static_qa.py
```

**قياس الأداء** (لا يُعدّ اختبار نجاح أو فشل):
```bash
NODE_PATH=$(npm root -g) node performance.bench.js 12
```

- كل اختبار يشغّل خادمًا محليًا على منفذ عشوائي، ويستخدم بيانات وهمية فقط.
- المزامنة تُختبر بخادم Supabase وهمي داخل الاختبار، لا بالسحابة الحقيقية.
- كل ملف يطبع في آخره `… N PASS, M FAIL`، ويخرج بالرمز 1 عند أي فشل.

## ملاحظة عن البنية
المصدر بمجلدات (`src/…`، `katex/…`، `tests/…`). المستودع المنشور مجلد واحد مسطّح يُنتجه سكربت التسطيح.

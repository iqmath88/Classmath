# نيبور كلاس v2.17.1 — تقرير الاختبارات

- **البيئة:** Chromium (Playwright) على Linux. لم يُشغَّل على Safari/WebKit ولا Edge ولا جهاز آيباد حقيقي.
- **قبل التعديل (خط الأساس، v2.17.0):** 524 تحققًا ناجحًا، و0 فاشلًا، في 29 ملفًا، والاختبارات الثابتة 14/14.
- **بعد التعديل (v2.17.1):** 550 تحققًا ناجحًا، و0 فاشلًا، في 31 ملفًا، والاختبارات الثابتة 14/14.
- **إثبات الاختبارات الجديدة:** `review-qbank` فشل في 8 تحققات على v2.17.0، و`pdf-orientation` فشل في 2. ونجحا بعد الإصلاح، و`review-qbank` نجح في 4 تشغيلات متتالية.

| الملف | النتيجة |
|---|---|
| `v2.10.0/layout-boxes-watermark.e2e.js` | v2.10.0 layout/boxes/watermark: 20/20 PASS |
| `v2.10.1/header-footer.e2e.js` | v2.10.1 header/footer: 16 PASS, 0 FAIL |
| `v2.10.2/brand-header-footer.e2e.js` | v2.10.2 brand header/footer: 19 PASS, 0 FAIL |
| `v2.10.3/single-header.e2e.js` | v2.10.3 single header: 12 PASS, 0 FAIL |
| `v2.11.0/chapter-booklet.e2e.js` | v2.11.0 chapter booklet: 13 PASS, 0 FAIL |
| `v2.12.0/page-view-editor.e2e.js` | v2.12.0 page view editor: 24 PASS, 0 FAIL |
| `v2.13.0/page-engine.e2e.js` | v2.13.0 page engine: 23 PASS, 0 FAIL |
| `v2.13.1/work-protection.e2e.js` | v2.13.1 work protection: 12 PASS, 0 FAIL |
| `v2.14.0/menus-audit.e2e.js` | v2.14.0 menus & audit: 26 PASS, 0 FAIL |
| `v2.15.0/editions.e2e.js` | v2.15.0 editions: 23 PASS, 0 FAIL |
| `v2.16.0/nav-sync-version.e2e.js` | v2.16.0 nav/sync/version: 27 PASS, 0 FAIL |
| `v2.16.1/ui-polish.e2e.js` | v2.16.1 ui polish: 17 PASS, 0 FAIL |
| `v2.17.0/content-offline.e2e.js` | v2.17.0 content & offline: 15 PASS, 0 FAIL |
| `v2.17.0/data-safety-sync.e2e.js` | v2.17.0 data safety & sync: 20 PASS, 0 FAIL |
| `v2.17.1/pdf-orientation.e2e.js` | v2.17.1 pdf orientation: 7 PASS, 0 FAIL |
| `v2.17.1/review-qbank.e2e.js` | v2.17.1 review & qbank: 19 PASS, 0 FAIL |
| `v2.8.12/tables-and-timetable.e2e.js` | v2.8.12 tables & timetable: 25/25 PASS |
| `v2.8.13/editor-equations.e2e.js` | v2.8.13 editor & equations: 23/23 PASS |
| `v2.8.14/ui-nibor-class.e2e.js` | v2.8.14 Nibor Class UI: 16/16 PASS |
| `v2.8.16/editor-core.e2e.js` | v2.8.16 editor core: 28/28 PASS |
| `v2.8.17/print.e2e.js` | v2.8.17 print: 6/6 PASS |
| `v2.9.0/storage-idb.e2e.js` | v2.9.0 storage: 22/22 PASS |
| `v2.9.1/writing-mode.e2e.js` | v2.9.1 writing mode: 19/19 PASS |
| `v2.9.2/ipad-keyboard-equation.e2e.js` | v2.9.2 iPad keyboard: 23/23 PASS |
| `v2.9.3/print-flow.e2e.js` | v2.9.3 print flow: 15/15 PASS |
| `v2.9.4/data-safety.e2e.js` | v2.9.4 data safety: 22/22 PASS |
| `v2.9.5/pdf-export.e2e.js` | v2.9.5 pdf export: 21/21 PASS |
| `v2.9.6/print-ipad.e2e.js` | v2.9.6 print iPad: 8/8 PASS |
| `v2.9.7/print-typography.e2e.js` | v2.9.7 print typography: 13/13 PASS |
| `v2.9.8/installed-app-print.e2e.js` | v2.9.8 installed app print: 8/8 PASS |
| `v2.9.9/color-theme.e2e.js` | v2.9.9 color theme: 8/8 PASS |

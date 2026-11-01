/* =========================================================
   نيبور كلاس v2.8.14 — أيقونات خطية موحّدة (SVG مدمج)
   ICON(name, extraClass) → وسم <svg> بلون currentColor، 24×24.
   ========================================================= */
(function(global){
"use strict";
const P={
  plus:'<path d="M12 5v14M5 12h14"/>',
  pagebreak:'<path d="M6 3.5h12v5.5H6zM6 15h12v5.5H6z"/><path d="M3 12.2h2.2M8 12.2h2.6M13.4 12.2H16M18.8 12.2H21"/>',
  table:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M14.5 9.5v10"/>',
  image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  graph:'<path d="M4 20.5V3.5M4 20.5h16.5"/><path d="M6.5 17c2.5-.2 3.6-9.5 6.5-9.5s3.5 6 6.5 6"/>',
  more:'<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  alignRight:'<path d="M20 6H4M20 10h-10M20 14H4M20 18h-10"/>',
  alignCenter:'<path d="M20 6H4M17 10H7M20 14H4M17 18H7"/>',
  alignLeft:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  listBullet:'<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="17" r=".9"/>',
  listNumber:'<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 5.5l1.3-.8V9M3.8 14.2c.3-.7 1.9-.8 1.9.3 0 .9-1.9 1.6-1.9 2.5h2M3.8 9h2.4"/>',
  eraser:'<path d="M8.5 19.5l-4-4a1.6 1.6 0 0 1 0-2.3l8.7-8.7a1.6 1.6 0 0 1 2.3 0l4 4a1.6 1.6 0 0 1 0 2.3l-7 7z"/><path d="M8.5 19.5h11M9.7 9.2l5.6 5.6"/>',
  undo:'<path d="M9 7L4.5 11.5 9 16"/><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-2"/>',
  home:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  book:'<path d="M12 6.5C10.3 5.2 7.9 4.6 4 4.8v13.4c3.9-.2 6.3.4 8 1.7 1.7-1.3 4.1-1.9 8-1.7V4.8c-3.9-.2-6.3.4-8 1.7z"/><path d="M12 6.5v13.4"/>',
  users:'<circle cx="9" cy="8.5" r="3.3"/><path d="M3.2 19.5c.7-3.2 3-5 5.8-5s5.1 1.8 5.8 5"/><path d="M15.5 5.6a3.1 3.1 0 0 1 0 5.9"/><path d="M17.3 14.7c1.8.6 3.1 2.2 3.5 4.8"/>',
  check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.3"/>',
  percent:'<path d="M18.5 5.5l-13 13"/><circle cx="7.5" cy="7.5" r="2.4"/><circle cx="16.5" cy="16.5" r="2.4"/>',
  pen:'<path d="M15.6 4.6l3.8 3.8L8.7 19.1l-4.6.8.8-4.6z"/><path d="M13.6 6.6l3.8 3.8"/>',
  wallet:'<rect x="3.5" y="6" width="17" height="13" rx="3"/><path d="M3.5 9.5h17"/><path d="M16 14.2h1.6"/><path d="M6.5 6l8.7-2.4c.9-.2 1.8.4 1.8 1.4V6"/>',
  settings:'<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 17h11"/><path d="M19 17h1"/><circle cx="17" cy="17" r="2"/>',
  moon:'<path d="M19.5 14.3A7.8 7.8 0 0 1 9.7 4.5a7.8 7.8 0 1 0 9.8 9.8z"/>',
  sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/>',
  expand:'<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
  building:'<path d="M4.5 20.5V6.2l7.5-2.7 7.5 2.7v14.3"/><path d="M3 20.5h18"/><path d="M9 9h.01M12 9h.01M15 9h.01M9 12.5h.01M12 12.5h.01M15 12.5h.01"/><path d="M10.2 20.5v-4h3.6v4"/>',
  userPlus:'<circle cx="10" cy="8.5" r="3.3"/><path d="M4.2 19.5c.7-3.2 3-5 5.8-5 1.4 0 2.6.4 3.6 1.2"/><path d="M18 13.5v6M15 16.5h6"/>',
  exam:'<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5"/><path d="M8.5 13l1.6 1.6 3-3.2"/><path d="M8.5 17.5h7"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  chart:'<path d="M4 20.5h16"/><rect x="5.5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6.5" width="3" height="11.5" rx="1"/><rect x="15.5" y="13.5" width="3" height="4.5" rx="1"/>',
  bolt:'<path d="M13 3L5.5 13.2h5.6L10.5 21 18 10.8h-5.6z"/>',
  alert:'<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.2"/><path d="M12 17.2h.01"/>',
  star:'<path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
  trendDown:'<path d="M3.5 7.5l6 6 3.5-3.5 7.5 7.5"/><path d="M15.5 17.5h5v-5"/>',
  pin:'<path d="M9 3.5h6l-1 5.5 3 3H7l3-3z"/><path d="M12 12v8.5"/>',
  clipboard:'<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 4.5V3.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v.7"/><path d="M8.5 11h7M8.5 15h5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  chevron:'<path d="M14.5 6l-6 6 6 6"/>',
  sparkle:'<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  user:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/>',
  sunrise:'<path d="M4 18.5h16"/><path d="M7.5 18.5a4.5 4.5 0 0 1 9 0"/><path d="M12 5v4M5.6 9.6l1.5 1.5M18.4 9.6l-1.5 1.5"/>'
};
function ICON(name,cls){const d=P[name];if(!d)return '';return '<svg class="ic ic-'+name+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>'}
ICON.names=Object.keys(P);
global.ICON=ICON;
})(window);

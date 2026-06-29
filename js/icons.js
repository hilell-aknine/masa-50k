/* ============================================================
   אייקוני SVG מינימליים (Lucide-style) · מחליפים אימוג'י צבעוני
   שימוש: <span data-ic="lock"></span>  → מתמלא אוטומטית ב-SVG
   עובד גם על תוכן שנוצר דינמית (MutationObserver).
   ============================================================ */
(function () {
  var css = '.ic{width:1em;height:1em;display:inline-block;vertical-align:-.14em;flex:none;fill:none;'
          + 'stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
          + '[data-ic]{display:inline-flex;align-items:center;justify-content:center}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var I = {
    lock:    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    key:     '<circle cx="7.5" cy="15.5" r="4"/><path d="m10.4 12.6 8-8"/><path d="m15.5 7 2 2"/>',
    cap:     '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 2.5 2.5 6 2.5s6-1 6-2.5v-5"/>',
    note:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    download:'<path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book:    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/>',
    flame:   '<path d="M12 2c1.2 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.2.4-2.4 1.2-3.3C10 9 11 10.5 11 12c1.2-2-.8-4 1-10Z"/>',
    play:    '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 6 3.5-6 3.5Z"/>',
    camera:  '<path d="M14.5 4h-5L8 6.2H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.2a2 2 0 0 0-2-2h-4Z"/><circle cx="12" cy="13" r="3"/>',
    spark:   '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M5 5l2.5 2.5"/><path d="M16.5 16.5 19 19"/><path d="M3 12h4"/><path d="M17 12h4"/>',
    zap:     '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    shield:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    send:    '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
    target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    brain:   '<path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V13a3 3 0 0 0 4 2.8V18a2 2 0 0 0 4 0V6a3 3 0 0 0-3-3Z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8"/>'
  };
  function svg(p){ return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  function fill(root){
    (root || document).querySelectorAll('[data-ic]').forEach(function(e){
      if (e.firstChild) return;
      var n = e.getAttribute('data-ic');
      if (I[n]) e.innerHTML = svg(I[n]);
    });
  }
  try { new MutationObserver(function(){ fill(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(e){}
  if (document.body) fill(); else document.addEventListener('DOMContentLoaded', function(){ fill(); });
  window.icHTML = function(n){ return I[n] ? svg(I[n]) : ''; };
})();

/* ============================================================
   סרגל עליון · המסע ל-50K
   מוזרק אוטומטית בכל דף מוגן אחרי שהשער אישר את המשתמש.
   מקשיב ל-oriane:ready, ולכן לעולם לא מוצג למי שאין לו גישה.
   ============================================================ */
(function () {
  'use strict';

  var CSS = [
    '.onav{position:sticky;top:0;z-index:250;display:flex;align-items:center;gap:6px;',
    '  background:var(--surface);border-bottom:1px solid var(--line);',
    '  padding:8px 12px;margin:0 -18px 4px;min-height:56px}',
    '.onav .brand{font-weight:800;font-size:15px;color:var(--text-strong);text-decoration:none;',
    '  margin-inline-end:auto;white-space:nowrap}',
    '.onav a.item,.onav button.item{display:inline-flex;align-items:center;justify-content:center;gap:6px;',
    '  font-family:inherit;font-size:13.5px;font-weight:600;color:var(--text);background:transparent;',
    '  border:1px solid transparent;border-radius:var(--radius-pill);padding:9px 12px;min-height:44px;',
    '  cursor:pointer;text-decoration:none;transition:.15s;white-space:nowrap}',
    '.onav a.item:hover,.onav button.item:hover{background:var(--surface-2);border-color:var(--line)}',
    '.onav a.item.on{background:var(--btn-bg);color:var(--btn-text)}',
    '.onav .who{font-size:12px;color:var(--text-faint);max-width:130px;overflow:hidden;',
    '  text-overflow:ellipsis;white-space:nowrap;direction:ltr}',
    '@media(max-width:560px){',
    '  .onav .who{display:none}',
    '  .onav .brand{font-size:14px}',
    '  .onav a.item,.onav button.item{padding:9px 10px;font-size:13px}',
    '}'
  ].join('');

  document.addEventListener('oriane:ready', function (ev) {
    var me = ev.detail || {};
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function link(href, label, active) {
      return '<a class="item' + (active ? ' on' : '') + '" href="' + href + '">' + label + '</a>';
    }

    var html =
      '<nav class="onav" dir="rtl">' +
        '<a class="brand" href="index.html">המסע ל-50K</a>' +
        link('index.html', 'המסע', here === 'index.html') +
        link('me.html', 'האזור שלי', here === 'me.html') +
        (me.isAdmin ? link('admin.html', 'ניהול', here === 'admin.html') : '') +
        '<span class="who">' + (me.email || '') + '</span>' +
        '<button class="item" id="onav-out" type="button">יציאה</button>' +
      '</nav>';

    document.body.insertAdjacentHTML('afterbegin', html);

    document.getElementById('onav-out').addEventListener('click', function () {
      var auth = window.ORIANE_AUTH || (window.firebase && firebase.auth && firebase.auth());
      if (!auth) return location.replace('login.html');
      auth.signOut().then(function () {
        location.replace('login.html');
      }).catch(function () {
        location.replace('login.html');
      });
    });
  });
})();

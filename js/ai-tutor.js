/* ============================================================
   היועצת הדיגיטלית · עוזרת הלימוד הצפה
   מוזרקת לעמודי הקורס. שימוש: <script src="js/ai-tutor.js"></script>

   מ-22.09.2026 זה כבר לא דמו.
   השאלה נשלחת ל-Cloud Function בשם askAdvisor, שמרכיבה את
   התשובה אך ורק מהחומר שאוריאן העלתה במרכז היועצת, ומוסיפה לה
   את מה שהמשתמשת עצמה מילאה בחוברות העבודה.

   למה לא קוראים למודל ישירות מכאן: מפתח ה-API הוא של אוריאן.
   מפתח ב-JS של הדפדפן גלוי לכל אחד, נגרד, ומישהו אחר מוציא לה
   את הכסף מהחשבון. הוא לא עוזב את השרת אף פעם.

   דורש firebase-functions-compat.js בדף. אם הוא חסר, או שהמנוע
   עוד לא נפרס, החלונית אומרת את זה במפורש במקום להיכשל בשקט.
   ============================================================ */
(function () {
  'use strict';

  var REGION = 'us-central1';
  var FN = 'askAdvisor';

  var css = ''
    + '.ait-fab{position:fixed;inset-inline-end:16px;bottom:16px;z-index:400;display:flex;align-items:center;gap:9px;'
    + 'background:var(--btn-bg);color:var(--btn-text);border:none;border-radius:30px;padding:12px 18px;font-family:Inter,sans-serif;'
    + 'font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.28)}'
    + '.ait-fab .d{width:8px;height:8px;border-radius:50%;background:#1E8F4E;box-shadow:0 0 0 0 rgba(30,143,78,.6);animation:aitp 2s infinite}'
    + '@keyframes aitp{0%{box-shadow:0 0 0 0 rgba(30,143,78,.5)}70%{box-shadow:0 0 0 7px rgba(30,143,78,0)}100%{box-shadow:0 0 0 0 rgba(30,143,78,0)}}'
    + '.ait-panel{position:fixed;inset-inline-end:16px;bottom:16px;z-index:401;width:330px;max-width:calc(100vw - 32px);height:460px;max-height:calc(100vh - 32px);'
    + 'background:var(--surface);border:1px solid var(--line);border-radius:18px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 12px 44px rgba(0,0,0,.4)}'
    + '.ait-panel.open{display:flex}'
    + '.ait-head{background:var(--surface-2);padding:14px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid var(--line)}'
    + '.ait-head .av{width:36px;height:36px;border-radius:50%;background:var(--btn-bg);color:var(--btn-text);display:grid;place-items:center;font-size:18px;flex:none}'
    + '.ait-head .nm{font-weight:700;color:var(--text-strong);font-size:14.5px}'
    + '.ait-head .st{font-size:11.5px;color:var(--text-dim);margin-top:1px}'
    + '.ait-head .x{margin-inline-start:auto;background:none;border:none;color:var(--text-dim);font-size:22px;cursor:pointer;line-height:1}'
    + '.ait-body{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px}'
    + '.ait-msg{max-width:84%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap}'
    + '.ait-msg.bot{align-self:flex-start;background:var(--surface-2);color:var(--text);border-bottom-inline-start-radius:4px}'
    + '.ait-msg.me{align-self:flex-end;background:var(--btn-bg);color:var(--btn-text);border-bottom-inline-end-radius:4px}'
    + '.ait-msg.sys{align-self:center;background:transparent;color:var(--text-faint);font-size:12px;text-align:center;max-width:100%}'
    + '.ait-typing{align-self:flex-start;color:var(--text-dim);font-size:13px;padding:4px 6px}'
    + '.ait-foot{border-top:1px solid var(--line);padding:10px;display:flex;gap:8px;background:var(--surface)}'
    + '.ait-foot input{flex:1;background:var(--input-bg);border:1px solid var(--line);border-radius:22px;padding:10px 14px;color:var(--text);font-family:Inter,sans-serif;font-size:13.5px;outline:none}'
    + '.ait-foot input:disabled{opacity:.6}'
    + '.ait-foot button{background:var(--btn-bg);color:var(--btn-text);border:none;border-radius:50%;width:42px;height:42px;flex:none;cursor:pointer;font-size:17px}'
    + '.ait-foot button:disabled{opacity:.5;cursor:default}'
    + '.ait-note{font-size:11px;color:var(--text-faint);text-align:center;padding:0 14px 10px;line-height:1.5}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var fab = document.createElement('button');
  fab.className = 'ait-fab';
  fab.innerHTML = '<span class="d"></span><span data-ic="cap"></span> היועצת שלך';

  var panel = document.createElement('div');
  panel.className = 'ait-panel';
  panel.innerHTML =
      '<div class="ait-head"><div class="av"><span data-ic="cap"></span></div>'
    + '<div><div class="nm" id="aitName">היועצת הדיגיטלית</div>'
    + '<div class="st" id="aitSub">כאן לכל שאלה על המסע</div></div>'
    + '<button class="x" aria-label="סגור">×</button></div>'
    + '<div class="ait-body" id="aitBody"></div>'
    + '<div class="ait-note" id="aitNote">היועצת עונה מהחומר של אוריאן בלבד</div>'
    + '<div class="ait-foot"><input id="aitInput" placeholder="שאלי אותי כל דבר..." autocomplete="off">'
    + '<button id="aitSend" aria-label="שלח"><span data-ic="send"></span></button></div>';

  /* התחנה שממנה שואלים. בדף התחנה זה קובע איזה חומר נשלף,
     ובלעדיו חומר של תחנה אחרת היה מזהם את התשובה. */
  function currentStation() {
    var m = /[?&]id=(\d+)/.exec(location.search);
    return m ? parseInt(m[1], 10) : null;
  }

  function start(me) {
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var body   = panel.querySelector('#aitBody');
    var input  = panel.querySelector('#aitInput');
    var sendBt = panel.querySelector('#aitSend');
    var note   = panel.querySelector('#aitNote');

    var db = window.ORIANE_DB;
    var stationId = currentStation();
    var loaded = false;
    var busy = false;

    /* firebase-functions-compat חייב להיטען בדף. אם הוא חסר,
       אומרים את זה במפורש במקום לזרוק ולהיראות כמו חלונית מתה. */
    var fns = null;
    try {
      if (window.firebase && firebase.app && firebase.app().functions) {
        fns = firebase.app().functions(REGION);
      }
    } catch (e) { console.error('[tutor]', e); }

    function paint(text, who) {
      var m = document.createElement('div');
      m.className = 'ait-msg ' + who;
      m.textContent = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }

    function disable(msg) {
      input.disabled = true; sendBt.disabled = true;
      note.textContent = msg;
    }

    /* שם היועצת נקרא מהאישיות שאוריאן הגדירה, כדי שלא יהיה
       שם אחד בממשק הניהול ושם אחר אצל התלמידה. */
    if (db) {
      db.collection('advisor_config').doc('persona').get().then(function (s) {
        var n = s.exists && s.data().display_name;
        if (n) {
          panel.querySelector('#aitName').textContent = n;
          fab.lastChild.textContent = ' ' + n;
        }
      }).catch(function () {});
    }

    /* ---------- היסטוריה ----------
       מקור האמת הוא advisor_chats בשרת, ולא localStorage. זה מה
       שמאפשר לאוריאן לראות את השיחה בתיק המשתמשת, וזה גם מה
       ששורד החלפת מכשיר. */
    function loadHistory() {
      if (loaded) return Promise.resolve();
      loaded = true;
      if (!db) return Promise.resolve();
      return db.collection('advisor_chats').doc(me.uid).collection('messages')
        .orderBy('created_at', 'asc').limit(60).get()
        .then(function (snap) {
          /* שאלה ותשובה נכתבות ב-batch אחד ולכן נושאות את אותה
             חותמת זמן. מיון לפי created_at בלבד משאיר את הסדר
             ביניהן לא מוגדר, ולפעמים התשובה הוצגה מעל השאלה.
             seq שובר את השוויון. רשומות ישנות בלי seq נופלות
             חזרה לפי תפקיד. המיון כאן ולא בשאילתה, כדי לא
             לדרוש אינדקס מורכב בפיירסטור. */
          var rows = snap.docs.map(function (d) { return d.data(); });
          rows.sort(function (a, b) {
            var ta = (a.created_at && a.created_at.toMillis) ? a.created_at.toMillis() : 0;
            var tb = (b.created_at && b.created_at.toMillis) ? b.created_at.toMillis() : 0;
            if (ta !== tb) return ta - tb;
            var sa = (a.seq != null) ? a.seq : (a.role === 'user' ? 0 : 1);
            var sb = (b.seq != null) ? b.seq : (b.role === 'user' ? 0 : 1);
            return sa - sb;
          });
          rows.forEach(function (x) {
            paint(x.body, x.role === 'user' ? 'me' : 'bot');
          });
          return snap.size;
        }).catch(function (e) { console.error('[tutor] history', e); return 0; });
    }

    function open() {
      panel.classList.add('open');
      fab.style.display = 'none';
      loadHistory().then(function (n) {
        if (!body.children.length) {
          paint('היי, אני כאן בשבילך 🎓\nאפשר לשאול אותי כל שאלה על המסע, ואני אענה לפי החומר של אוריאן.', 'bot');
        }
        setTimeout(function () { if (!input.disabled) input.focus(); }, 80);
      });
    }

    function close() {
      panel.classList.remove('open');
      fab.style.display = 'flex';
    }

    function send() {
      if (busy) return;
      var v = (input.value || '').trim();
      if (v.length < 3) return;

      if (!fns) {
        paint('היועצת עוד לא מחוברת. אוריאן מסיימת להגדיר אותה.', 'sys');
        return;
      }

      busy = true;
      paint(v, 'me');
      input.value = '';
      input.disabled = true; sendBt.disabled = true;

      var typing = document.createElement('div');
      typing.className = 'ait-typing';
      typing.textContent = 'חושבת…';
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      fns.httpsCallable(FN)({ question: v, stationId: stationId })
        .then(function (r) {
          typing.remove();
          paint((r.data && r.data.answer) || 'לא הצלחתי לנסח תשובה. נסי לשאול אחרת.', 'bot');
        })
        .catch(function (e) {
          typing.remove();
          var code = e && e.code;
          /* "המנוע לא נפרס" ו"אין גישה" הם מצבים צפויים ומטופלים,
             ולכן הם לא נרשמים כשגיאה. console.error שמורה למה
             שבאמת לא צפוי, אחרת רעש קבוע מסתיר תקלה אמיתית. */
          var expected = code === 'functions/not-found' || code === 'not-found'
                      || code === 'functions/permission-denied' || code === 'permission-denied';
          if (!expected) console.error('[tutor]', e);

          if (code === 'functions/not-found' || code === 'not-found') {
            paint('היועצת עוד לא באוויר. אוריאן מסיימת להגדיר אותה, וזה יעבוד בקרוב.', 'sys');
            disable('היועצת בהכנה');
          } else if (code === 'functions/permission-denied' || code === 'permission-denied') {
            paint('אין לך גישה פעילה ליועצת כרגע.', 'sys');
            disable('אין גישה');
          } else {
            paint('משהו השתבש. נסי שוב בעוד רגע.', 'sys');
          }
        })
        .then(function () {
          busy = false;
          if (!input.disabled) return;
          // נשאר מושבת רק כשהשבתנו אותו במפורש למעלה
          if (note.textContent === 'היועצת בהכנה' || note.textContent === 'אין גישה') return;
          input.disabled = false; sendBt.disabled = false; input.focus();
        });
    }

    fab.addEventListener('click', open);
    panel.querySelector('.x').addEventListener('click', close);
    sendBt.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  }

  /* נכנס לפעולה רק אחרי שהשער אישר משתמשת. בלי זה היינו קוראים
     לפונקציה בלי uid והיא הייתה מחזירה unauthenticated. */
  document.addEventListener('oriane:ready', function (ev) { start(ev.detail); });
})();

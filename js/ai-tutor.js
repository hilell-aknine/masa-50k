/* ============================================================
   מורה AI · עוזר לימוד צף · מוזרק אוטומטית לעמודי הקורס
   דמו: תשובות מוכנות. בגרסה המלאה יתחבר למנוע AI לפי תוכן השיעור.
   שימוש: <script src="js/ai-tutor.js"></script>
   ============================================================ */
(function () {
  var css = ''
    + '.ait-fab{position:fixed;inset-inline-end:16px;bottom:16px;z-index:400;display:flex;align-items:center;gap:9px;'
    + 'background:var(--btn-bg);color:var(--btn-text);border:none;border-radius:30px;padding:12px 18px;font-family:Inter,sans-serif;'
    + 'font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.28)}'
    + '.ait-fab .d{width:8px;height:8px;border-radius:50%;background:#3a8a6d;box-shadow:0 0 0 0 rgba(58,138,109,.6);animation:aitp 2s infinite}'
    + '@keyframes aitp{0%{box-shadow:0 0 0 0 rgba(58,138,109,.5)}70%{box-shadow:0 0 0 7px rgba(58,138,109,0)}100%{box-shadow:0 0 0 0 rgba(58,138,109,0)}}'
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
    + '.ait-typing{align-self:flex-start;color:var(--text-dim);font-size:13px;padding:4px 6px}'
    + '.ait-foot{border-top:1px solid var(--line);padding:10px;display:flex;gap:8px;background:var(--surface)}'
    + '.ait-foot input{flex:1;background:var(--input-bg);border:1px solid var(--line);border-radius:22px;padding:10px 14px;color:var(--text);font-family:Inter,sans-serif;font-size:13.5px;outline:none}'
    + '.ait-foot button{background:var(--btn-bg);color:var(--btn-text);border:none;border-radius:50%;width:42px;height:42px;flex:none;cursor:pointer;font-size:17px}'
    + '.ait-note{font-size:11px;color:var(--text-faint);text-align:center;padding:0 14px 10px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var REPLIES = [
    'שאלה מצוינת 🎯\nהדבר הכי חשוב בתחנה הזו הוא ליישם צעד מעשי אחד לפני שממשיכים. בחר פעולה קטנה ועשה אותה עוד היום.',
    'אני כאן בשבילך 💡\nכדאי לחזור על החלק המרכזי ולסמן לעצמך משפט אחד שהכי חיבר אותך. זה מה שמזיז קדימה.',
    'הכיוון שלך נכון 👏\nזכור שהמסע ל-50K נבנה תחנה אחרי תחנה. אל תמהר, תהיה עקבי, וזה יגיע.',
    'בוא נפרק את זה ✅\nרשום שלושה דברים שלמדת בתחנה, ובחר אחד שתתחיל ליישם השבוע. התקדמות אמיתית מתחילה ביישום.'
  ];
  var ri = 0;

  var fab = document.createElement('button');
  fab.className = 'ait-fab';
  fab.innerHTML = '<span class="d"></span>🎓 המורה שלך';

  var panel = document.createElement('div');
  panel.className = 'ait-panel';
  panel.innerHTML =
      '<div class="ait-head"><div class="av">🎓</div><div><div class="nm">המורה הדיגיטלי</div><div class="st">כאן לכל שאלה על השיעור</div></div><button class="x" aria-label="סגור">×</button></div>'
    + '<div class="ait-body" id="aitBody"></div>'
    + '<div class="ait-note">תצוגת דמו · בגרסה המלאה המורה עונה לפי תוכן השיעור</div>'
    + '<div class="ait-foot"><input id="aitInput" placeholder="שאל אותי כל דבר..." autocomplete="off"><button id="aitSend" aria-label="שלח">➤</button></div>';

  function ready() {
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    var body = panel.querySelector('#aitBody');
    var input = panel.querySelector('#aitInput');

    function add(text, who) {
      var m = document.createElement('div'); m.className = 'ait-msg ' + who; m.textContent = text;
      body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
    }
    function open() { panel.classList.add('open'); fab.style.display = 'none'; if (!body.children.length) add('היי, אני המורה הדיגיטלי שלך 🎓\nאפשר לשאול אותי כל שאלה על השיעור ואני אעזור לך להבין וליישם.', 'bot'); setTimeout(function(){ input.focus(); }, 80); }
    function close() { panel.classList.remove('open'); fab.style.display = 'flex'; }
    function send() {
      var v = (input.value || '').trim(); if (!v) return;
      add(v, 'me'); input.value = '';
      var t = document.createElement('div'); t.className = 'ait-typing'; t.textContent = 'המורה מקליד…';
      body.appendChild(t); body.scrollTop = body.scrollHeight;
      setTimeout(function () { t.remove(); add(REPLIES[ri % REPLIES.length], 'bot'); ri++; }, 950);
    }

    fab.addEventListener('click', open);
    panel.querySelector('.x').addEventListener('click', close);
    panel.querySelector('#aitSend').addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  }

  if (document.body) ready(); else document.addEventListener('DOMContentLoaded', ready);
})();

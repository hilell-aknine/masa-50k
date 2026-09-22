/* ============================================================
   היועצת הדיגיטלית · שכבת נתונים משותפת
   נטען אחרי gate.js ו-data/content.js בכל מסך של מרכז היועצת.

   למה קובץ אחד משותף: שלושה מסכי ניהול קוראים לאותם אוספים.
   שמות אוספים מפוזרים על פני שלושה קבצים זה איך שמתגלה באג
   שבו מסך אחד כותב ל-advisor_doc ומסך אחר קורא מ-advisor_docs.

   מודל הנתונים
   ------------
   advisor_config/persona            אישיות היועצת · מסמך יחיד
   advisor_docs/{id}                 מסמכי ידע שאוריאן מעלה
   advisor_qa/{id}                   שאלות ותשובות מדויקות שלה
   advisor_stations/{stationId}      מה היועצת יודעת על כל תחנה
   advisor_chats/{uid}/messages/{id} שיחות המשתמשת מול היועצת
   workbooks/{stationId}             מבנה חוברת העבודה של התחנה
   workbook_answers/{uid}/stations/{stationId}  התשובות של המשתמשת

   אוסף questions הקיים לא נוגעים בו. הוא שאלות שאוריאן עונה
   עליהן ביד, וזה מסלול נפרד מהיועצת.
   ============================================================ */
(function () {
  'use strict';

  var A = {};

  A.COL = {
    config:   'advisor_config',
    docs:     'advisor_docs',
    qa:       'advisor_qa',
    stations: 'advisor_stations',
    chats:    'advisor_chats',
    workbooks:'workbooks',
    answers:  'workbook_answers',
    questions:'questions',
    profiles: 'profiles'
  };

  A.PERSONA_ID = 'persona';

  /* ברירת המחדל לאישיות. נכתבת למסד רק כשאוריאן שומרת בפועל,
     כדי שלא נדרוס טקסט שהיא כתבה בטעינה מחדש של המסך. */
  A.PERSONA_DEFAULT = {
    display_name: 'היועצת הדיגיטלית',
    system_prompt:
      'את היועצת העסקית הדיגיטלית של אוריאן כהן, בתוך הקורס "המסע ל-50K".\n' +
      'את עונה רק על בסיס החומר של אוריאן שנמסר לך. אם התשובה לא נמצאת בחומר, אומרת את זה בפירוש ומפנה לתחנה הרלוונטית.\n' +
      'את מדברת עברית, בגוף שני, בגובה העיניים, בלי ז\'רגון מיותר.\n' +
      'כל תשובה נגמרת בצעד מעשי אחד שאפשר לעשות היום.',
    boundaries:
      'לא לתת ייעוץ משפטי, רפואי או פיננסי-השקעתי.\n' +
      'לא להבטיח תוצאות כספיות ולא לנקוב בסכומים שהמשתמשת תרוויח.\n' +
      'לא להמציא נתונים, שמות לקוחות או מקרי בוחן שלא מופיעים בחומר.',
    refusal:
      'זה לא משהו שאני יכולה לענות עליו מהחומר של אוריאן. שווה להעלות את זה בשאלות לאוריאן ולקבל ממנה תשובה אישית.',
    updated_at: null
  };

  A.FIELD_TYPES = [
    { v: 'short', label: 'שורה אחת' },
    { v: 'long',  label: 'טקסט ארוך' },
    { v: 'table', label: 'טבלה · כמה שורות' }
  ];

  /* ---------- עזרי תצוגה ---------- */

  A.esc = function (t) {
    var d = document.createElement('div');
    d.textContent = (t === null || t === undefined) ? '' : String(t);
    return d.innerHTML;
  };

  A.when = function (ts) {
    if (!ts || typeof ts.toDate !== 'function') return '';
    var d = ts.toDate();
    return d.toLocaleDateString('he-IL') + ' ' +
           d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  A.toast = function (msg, bad) {
    var e = document.getElementById('toast');
    if (!e) return;
    e.textContent = msg;
    e.className = 'toast on' + (bad ? ' bad' : '');
    clearTimeout(A.toast._t);
    A.toast._t = setTimeout(function () { e.className = 'toast'; }, 2800);
  };

  A.uid = function () {
    /* מזהה מקומי לשדות ולשורות. לא סוד ולא מזהה אבטחה,
       ולכן Math.random מספיק כאן. */
    return 'f' + Math.random().toString(36).slice(2, 9);
  };

  /* ---------- תחנות ---------- */

  /* מקור האמת לרשימת התחנות הוא data/content.js, בדיוק כמו בכל
     שאר הפורטל. אסור לשכפל כאן רשימה שתתיישן ברגע שאוריאן
     משנה שם של תחנה. */
  A.stations = function () {
    return (window.COURSE && window.COURSE.allStations) || [];
  };

  A.stationName = function (id) {
    var s = A.stations().filter(function (x) { return String(x.id) === String(id); })[0];
    return s ? s.name : ('תחנה ' + id);
  };

  A.lessonsOf = function (id) {
    var s = A.stations().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!s) return [];
    if (s.lessons && s.lessons.length) return s.lessons;
    /* תחנה עם סרטון בודד ובלי מערך שיעורים עדיין צריכה שיעור אחד
       שאפשר לתלות עליו חוברת עבודה. */
    return s.youtubeId ? [{ n: s.name, youtubeId: s.youtubeId }] : [];
  };

  A.stationSelect = function (sel, opts) {
    opts = opts || {};
    sel.innerHTML = '';
    if (opts.anyLabel) {
      var o = document.createElement('option');
      o.value = ''; o.textContent = opts.anyLabel;
      sel.appendChild(o);
    }
    A.stations().forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id;
      o.textContent = 'תחנה ' + s.id + ' · ' + s.name;
      sel.appendChild(o);
    });
  };

  /* ---------- גישה למסד ---------- */

  A.db = function () { return window.ORIANE_DB; };
  A.now = function () { return firebase.firestore.FieldValue.serverTimestamp(); };

  A.col = function (name) { return A.db().collection(A.COL[name] || name); };

  /* עוטף כל כתיבה בהודעת שגיאה קריאה. בלי זה כשל בכללי השרת
     מגיע למשתמשת כ-"FirebaseError: Missing or insufficient permissions"
     וזה נראה כמו תקלה במקום כמו הרשאה חסרה. */
  A.write = function (promise, okMsg) {
    return promise.then(function (r) {
      if (okMsg) A.toast(okMsg);
      return r;
    }).catch(function (e) {
      console.error('[advisor]', e);
      A.toast(
        (e && e.code === 'permission-denied')
          ? 'אין לך הרשאה לשמור את זה. צריך חשבון מנהלת.'
          : 'השמירה נכשלה. נסי שוב.',
        true
      );
      throw e;
    });
  };

  /* ---------- הערכת גודל החומר ----------
     היועצת נשלחת למודל עם החומר הפעיל. אם החומר גדול מדי הקריאה
     נחתכת בשקט ותשובות מתחילות להשמיט חלקים בלי שאף אחד ישים לב.
     ההערכה כאן גסה בכוונה ומיועדת להתרעה ויזואלית בלבד:
     בעברית כ-2 תווים לטוקן, וזה מוערך כלפי מטה. */
  A.estTokens = function (chars) { return Math.ceil((chars || 0) / 2); };

  A.BUDGET_TOKENS = 60000;

  window.Advisor = A;
})();

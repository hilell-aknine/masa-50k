/* ============================================================
   חוברת העבודה · הצד שהתלמידה ממלאת
   נטען בדף התחנה, אחרי gate.js ו-data/content.js.

   מתלבש על <div id="wbForm" data-station="N"></div> ולא נוגע
   בשום דבר אחר בדף. הקובץ הזה נפרד בכוונה: station.html שייך
   לאוריאן והיא דוחפת בו קומיטים, ולכן כל מה שאנחנו מוסיפים חי
   בצד ומחובר בשורה אחת.

   מבנה השאלות מגיע מ-workbooks/{stationId}, שאוריאן בונה
   ב-workbook-builder.html. התשובות נשמרות ב:
   workbook_answers/{uid}/stations/{stationId}

   בקשת אוריאן 22.09, בלשונה: "קבצי PDF זה מתחת לכל פרק, אני
   רוצה שיהיה להם את השאלות האלה שהם ימלאו ויעשו Submit, ואז
   המערכת שומרת את הנתונים האלה לכל user", ו"הוא גם יכול
   להעתיק את התשובות שלו ולשלוח את זה".
   ============================================================ */
(function () {
  'use strict';

  var CSS = ''
    /* הסקשן מופרד ויזואלית בכוונה. אוריאן ביקשה "לראות שאנחנו
       בsection אחר" ולא עוד בלוק שמתמזג עם התחנה. */
    + '.wbf{margin:26px auto 0;border:1px solid var(--line);border-radius:var(--radius-card);'
    + '  background:var(--surface-2);overflow:hidden}'
    + '.wbf .wbf-top{padding:18px 20px;border-bottom:1px solid var(--line);background:var(--surface)}'
    + '.wbf .wbf-top h3{font-size:17px;color:var(--text-strong);display:flex;align-items:center;gap:9px}'
    + '.wbf .wbf-top p{font-size:13.5px;color:var(--text-dim);margin-top:7px;line-height:1.6}'
    + '.wbf .wbf-body{padding:6px 20px 20px}'
    + '.wbf .les{padding:18px 0;border-bottom:1px solid var(--line)}'
    + '.wbf .les:last-child{border-bottom:0}'
    + '.wbf .les > h4{font-size:14.5px;color:var(--text-strong);margin-bottom:6px}'
    + '.wbf .les > .intro{font-size:13.5px;color:var(--text-dim);line-height:1.6;margin-bottom:12px}'
    + '.wbf .fld{margin-top:16px}'
    + '.wbf .fld > label{display:block;font-size:14px;font-weight:600;color:var(--text-strong);margin-bottom:6px}'
    + '.wbf .fld > label .req{color:var(--accent);margin-inline-start:4px}'
    + '.wbf .fld > .hlp{font-size:12.5px;color:var(--text-dim);margin-bottom:8px;line-height:1.55}'
    + '.wbf input[type=text],.wbf textarea{width:100%;padding:12px 14px;font-size:15px;font-family:inherit;'
    + '  background:var(--input-bg);color:var(--text);border:1px solid var(--line);border-radius:12px;min-height:46px}'
    + '.wbf textarea{min-height:104px;resize:vertical;line-height:1.65}'
    + '.wbf input:focus,.wbf textarea:focus{outline:none;border-color:var(--btn-bg)}'
    + '.wbf .tbl{overflow-x:auto;-webkit-overflow-scrolling:touch}'
    + '.wbf table{width:100%;border-collapse:separate;border-spacing:0 7px;min-width:420px}'
    + '.wbf th{text-align:right;font-size:12.5px;color:var(--text-dim);font-weight:600;padding:0 8px 4px}'
    + '.wbf td{padding:0 4px}'
    + '.wbf td input{min-height:44px;font-size:14.5px}'
    + '.wbf .addrow{margin-top:6px}'
    + '.wbf button{padding:11px 17px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;'
    + '  min-height:44px;background:var(--btn-bg);color:var(--btn-text);border:0;border-radius:var(--radius-pill)}'
    + '.wbf button.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}'
    + '.wbf button.sm{padding:8px 13px;font-size:13px;min-height:38px}'
    + '.wbf button:disabled{opacity:.5;cursor:default}'
    + '.wbf .wbf-foot{display:flex;gap:9px;flex-wrap:wrap;align-items:center;'
    + '  padding:16px 20px;border-top:1px solid var(--line);background:var(--surface)}'
    + '.wbf .wbf-foot .state{font-size:12.5px;color:var(--text-dim);margin-inline-start:auto}'
    + '.wbf .wbf-foot .state.ok{color:var(--done,#1E8F4E)}'
    + '.wbf .wbf-foot .state.bad{color:var(--accent)}'
    + '.wbf .prog{font-size:12.5px;color:var(--text-dim)}'
    + '@media(max-width:600px){'
    + '  .wbf .wbf-body{padding:4px 14px 16px}.wbf .wbf-top,.wbf .wbf-foot{padding:15px 14px}'
    + '  .wbf .wbf-foot button{flex:1 1 auto}.wbf .wbf-foot .state{width:100%;margin:4px 0 0}'
    + '}';

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = (t === null || t === undefined) ? '' : String(t);
    return d.innerHTML;
  }

  function mount(me) {
    var host = document.getElementById('wbForm');
    if (!host) return;
    var stationId = String(host.getAttribute('data-station') || '');
    if (!stationId) return;

    var db = window.ORIANE_DB;
    if (!db) return;

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var wbRef  = db.collection('workbooks').doc(stationId);
    var ansRef = db.collection('workbook_answers').doc(me.uid)
                   .collection('stations').doc(stationId);

    var spec = null;     // מבנה השאלות של אוריאן
    var data = {};       // { lessonIndex: { fieldId: value } }
    var dirty = false;

    Promise.all([wbRef.get(), ansRef.get()]).then(function (r) {
      var w = r[0].exists ? r[0].data() : null;
      data = (r[1].exists && r[1].data().lessons) ? r[1].data().lessons : {};

      var lessons = (w && w.lessons || []).filter(function (l) {
        return (l.fields || []).length > 0;
      });

      /* תחנה בלי שאלות פשוט לא מציגה חוברת. עדיף כלום מאשר
         קופסה ריקה שנראית כמו תקלה. */
      if (!lessons.length) { host.style.display = 'none'; return; }

      spec = lessons;
      render(lessons);
    }).catch(function (e) {
      console.error('[workbook]', e);
      host.style.display = 'none';
    });

    /* ---------- ציור ---------- */
    function render(lessons) {
      host.className = 'wbf';
      host.innerHTML =
        '<div class="wbf-top">' +
          '<h3><span data-ic="book"></span> חוברת העבודה של התחנה</h3>' +
          '<p>כאן את מיישמת. מה שתכתבי נשמר אצלך, ואת יכולה לחזור ולערוך בכל רגע. ' +
            'אוריאן רואה את מה שמילאת כשאתן נפגשות.</p>' +
        '</div>' +
        '<div class="wbf-body">' +
          lessons.map(function (l) {
            return '<div class="les">' +
              '<h4>' + esc(l.title) + '</h4>' +
              (l.intro ? '<div class="intro">' + esc(l.intro) + '</div>' : '') +
              (l.fields || []).map(function (f) { return fieldHtml(l.index, f); }).join('') +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="wbf-foot">' +
          '<button id="wbSave" type="button">שמירה</button>' +
          '<button id="wbCopy" class="ghost sm" type="button">העתקת התשובות</button>' +
          '<button id="wbDl" class="ghost sm" type="button">הורדה</button>' +
          '<span class="state" id="wbState"></span>' +
        '</div>';

      // האייקונים מתמלאים לבד: js/icons.js מריץ MutationObserver על הדף.
      wire();
      progress();
    }

    function val(li, fid) {
      return (data[String(li)] || {})[fid];
    }

    function fieldHtml(li, f) {
      var v = val(li, f.id);
      var h = '<div class="fld" data-li="' + li + '" data-fid="' + esc(f.id) + '" data-type="' + esc(f.type) + '">' +
        '<label>' + esc(f.label) + (f.required ? '<span class="req">*</span>' : '') + '</label>' +
        (f.help ? '<div class="hlp">' + esc(f.help) + '</div>' : '');

      if (f.type === 'table') {
        var cols = f.columns || [];
        var rows = Array.isArray(v) && v.length ? v : [];
        while (rows.length < (f.rows || 3)) rows.push({});
        h += '<div class="tbl"><table><tr>' +
              cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') +
            '</tr>' +
            rows.map(function (row, ri) {
              return '<tr data-ri="' + ri + '">' + cols.map(function (c) {
                return '<td><input type="text" data-ck="' + esc(c.key) + '" value="' + esc(row[c.key] || '') + '"></td>';
              }).join('') + '</tr>';
            }).join('') +
        '</table></div>' +
        '<button class="ghost sm addrow" type="button" data-addrow="1">+ שורה</button>';
      } else if (f.type === 'long') {
        h += '<textarea>' + esc(v || '') + '</textarea>';
      } else {
        h += '<input type="text" value="' + esc(v || '') + '">';
      }
      return h + '</div>';
    }

    /* ---------- קריאה מהטופס ---------- */
    function collect() {
      var out = {};
      Array.prototype.forEach.call(host.querySelectorAll('.fld'), function (el) {
        var li = el.getAttribute('data-li');
        var fid = el.getAttribute('data-fid');
        var type = el.getAttribute('data-type');
        out[li] = out[li] || {};

        if (type === 'table') {
          var rows = [];
          Array.prototype.forEach.call(el.querySelectorAll('tr[data-ri]'), function (tr) {
            var row = {}, any = false;
            Array.prototype.forEach.call(tr.querySelectorAll('input[data-ck]'), function (inp) {
              var t = inp.value.trim();
              row[inp.getAttribute('data-ck')] = t;
              if (t) any = true;
            });
            /* שורות ריקות לא נשמרות. אחרת התיק של אוריאן מתמלא
               בשורות ריק שנראות כאילו התלמידה התחילה ולא סיימה. */
            if (any) rows.push(row);
          });
          out[li][fid] = rows;
        } else {
          var inp2 = el.querySelector('textarea,input[type=text]');
          out[li][fid] = inp2 ? inp2.value.trim() : '';
        }
      });
      return out;
    }

    function filledCount(d) {
      var n = 0, tot = 0;
      (spec || []).forEach(function (l) {
        (l.fields || []).forEach(function (f) {
          tot++;
          var v = (d[String(l.index)] || {})[f.id];
          if (Array.isArray(v) ? v.length : String(v || '').trim()) n++;
        });
      });
      return { n: n, tot: tot };
    }

    function progress() {
      var c = filledCount(collect());
      var s = document.getElementById('wbState');
      if (s && !dirty) s.textContent = 'מילאת ' + c.n + ' מתוך ' + c.tot;
    }

    function setState(txt, cls) {
      var s = document.getElementById('wbState');
      if (!s) return;
      s.textContent = txt;
      s.className = 'state' + (cls ? ' ' + cls : '');
    }

    /* ---------- שמירה ---------- */
    var saveTimer = null;

    function save(explicit) {
      var d = collect();
      var btn = document.getElementById('wbSave');
      if (explicit && btn) btn.disabled = true;
      setState('שומר…');

      return ansRef.set({
        station_id: parseInt(stationId, 10),
        lessons: d,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function () {
        data = d; dirty = false;
        var c = filledCount(d);
        setState('נשמר ✓ · מילאת ' + c.n + ' מתוך ' + c.tot, 'ok');
      }).catch(function (e) {
        console.error('[workbook] save', e);
        setState(e && e.code === 'permission-denied'
          ? 'אין הרשאה לשמור. נסי להתחבר מחדש.'
          : 'השמירה נכשלה. הטקסט שלך עדיין כאן, נסי שוב.', 'bad');
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    }

    function wire() {
      /* שמירה אוטומטית מושהית. התלמידה לא אמורה לאבד טקסט אם
         היא סוגרת טאב, אבל גם לא לייצר כתיבה על כל תו. */
      host.addEventListener('input', function () {
        dirty = true;
        setState('לא נשמר עדיין');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { save(false); }, 2500);
      });

      host.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;

        if (b.hasAttribute('data-addrow')) {
          var fld = b.closest('.fld');
          var tb = fld.querySelector('table');
          var last = tb.querySelector('tr[data-ri]:last-of-type');
          var clone = last.cloneNode(true);
          clone.setAttribute('data-ri', tb.querySelectorAll('tr[data-ri]').length);
          Array.prototype.forEach.call(clone.querySelectorAll('input'), function (i) { i.value = ''; });
          tb.appendChild(clone);
          return;
        }

        if (b.id === 'wbSave') { save(true); return; }
        if (b.id === 'wbCopy') { copyOut(b); return; }
        if (b.id === 'wbDl')   { download(); return; }
      });

      /* אזהרה לפני יציאה עם טקסט שלא נשמר */
      window.addEventListener('beforeunload', function (e) {
        if (!dirty) return;
        e.preventDefault(); e.returnValue = '';
      });
    }

    /* ---------- העתקה והורדה ----------
       בקשתה המפורשת: שהתלמידה תוכל לקחת את התשובות שלה החוצה. */
    function asText() {
      var d = collect();
      var lines = ['חוברת העבודה · תחנה ' + stationId, ''];
      (spec || []).forEach(function (l) {
        var any = (l.fields || []).some(function (f) {
          var v = (d[String(l.index)] || {})[f.id];
          return Array.isArray(v) ? v.length : String(v || '').trim();
        });
        if (!any) return;
        lines.push('## ' + l.title);
        (l.fields || []).forEach(function (f) {
          var v = (d[String(l.index)] || {})[f.id];
          if (Array.isArray(v)) {
            if (!v.length) return;
            lines.push(f.label + ':');
            v.forEach(function (row) {
              lines.push('  - ' + (f.columns || []).map(function (c) {
                return c.label + ': ' + (row[c.key] || '');
              }).join(' | '));
            });
          } else if (String(v || '').trim()) {
            lines.push(f.label + ': ' + v);
          }
        });
        lines.push('');
      });
      return lines.join('\n');
    }

    function copyOut(btn) {
      var t = asText();
      var done = function () {
        var o = btn.textContent;
        btn.textContent = 'הועתק ✓';
        setTimeout(function () { btn.textContent = o; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done).catch(fallback);
      } else fallback();

      function fallback() {
        /* דפדפנים ישנים ו-http לא נותנים clipboard API.
           בלי המסלול הזה הכפתור פשוט לא עושה כלום. */
        var ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { setState('ההעתקה נכשלה', 'bad'); }
        document.body.removeChild(ta);
      }
    }

    function download() {
      var blob = new Blob([asText()], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'חוברת-עבודה-תחנה-' + stationId + '.txt';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
  }

  document.addEventListener('oriane:ready', function (ev) { mount(ev.detail); });
})();

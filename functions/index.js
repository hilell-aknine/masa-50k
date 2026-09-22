/* ============================================================
   מנוע היועצת הדיגיטלית · המסע ל-50K
   Cloud Function יחידה: askAdvisor

   למה בכלל צד שרת
   ---------------
   מפתח ה-OpenAI הוא של אוריאן ומחויב לחשבון שלה. מפתח ב-JS של
   הדפדפן גלוי לכל מי שפותח מקור, נגרד תוך ימים, ומישהו אחר
   מוציא את הכסף מהחשבון שלה. לכן המפתח יושב כאן כסוד של
   Firebase ולא עובר ללקוח אף פעם.

   מה הפונקציה עושה
   ----------------
   1. מאמתת שהמשתמשת מחוברת ושיש לה גישה פעילה (נכשל-סגור).
   2. מרכיבה את ההקשר מהחומר של אוריאן בלבד:
      אישיות → תשובות מדויקות → מפת התחנה → מסמכי ידע.
   3. מוסיפה את מה שהמשתמשת עצמה מילאה בחוברות העבודה, כדי
      שהתשובה תהיה עליה ולא כללית. זה בדיוק מה שאוריאן ביקשה.
   4. שולחת ל-OpenAI, שומרת את השיחה, ומחזירה תשובה + מקורות.

   פריסה
   ------
   firebase functions:secrets:set ORIANE_OPENAI_API_KEY
   firebase deploy --only functions
   ============================================================ */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const OPENAI_KEY = defineSecret('ORIANE_OPENAI_API_KEY');

initializeApp();
const db = getFirestore();

const MODEL = 'gpt-4o-mini';
const MAX_DOC_CHARS = 120000;   // תקרת חומר. מעבר לה חותכים מפורשות ומדווחים, לא בשקט.
const MAX_ANSWER_TOKENS = 700;

/* ============================================================
   מחירון · דולר למיליון טוקנים
   ------------------------------------------------------------
   ⚠️ אלה מחירי רשימה שאנחנו מתחזקים ביד, ולכן כל סכום במסך
   העלויות הוא **הערכה** ולא חיוב בפועל. הספק הוא מקור האמת.
   המחירון ניתן לעדכון מהמסך בלי פריסה, דרך advisor_config/pricing.
   ============================================================ */
const PRICING_FALLBACK = {
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4o':      { in: 2.50, out: 10.00 }
};

const BUDGET_FALLBACK = { monthly_limit_usd: 20, hard_stop: true };

/* חודש לפי שעון ישראל. UTC היה מגלגל את החודש ב-21:00 או 22:00
   בערב האחרון, והדוח היה מציג הוצאה בחודש הלא נכון. */
function ymIsrael() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit'
  }).format(new Date());   // "2026-09"
}

function dayIsrael() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());   // "2026-09-22"
}

function costOf(model, pricing, inTok, outTok) {
  const p = pricing[model] || PRICING_FALLBACK[model] || { in: 0, out: 0 };
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
}

/* אישיות ברירת מחדל. משמשת רק אם אוריאן עוד לא שמרה אישיות משלה,
   כדי שהיועצת לא תרוץ בלי שום גבולות ביום הראשון. */
const PERSONA_FALLBACK = {
  display_name: 'היועצת הדיגיטלית',
  system_prompt:
    'את היועצת העסקית הדיגיטלית של אוריאן כהן בתוך הקורס "המסע ל-50K". ' +
    'את עונה אך ורק על בסיס החומר שנמסר לך.',
  boundaries:
    'לא לתת ייעוץ משפטי, רפואי או השקעתי. לא להבטיח תוצאות כספיות. לא להמציא נתונים.',
  refusal:
    'זה לא משהו שאני יכולה לענות עליו מהחומר של אוריאן.'
};

/* ---------- עזרים ---------- */

const clean = (s, max) => String(s || '').trim().slice(0, max || 4000);

/* הופך את מה שהמשתמשת מילאה לטקסט קריא למודל.
   שדה שלא מולא מושמט לגמרי: "לא מילאה" בהקשר רק מבלבל את המודל
   וגורם לו להתייחס לזה כתוכן. */
function answersToText(workbooks, answers, stations) {
  const out = [];
  for (const st of stations) {
    const wb = workbooks[String(st.id)];
    const ans = answers[String(st.id)];
    if (!wb?.lessons || !ans?.lessons) continue;

    for (const lesson of wb.lessons) {
      const la = ans.lessons[String(lesson.index)];
      if (!la) continue;

      for (const f of (lesson.fields || [])) {
        const v = la[f.id];
        if (v === null || v === undefined) continue;

        if (Array.isArray(v)) {
          const rows = v
            .map(row => (f.columns || [])
              .map(c => `${c.label}: ${String(row?.[c.key] || '').trim()}`)
              .filter(s => !s.endsWith(': '))
              .join(', '))
            .filter(Boolean);
          if (rows.length) out.push(`[תחנה ${st.id}] ${f.label}\n- ${rows.join('\n- ')}`);
        } else if (String(v).trim()) {
          out.push(`[תחנה ${st.id}] ${f.label}: ${String(v).trim()}`);
        }
      }
    }
  }
  return out.join('\n');
}

/* ---------- הפונקציה ---------- */

export const askAdvisor = onCall(
  { secrets: [OPENAI_KEY], region: 'us-central1', cors: true, timeoutSeconds: 60, memory: '512MiB' },
  async (req) => {
    /* ---- 1. אימות · נכשל-סגור ---- */
    if (!req.auth) throw new HttpsError('unauthenticated', 'צריך להתחבר');
    const uid = req.auth.uid;

    const profSnap = await db.collection('profiles').doc(uid).get();
    if (!profSnap.exists) throw new HttpsError('permission-denied', 'אין פרופיל');
    const prof = profSnap.data();

    if (prof.access !== 'active') throw new HttpsError('permission-denied', 'אין גישה פעילה');

    const isAdmin = prof.role === 'admin';
    /* גישה מוגבלת בזמן נאכפת גם כאן ולא רק ב-gate.js ובכללים,
       אחרת מי שפג תוקפה עדיין שורפת טוקנים על החשבון של אוריאן. */
    if (!isAdmin && prof.access_until?.toDate && prof.access_until.toDate() <= new Date()) {
      throw new HttpsError('permission-denied', 'הגישה פגה');
    }

    const question = clean(req.data?.question, 2000);
    if (question.length < 3) throw new HttpsError('invalid-argument', 'שאלה ריקה');

    const stationId = req.data?.stationId ? parseInt(req.data.stationId, 10) : null;
    /* preview = מבחן של מנהלת במרכז היועצת. לא נשמר בתיק של אף
       תלמידה, אחרת הניסויים של אוריאן היו מזהמים את הדאטה. */
    const preview = !!req.data?.preview && isAdmin;

    /* ---- 1.5 שומר התקציב ----
       רץ לפני הקריאה למודל, כי אחריה הכסף כבר יצא. קורא מסמך
       מונה יחיד ולא סורק את כל הקריאות, אחרת כל שאלה הייתה
       מייצרת שאילתה שגדלה עם הזמן. */
    const ym = ymIsrael();
    const [budgetSnap, monthSnap, pricingSnap] = await Promise.all([
      db.collection('advisor_config').doc('budget').get(),
      db.collection('advisor_usage_monthly').doc(ym).get(),
      db.collection('advisor_config').doc('pricing').get()
    ]);

    const budget = budgetSnap.exists ? { ...BUDGET_FALLBACK, ...budgetSnap.data() } : BUDGET_FALLBACK;
    const pricing = pricingSnap.exists ? (pricingSnap.data().models || {}) : {};
    const spent = monthSnap.exists ? (monthSnap.data().cost_usd || 0) : 0;

    if (budget.hard_stop && budget.monthly_limit_usd > 0 && spent >= budget.monthly_limit_usd) {
      /* נכשל-סגור על תקציב. עדיף שהיועצת תשתוק מאשר שחשבון
         הלקוחה יתרוקן בלי שאף אחד ישים לב. */
      throw new HttpsError(
        'resource-exhausted',
        'היועצת הגיעה לתקרת השימוש החודשית שהוגדרה. אוריאן יכולה להעלות אותה במסך העלויות.'
      );
    }

    /* ---- 2. שליפת החומר של אוריאן ---- */
    const [personaSnap, docsSnap, qaSnap, stationSnap] = await Promise.all([
      db.collection('advisor_config').doc('persona').get(),
      db.collection('advisor_docs').where('status', '==', 'active').get(),
      db.collection('advisor_qa').where('status', '==', 'active').get(),
      stationId ? db.collection('advisor_stations').doc(String(stationId)).get() : Promise.resolve(null)
    ]);

    const persona = personaSnap.exists ? personaSnap.data() : PERSONA_FALLBACK;

    /* מסמך כללי תמיד רלוונטי. מסמך של תחנה נכנס רק כשהשאלה משם.
       בלי הסינון הזה חומר של תחנה 11 מזהם תשובה על תחנה 1. */
    const docs = docsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.scope === 'global' || (stationId && d.station_id === stationId));

    const qa = qaSnap.docs
      .map(d => d.data())
      .filter(q => !q.station_id || q.station_id === stationId);

    /* ---- 3. ההקשר האישי של המשתמשת ---- */
    let personalContext = '';

    /* הנוכחות הדיגיטלית שהיא מילאה באזור האישי. זה מה שמאפשר
       ליועצת להגיד "ראיתי שהאינסטגרם שלך על X" במקום לדבר בכללי.
       נכנס גם ב-preview, כי זה הפרופיל של מי ששואלת בפועל. */
    const lk = prof.links || {};
    const presence = [];
    if (lk.business) presence.push('מה העסק שלה עושה: ' + String(lk.business).slice(0, 300));
    for (const [k, label] of [
      ['instagram', 'אינסטגרם'], ['facebook', 'פייסבוק'], ['tiktok', 'טיקטוק'],
      ['youtube', 'יוטיוב'], ['linkedin', 'לינקדאין'], ['website', 'אתר']
    ]) {
      /* רק כתובות http/https נכנסות לפרומפט. אותו כלל כמו בממשק:
         מחרוזת שנשמרה לפני שהסינון היה קיים לא תודלף למודל. */
      const v = String(lk[k] || '');
      if (/^https?:\/\//i.test(v)) presence.push(`${label}: ${v.slice(0, 200)}`);
    }

    if (!preview) {
      const [wbSnap, ansSnap] = await Promise.all([
        db.collection('workbooks').get(),
        db.collection('workbook_answers').doc(uid).collection('stations').get()
      ]);
      const workbooks = {}; wbSnap.docs.forEach(d => { workbooks[d.id] = d.data(); });
      const answers = {};   ansSnap.docs.forEach(d => { answers[d.id] = d.data(); });
      const stations = wbSnap.docs.map(d => ({ id: d.data().station_id ?? d.id }));
      personalContext = answersToText(workbooks, answers, stations).slice(0, 8000);
    }

    /* ---- 4. הרכבת הפרומפט ---- */
    let knowledge = '';
    let used = [];
    let truncated = false;

    for (const d of docs) {
      const block = `\n\n### ${d.title}\n${d.body}`;
      if (knowledge.length + block.length > MAX_DOC_CHARS) { truncated = true; break; }
      knowledge += block;
      used.push(d.title);
    }

    const parts = [
      persona.system_prompt || PERSONA_FALLBACK.system_prompt,
      '',
      'גבולות שאסור לחצות:',
      persona.boundaries || PERSONA_FALLBACK.boundaries,
      '',
      'חוק ברזל: אם התשובה לא נמצאת בחומר שלמטה, אל תמציאי. עני בדיוק את המשפט הזה:',
      persona.refusal || PERSONA_FALLBACK.refusal
    ];

    if (stationSnap?.exists) {
      const s = stationSnap.data();
      parts.push('', `## התחנה שממנה שואלים: ${s.name || stationId}`);
      if (s.summary) parts.push(s.summary);
      if (s.goals?.length) parts.push('מה יוצאים ממנה עם: ' + s.goals.join(' · '));
      if (s.stuck_hint) parts.push('אם נתקעים כאן: ' + s.stuck_hint);
      if (s.next_station_id) parts.push(`התחנה הבאה שכדאי להפנות אליה: תחנה ${s.next_station_id}`);
    }

    if (qa.length) {
      parts.push('', '## תשובות מדויקות של אוריאן',
        'אם השאלה תואמת אחת מאלה, השתמשי בתשובה הזאת כמעט כלשונה.');
      qa.forEach(q => parts.push(`ש: ${q.question}\nת: ${q.answer}`));
    }

    if (knowledge) parts.push('', '## החומר של אוריאן', knowledge);
    else parts.push('', '## החומר של אוריאן', '(ריק. אין חומר פעיל, ולכן סרבי לענות.)');

    if (presence.length) {
      parts.push('', '## מי שואלת אותך',
        'זה מה שהיא סיפרה לנו על העסק שלה. התייחסי לזה כשזה רלוונטי,',
        'אבל אל תמציאי מה שראית אצלה ברשתות. אין לך גישה לתוכן שלהן, רק לכתובת.',
        presence.join('\n'));
    }

    if (personalContext) {
      parts.push('', '## מה שהמשתמשת עצמה מילאה בחוברות העבודה',
        'התייחסי לזה ישירות. זה מה שהופך את התשובה לשלה ולא לכללית.',
        personalContext);
    }

    const systemPrompt = parts.join('\n');

    /* ---- 5. קריאה למודל ---- */
    let answer;
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY.value()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_ANSWER_TOKENS,
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ]
        })
      });

      if (!res.ok) {
        const body = await res.text();
        console.error('[advisor] openai', res.status, body.slice(0, 500));
        /* מחזירים הודעה כללית ללקוח. גוף השגיאה של הספק עלול
           להכיל פרטי חשבון, והוא לא אמור להגיע לדפדפן. */
        throw new HttpsError('internal', 'מנוע היועצת לא זמין כרגע');
      }

      const json = await res.json();
      answer = json.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new HttpsError('internal', 'התקבלה תשובה ריקה');

      /* ספירת הטוקנים נלקחת ממה שהספק מדווח בפועל, לא מהערכה
         שלנו. הערכה מקומית סוטה בעשרות אחוזים בעברית ותהפוך
         את מסך העלויות למספר שנראה אמין ואינו. */
      if (json.usage) {
        usage = {
          prompt_tokens: json.usage.prompt_tokens || 0,
          completion_tokens: json.usage.completion_tokens || 0,
          total_tokens: json.usage.total_tokens || 0
        };
      }
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('[advisor] fetch', e);
      throw new HttpsError('internal', 'מנוע היועצת לא זמין כרגע');
    }

    /* ---- 6. שמירת השיחה ---- */
    if (!preview) {
      const col = db.collection('advisor_chats').doc(uid).collection('messages');
      const now = FieldValue.serverTimestamp();
      /* batch כדי ששאלה ותשובה ינחתו יחד. אחרת כשל בין השתיים
         משאיר בתיק שאלה בלי תשובה ונראה כאילו היועצת התעלמה. */
      const batch = db.batch();
      batch.set(col.doc(), { role: 'user', body: question, station_id: stationId, created_at: now });
      batch.set(col.doc(), {
        role: 'assistant', body: answer, station_id: stationId,
        sources: used, model: MODEL, created_at: now
      });
      await batch.commit();
    }

    /* ---- 7. רישום עלות ----
       נרשם גם על preview, כי מבחן של מנהלת עולה כסף בדיוק כמו
       שאלה של תלמידה. השדה preview מאפשר להפריד בדוח.
       הכתיבה לא חוסמת את התשובה: אם הרישום נכשל, עדיף שהמשתמשת
       תקבל את מה שכבר שילמנו עליו. */
    const cost = costOf(MODEL, pricing, usage.prompt_tokens, usage.completion_tokens);
    try {
      const batch2 = db.batch();
      batch2.set(db.collection('advisor_usage').doc(), {
        uid, email: prof.email || '', name: prof.full_name || '',
        station_id: stationId, model: MODEL, provider: 'openai',
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cost_usd: cost, preview,
        ym, day: dayIsrael(),
        created_at: FieldValue.serverTimestamp()
      });
      /* מונה מצטבר. increment אטומי, ולכן שתי שאלות במקביל לא
         דורסות זו את זו ולא מאבדות ספירה. */
      batch2.set(db.collection('advisor_usage_monthly').doc(ym), {
        ym,
        calls: FieldValue.increment(1),
        prompt_tokens: FieldValue.increment(usage.prompt_tokens),
        completion_tokens: FieldValue.increment(usage.completion_tokens),
        cost_usd: FieldValue.increment(cost),
        updated_at: FieldValue.serverTimestamp()
      }, { merge: true });
      await batch2.commit();
    } catch (e) {
      console.error('[advisor] usage log failed', e);
    }

    return {
      answer, sources: used, truncated, preview,
      usage: { ...usage, cost_usd: cost },
      budget: { spent_usd: spent + cost, limit_usd: budget.monthly_limit_usd }
    };
  }
);

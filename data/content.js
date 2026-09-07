/* =================================================================
   המסע ל-50K · מקור-האמת היחיד לתוכן הקורס
   -----------------------------------------------------------------
   כל המסכים (מפת המסע, התחנה, הדשבורד) קוראים מהקובץ הזה בלבד.
   כדי "להוסיף תוכן" — ממלאים כאן את השדות הריקים. זהו. הכל מתעדכן לבד.

   שדה ריק ('' או null) = ממתין לתוכן.
   ================================================================= */
window.COURSE = {

  /* ---------- מותג (נמדל מהאתר הרשמי) ---------- */
  brand: {
    productName: 'הדרך ל-50K',
    slogan: 'המחזור גדל והרווח עדיין לא זז',
    /* שם הלקוחה מוסתר עד אישור רשות (חוק ברזל) */
    ownerNamePublic: '',            // ← למלא רק אחרי אישור רשות
    ctaPrimary: 'התחל את המסע',
  },

  /* ---------- שאלון כניסה (מדידת תוצאות · נקודת ההתחלה) ---------- */
  intakeSurvey: [
    { id:'revenue_start', type:'range', q:'כמה אתה מכניס היום בחודש?',
      options:['עד 10,000₪','10-30 אלף','30-50 אלף','מעל 50 אלף'] },
    { id:'stage', type:'choice', q:'באיזה שלב העסק שלך?',
      options:['רעיון','בהתחלה','כבר יש לקוחות','מתרחב'] },
    { id:'field', type:'text', q:'באיזה תחום אתה עובד?' },
    { id:'stuck', type:'text', q:'מה הכי תקוע לך עכשיו?' },
  ],

  /* ---------- מבנה המסע · 11 פרקים ב-3 מדרגות ----------
     ⚠️ מקור-אמת: שלושת דפי כתב היד של אוריאן, 07.09.2026.
        סרוקים ב-content-source/syllabus-handwritten/ (page1-3.jpeg).
        המבנה הזה גובר על מה שנאמר בפגישה — החלטת הלל 07.09.
     המדרגות: 0→10K · 10→35K · 35→50K (החלטת הלל).
     שמות הפרקים ונושאי המשנה הועתקו מכתב היד שלה מילה במילה. */
  chapters: [
    { tier:'0 → 10K', title:'הבסיס', goal:10000, stations:[
      { id:1, name:'תודעה ומיינדסט (זהות)', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'מי אני · למה שיקנו ממני · תודעה של 0.1% · שחרור מחסומים · אחריות אישית ומשמעת עצמית' },
      { id:2, name:'קהל יעד ומסרים לפרסומים', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'מי הלקוח שלי · מה הבעיה שאני פותרת · מה הכאבים והחלומות · בניית 3 מסרים אישיים ו-3 מסרים עסקיים · מה הערך שלי' },
      /* ✅ וידאו אמיתי · צילום אולפן 05.09.2026 */
      { id:3, name:'משפך מוצרים', youtubeId:'c_wDb_K7buw', durationMin:15, workbookUrl:'',
        desc:'בניית מוצר חדירה · בניית מוצר ליבה להכנסה קבועה · בניית מוצר פרימיום · איך לא לפחד למכור את עצמך ביוקר' },
      { id:4, name:'פרסונל ברנד', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'נראות המותג · צבעים ופונטים · הסיפור האישי והמסע שעברתי' },
    ]},
    { tier:'10K → 35K', title:'מנוע השיווק', goal:35000, stations:[
      { id:5, name:'שיווק אורגני', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'רילסים · הוק · עריכה · CTA · סטורי · פוסט קרוסלה · משפך חשיפה ליצירת עוקבים ולידים' },
      /* ✅ מודול מלא · 6 שיעורים · צילום אולפן 05-06.09.2026 */
      { id:6, name:'משפך VSL', youtubeId:'5YTeDo6IUok', durationMin:52, workbookUrl:'',
        desc:'המנוע שמוכר מוצרי פרימיום של 30,000 ₪ ומעלה. מודעה, דף נחיתה, הדרכה מצולמת, השארת פרטים ו-CRM. שישה שיעורים שבונים את המשפך מהרעיון ועד הדף החי.',
        lessons:[
          { n:'1 · מה זה משפך VSL?',            youtubeId:'5YTeDo6IUok', min:10 },
          { n:'2 · למי משפך VSL מיועד?',        youtubeId:'SgrFv2Di9qg', min:3  },
          { n:'3 · הנחיות לבניית הקופי להדרכה', youtubeId:'IcDcmV_Jcbo', min:10 },
          { n:'4 · כתיבת קופי להדרכה',          youtubeId:'tQGbecqgxTU', min:6  },
          { n:'5 · קופי לדף הנחיתה הראשון',     youtubeId:'19v67MKOZRs', min:19 },
          { n:'6 · קופי לדף הנחיתה השני',       youtubeId:'PcSYe7k3Ito', min:3  },
        ] },
      { id:7, name:'מערכת CRM ואוטומציות', youtubeId:'', durationMin:0, workbookUrl:'', desc:'' },
      { id:8, name:'שיווק ממומן', youtubeId:'', durationMin:0, workbookUrl:'', desc:'' },
    ]},
    { tier:'35K → 50K', title:'סמכות וצמיחה', goal:50000, stations:[
      { id:9,  name:'פודקאסט · ערוץ שיווק מעולה', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'פודקאסט אורח · שם קאצ׳י · איך בונים · אולפן והגדרות בסיסיות' },
      { id:10, name:'קורס דיגיטלי', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'תוכן עניינים · תמחור · צילום · דף מכר · דף נחיתה' },
      { id:11, name:'עצמאי ממוקד', youtubeId:'', durationMin:0, workbookUrl:'',
        desc:'גיוס עובד ראשון · ניהול זמן · מטרות ויעדים · איך העסק ממשיך לעבוד בלעדיי' },
    ]},
  ],

  /* ---------- פופאפים חכמים (זמן-מוגבל / קהילה) ---------- */
  popups: {
    afterStation: { enabled:false, title:'כל הכבוד, סיימת תחנה!', body:'אתה צעד אחד קרוב יותר ל-50K. המשך לתחנה הבאה כל עוד המומנטום איתך.', ctaText:'לתחנה הבאה', ctaUrl:'', windowHours:24 },
    community:    { enabled:false, title:'הצטרף לקהילה', body:'יזמים שצועדים יחד מגיעים רחוק יותר. הצטרף לקהילה וקבל ליווי, השראה ותשובות לאורך כל הדרך.', ctaText:'אני רוצה להצטרף', ctaUrl:'' },
  },

  /* ---------- חיבורי מערכת (מפתחות ב-.secrets, לא כאן) ---------- */
  integrations: {
    pay:       { provider:'GROW', checkoutUrl:'' },   // סליקה → פתיחת גישה
    email:     { provider:'רב מסר' },                 // דיוור מייל/SMS
    crm:       { provider:'Firebase', projectId:'k-business-c1213' },
    marketing: { provider:'WordPress', site:'oranbiness' },
    videoHost: 'YouTube unlisted',
  },
};

/* עזרי גישה (כל המסכים משתמשים בהם) */
window.COURSE.allStations = window.COURSE.chapters.flatMap(c =>
  c.stations.map(s => ({ ...s, tier:c.tier, chapterTitle:c.title, goal:c.goal })));
window.COURSE.totalStations = window.COURSE.allStations.length; // 11

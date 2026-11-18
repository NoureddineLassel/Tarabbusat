/*
 * شبكات التقييم الملحقة بالقرار رقم 345 المؤرخ في 09 مارس 2026
 * الذي يحدد معايير الانتقاء للقبول في برنامج الحركية قصيرة المدى في الخارج (تحسين المستوى في الخارج)
 *
 * كل شبكة = قائمة معايير. أنواع المعايير:
 *  rank   : نقاط الرتبة (تؤخذ من رتبة المترشح) + علاوة اختيارية
 *  prev   : base - n  (n = عدد الاستفادات السابقة)
 *  prevN  : N - n مع اختيار N
 *  lines  : أسطر عددية (العدد × النقاط) مع حدود قصوى للعدد/النقاط لكل سطر وللمجموعة
 *  pubs   : قائمة منشورات، كل منشور بصنف وترتيب المترشح بين المؤلفين (100/90/80/70/50%)
 *  items  : قائمة أعمال، لكل عمل نوع + علاوات (الإنجليزية...)
 *  scale  : علامة تقديرية من 0 إلى حد أقصى
 *  check  : معيار نعم/لا
 */
(function (global) {
  'use strict';

  // نسب ترتيب المترشح بين المؤلفين
  const AUTHOR_WEIGHTS = [
    { v: 1, label: 'المؤلف الأول (100%)', w: 1.0 },
    { v: 2, label: 'المؤلف الثاني (90%)', w: 0.9 },
    { v: 3, label: 'المؤلف الثالث (80%)', w: 0.8 },
    { v: 4, label: 'المؤلف الرابع (70%)', w: 0.7 },
    { v: 5, label: 'الخامس فما فوق (50%)', w: 0.5 }
  ];

  // أصناف الحركية قصيرة المدى (المادة 12) ومدتها
  const PROGRAMS = {
    stage_special: { label: 'تربص تحسين المستوى في إطار البرنامج الخاص', min: 15, max: 30, art: 'المادة 12-1-1' },
    stage:         { label: 'تربص تحسين المستوى', min: 15, max: 30, art: 'المادة 12-1-2' },
    stage_long:    { label: 'تربص طويل (ماستر 2 تكوين مشترك / دكتوراه إشراف مشترك)', min: 1, max: 179, art: 'المادة 12-1-2 (لا تتعدى 5 أشهر و29 يوما)' },
    sejour:        { label: 'إقامة علمية قصيرة المدى ذات مستوى عالٍ', min: 7, max: 15, art: 'المادة 12-2' },
    conf:          { label: 'مشاركة في تظاهرة علمية دولية مصنفة ومفهرسة', min: 1, max: 7, art: 'المادة 12-3' }
  };

  // ملفات الترشح (المادة 14)
  const DOCS = {
    nationality: 'إثبات الجنسية الجزائرية',
    reg_regular: 'شهادة تسجيل منتظم في الدكتوراه (ابتداءً من التسجيل الثاني بالنسبة للطلبة غير الأجراء)',
    reg_proof: 'إثبات التسجيل في الدكتوراه (للأساتذة / الباحثين الذين يحضرون الدكتوراه)',
    workplan: 'مشروع عمل شامل ومفصل (الأهداف، المنهجية، النتائج المنتظرة) مصادق عليه من الهيئات العلمية',
    convention: 'نسخة من الاتفاقية المبرمة في إطار التعاون الدولي (تقدم من قبل المؤسسة الجامعية)',
    convention_cotutelle: 'نسخة من اتفاقية الإشراف المشترك ذي الطابع الدولي',
    convention_master: 'نسخة من الاتفاقية المحددة لعرض التكوين المشترك ذي الطابع الدولي',
    reg_master2: 'شهادة تسجيل منتظم في السنة الثانية ماستر',
    work_cert: 'شهادة عمل وقرار الترسيم',
    degree: 'إثبات الشهادة الجامعية',
    special_conditions: 'استيفاء الشروط المحددة من قبل الوصاية (البرنامج الخاص)',
    conf_request: 'طلب المشاركة مرفق برأي المشرف على الأطروحة وموافقة المجلس العلمي (للطلبة)',
    conf_invitation: 'دعوة قبول من منظمي التظاهرة (مع التقيد بتوصيات الوزارة بشأن البلدان المستقبلة)',
    conf_program: 'برنامج التظاهرة العلمية الدولية',
    conf_paper: 'نسخة من المداخلة تتضمن مؤسسة الانتساب أو مخبر البحث',
    host_countries: 'التقيد بتوصيات الوزارة الوصية في مجال البلدان المستقبلة'
  };

  // وثائق ما بعد العودة (المادة 16) + المادة 17 و18
  const RETURN_DOCS = {
    stage: ['report_host', 'passport', 'lecture', 'council_eval'],
    stage_special: ['special_docs', 'passport', 'lecture', 'council_eval'],
    stage_long: ['passport', 'council_eval'],
    sejour: ['report_self', 'passport', 'lecture', 'council_eval'],
    conf: ['attendance', 'passport', 'lecture', 'council_eval']
  };
  const RETURN_DOC_LABELS = {
    report_host: 'تقرير التربص مؤشر عليه من الهيئة المستقبلة (الأهداف، النتائج، المدة، المكان، الأشخاص المتعامل معهم)',
    report_self: 'تقرير الإقامة موقع من المستفيد (الأهداف، النتائج، المدة، المكان، الأشخاص المتعامل معهم)',
    special_docs: 'الوثائق المنصوص عليها في المذكرة التوضيحية للبرنامج الخاص',
    passport: 'نسخة من جواز السفر مع ختم الدخول والخروج من شرطة الحدود (PAF)',
    attendance: 'شهادة المشاركة في التظاهرة العلمية الدولية',
    lecture: 'تقديم عرض أو محاضرة حول النتائج المحققة (المادة 18)',
    council_eval: 'تقييم التقرير من طرف الهيئة العلمية (المادة 17)'
  };

  /* ------------------------------------------------------------------ */
  /* معايير مشتركة بين شبكات الأساتذة (الجامعة)                          */
  /* ------------------------------------------------------------------ */
  const AFTER = ' (بعد الاستفادة السابقة)';

  const U_PUBS = {
    id: 'pubs', type: 'pubs', section: 'الإنتاج العلمي',
    label: 'نشر مقال بعد الاستفادة السابقة (يخضع لنفس شروط مناقشة الدكتوراه)',
    note: 'يجب تسمية المؤسسة في المقال المنشور. تحسب النقاط حسب مركز المترشح بين المؤلفين.',
    requireAff: true,
    cats: [
      { id: 'Ap', label: 'دولي — صنف A+', pts: 20 },
      { id: 'A', label: 'دولي — صنف A', pts: 15 },
      { id: 'B', label: 'دولي — صنف B', pts: 10 },
      { id: 'C', label: 'وطني — صنف C', pts: 5, maxCount: 2 }
    ]
  };

  const U_COMMS = {
    id: 'comms', type: 'lines', section: 'الإنتاج العلمي',
    label: 'المداخلات بعد الاستفادة السابقة',
    note: 'يجب تسمية المؤسسة في المداخلة.',
    lines: [
      { id: 'int_cls', label: 'مداخلة دولية مصنفة (SCOPUS, WOS)', pts: 6 },
      { id: 'int_idx', label: 'مداخلة دولية مفهرسة', pts: 4, maxCount: 4 },
      { id: 'int_non', label: 'مداخلة دولية غير مصنفة', pts: 2, maxCount: 4 },
      { id: 'nat', label: 'مداخلة وطنية', pts: 1, maxCount: 4 }
    ]
  };

  const U_PROJECTS = {
    id: 'projects', type: 'lines', section: 'المشاريع',
    label: 'المشاريع',
    lines: [
      { id: 'intl', label: 'مشروع دولي (PRIMA, Erasmus+ ...)', pts: 10 },
      { id: 'nat', label: 'مشروع وطني: تطوير تكنولوجي مع شريك اجتماعي-اقتصادي / PNR / PRFU ...', pts: 5 }
    ]
  };

  const U_SUPERVISION = [
    {
      id: 'phd', type: 'lines', section: 'التأطير والإشراف', label: 'الإشراف على أطروحات الدكتوراه' + AFTER,
      lines: [
        { id: 'sup', label: 'مشرف على أطروحة دكتوراه نوقشت', pts: 5 },
        { id: 'cosup', label: 'مساعد المشرف على أطروحة دكتوراه نوقشت', pts: 3 },
        { id: 'jury', label: 'مشاركة في لجان مناقشة الدكتوراه', pts: 1, maxCount: 2 }
      ]
    },
    {
      id: 'q1275', type: 'lines', section: 'التأطير والإشراف',
      label: 'الإشراف على طالب في إطار القرار 1275 (مؤسسة ناشئة، مؤسسة مصغرة، مؤسسة فرعية / براءة اختراع)',
      lines: [{ id: 'p', label: 'مشروع', pts: 2, maxCount: 2 }]
    },
    {
      id: 'label', type: 'lines', section: 'التأطير والإشراف',
      label: 'الإشراف على مشروع حصل على وسم لابل، مشروع مبتكر، مشروع مؤسسة ناشئة',
      lines: [{ id: 'p', label: 'مشروع', pts: 5 }]
    },
    {
      id: 'students', type: 'lines', section: 'التأطير والإشراف', label: 'تأطير الطلبة' + AFTER,
      lines: [
        { id: 'master', label: 'مذكرة تخرج ماستر', pts: 1, maxPts: 3 },
        { id: 'lic', label: 'موضوع ليسانس', pts: 0.5, maxPts: 3 }
      ]
    }
  ];

  const U_PEDA = [
    {
      id: 'tronc', type: 'lines', section: 'النشاط البيداغوجي', label: 'تدريس محاضرة في جذع مشترك',
      note: 'تحتسب محاضرتان على الأكثر.',
      lines: [{ id: 'c', label: 'محاضرة', pts: 4, maxCount: 2 }]
    },
    {
      id: 'polycop', type: 'items', section: 'النشاط البيداغوجي',
      label: 'مطبوعة بيداغوجية فردية مصادق عليها من الهيئة العلمية (مستخرج محضر أو إشهاد)',
      note: 'هذا البند غير مسقف.',
      opts: [{ id: 'p', label: 'مطبوعة', pts: 3 }],
      flags: [
        { id: 'en', label: 'باللغة الإنجليزية', pts: 2 },
        { id: 'taught', label: 'يدرّس بها بالإنجليزية (باستثناء مقياس اللغة الإنجليزية)', pts: 2 }
      ]
    },
    {
      id: 'elearn', type: 'items', section: 'النشاط البيداغوجي',
      label: 'دروس بيداغوجية متوفرة على الخط (e-Learning)',
      note: 'يجب وضع المستند على منصة التعليم الإلكتروني في وضع الوصول المفتوح بصفة نهائية، وأن يغطي المادة بالكامل، وأن يتوافق مع دفتر الشروط، ومن إنشاء الأستاذ فعليا. لا تحتسب الوثائق المستعملة في ملف التأهيل. البند غير مسقف.',
      opts: [
        { id: 'cours', label: 'دروس', pts: 2 },
        { id: 'td', label: 'أعمال موجهة', pts: 1 },
        { id: 'tp', label: 'أعمال تطبيقية', pts: 1 }
      ],
      flags: [{ id: 'en', label: 'بالإنجليزية (باستثناء مقياس اللغة الإنجليزية)', pts: 2 }]
    }
  ];

  const U_REVIEW = {
    id: 'review', type: 'lines', section: 'الخبرة والهيئات',
    label: 'الخبرة التحكيمية الفعلية في المجلات العلمية المصنفة',
    note: 'تثبت بشهادة تفيد التحكيم الفعلي.',
    lines: [
      { id: 'Ap', label: 'مجلة صنف A+', pts: 5 },
      { id: 'A', label: 'مجلة صنف A', pts: 4, maxPts: 16 },
      { id: 'B', label: 'مجلة صنف B', pts: 2, maxPts: 8 },
      { id: 'C', label: 'مجلة صنف C', pts: 1, maxPts: 4 }
    ]
  };

  const U_SUPPORT = {
    id: 'support', type: 'lines', section: 'الخبرة والهيئات',
    label: 'شهادة تثبت عمل داخل هيئات المرافقة (CDC، دار المقاولاتية، نادي البحث عن الشغل، حاضنة أعمال، CATI، دار الذكاء الاصطناعي، مركز الربط بين المؤسسة والجامعة...)',
    lines: [{ id: 'c', label: 'شهادة من هيئة مختلفة', pts: 1, maxPts: 2 }]
  };

  const U_CITATIONS = {
    id: 'citations', type: 'lines', section: 'الإنتاج العلمي',
    label: 'اقتباسات Scopus للمؤسسة الجامعية والبحثية في المقال',
    note: 'https://www.scopus.com/freelookup/form/author.uri',
    lines: [{ id: 'c', label: 'اقتباس بعد الاستفادة السابقة', pts: 0.1 }]
  };

  const U_BOOKS = [
    {
      id: 'chapter', type: 'lines', section: 'الإنتاج العلمي', label: 'Chapterbook محكم في قاعدة بيانات دولية',
      lines: [{ id: 'c', label: 'فصل', pts: 5 }]
    },
    {
      id: 'book', type: 'items', section: 'الإنتاج العلمي',
      label: 'كتاب محكم بيداغوجي/علمي في التخصص برقم تسلسلي ISBN مصادق عليه من الهيئات العلمية',
      opts: [{ id: 'b', label: 'كتاب', pts: 5 }],
      flags: [{ id: 'en', label: 'باللغة الإنجليزية', pts: 2 }]
    }
  ];

  const U_COUNCILS = {
    id: 'councils', type: 'lines', section: 'الخبرة والهيئات', label: 'عضوية اللجان والمجالس العلمية',
    lines: [
      { id: 'member', label: 'عضوية مختلفة الطبيعة: المجلس العلمي، اللجنة العلمية، المجلس التأديبي، مجلس الإدارة، خلية الجودة (دون حساب العضوية بحكم الصفة)', pts: 1, maxPts: 3 },
      { id: 'head', label: 'رئيس هيئة علمية (دون حساب العضوية بحكم الصفة)', pts: 2, maxPts: 2 },
      { id: 'other', label: 'مدير النشر الجامعي، رئيس التحرير في مجلة مصنفة، عضو في المخبر', pts: 1, maxPts: 1 }
    ]
  };

  const SENIOR_POST = { id: 'senior', type: 'check', section: 'الخبرة والهيئات', label: 'المنصب العالي (هيكلي/وظيفي)', pts: 2 };

  const U_TEACHER_COMMON = [
    { id: 'prizes', type: 'lines', section: 'الإنتاج العلمي', label: 'جوائز دولية و/أو وطنية مرتبطة بإنجازات علمية، براءة اختراع' + AFTER,
      lines: [{ id: 'p', label: 'جائزة / براءة', pts: 10 }] },
    U_PUBS, U_COMMS, U_PROJECTS
  ].concat(U_SUPERVISION, U_PEDA, [U_REVIEW, U_SUPPORT, U_CITATIONS], U_BOOKS, [U_COUNCILS, SENIOR_POST]);

  /* ------------------------------------------------------------------ */
  /* معايير مشتركة بين شبكات الباحثين الدائمين (مراكز البحث)            */
  /* ------------------------------------------------------------------ */
  const R_PUBS_INTL = {
    id: 'pubs_intl', type: 'pubs', section: 'الإنتاج العلمي',
    label: 'المنشورات الدولية في مجلة مصنفة (Scopus أو Web of Science) بعد آخر استفادة',
    note: 'المنشور الذي يظهر في Scopus وWeb of Science معا يحسب مرة واحدة بالعلامة القصوى. 70 نقطة كحد أقصى.',
    maxPts: 70,
    cats: [
      { id: 'wos', label: 'Web of Science (IF)', pts: 12 },
      { id: 'scopus', label: 'Scopus', pts: 8 }
    ]
  };
  const R_CONF_PAPERS = {
    id: 'conf_papers', type: 'pubs', section: 'الإنتاج العلمي',
    label: 'Scopus (Conference paper) بعد آخر استفادة', maxPts: 12,
    cats: [{ id: 'cp', label: 'Conference paper', pts: 4 }]
  };
  const R_PUBS_NAT = {
    id: 'pubs_nat', type: 'pubs', section: 'الإنتاج العلمي',
    label: 'المنشورات الوطنية في مجلة صنف C بعد آخر استفادة', maxPts: 9,
    cats: [{ id: 'C', label: 'مجلة صنف C', pts: 3 }]
  };
  const R_COMMS_INTL = {
    id: 'comms_intl', type: 'lines', section: 'المداخلات', label: 'المداخلات الدولية بعد آخر استفادة',
    maxCount: 4, note: '4 مداخلات كحد أقصى.',
    lines: [{ id: 'oral', label: 'شفهي', pts: 4 }, { id: 'poster', label: 'ملصق', pts: 2 }]
  };
  const R_COMMS_NAT = {
    id: 'comms_nat', type: 'lines', section: 'المداخلات', label: 'المداخلات الوطنية بعد آخر استفادة',
    maxCount: 4, note: '4 مداخلات كحد أقصى.',
    lines: [{ id: 'oral', label: 'شفهي', pts: 2 }, { id: 'poster', label: 'ملصق', pts: 1 }]
  };
  const R_BOOKS = {
    id: 'books', type: 'lines', section: 'الإنتاج العلمي',
    label: 'نشر عمل علمي مطبوع في الجزائر أو غيرها في دار نشر مصنفة بعد آخر استفادة',
    lines: [
      { id: 'book', label: 'منشور علمي مطبوع في دار نشر مصنفة N°ISSN/N°ISBN', pts: 10, maxPts: 30 },
      { id: 'chapter', label: 'Chapterbook محكم في قاعدة بيانات دولية', pts: 4, maxPts: 12 }
    ]
  };
  const R_PROJECTS = {
    id: 'projects', type: 'lines', section: 'المشاريع',
    label: 'المشاركة في نشاطات التطوير التكنولوجي والمشاريع الدولية/النشاطات العلمية بعد آخر استفادة',
    lines: [
      { id: 'nat', label: 'مشاريع وطنية (PNR, PRFU ...)', pts: 2, maxPts: 6 },
      { id: 'holder', label: 'علاوة حامل المشروع الوطني (+1)', pts: 1 },
      { id: 'intl', label: 'مشروع دولي (Erasmus, PRIMA, Horizon Europe ...)', pts: 2, maxPts: 6 },
      { id: 'tech', label: 'مشروع تطوير تكنولوجي مع شريك اجتماعي-اقتصادي', pts: 2, maxPts: 6 },
      { id: 'startup', label: 'مشروع مؤسسة مصادق عليه من قبل المجلس العلمي للمركز', pts: 1, maxPts: 3 }
    ]
  };
  const R_SCI_ACT = {
    id: 'sci_act', type: 'lines', section: 'الأنشطة العلمية والإدارية',
    label: 'المساهمة في الأنشطة العلمية بعد آخر استفادة',
    lines: [
      { id: 'member', label: 'عضو في اللجنة العلمية أو التنظيمية لتظاهرة علمية دولية أو وطنية', pts: 1, maxCount: 6 },
      { id: 'chair', label: 'رئيس لجنة علمية أو تنظيمية لتظاهرة علمية دولية أو وطنية', pts: 2, maxCount: 4 },
      { id: 'reading', label: 'عضو لجنة قراءة في مجلة وطنية أو دولية', pts: 1, maxPts: 3 },
      { id: 'editor', label: 'رئيس مجلة علمية', pts: 2, maxPts: 4 }
    ]
  };
  const R_1275 = {
    id: 'q1275', type: 'lines', section: 'التأطير والإشراف',
    label: 'الإشراف على طالب في إطار القرار 1275 (مذكرة بكالوريا+5 سنوات و/أو ماستر) بعد آخر استفادة',
    lines: [{ id: 'p', label: 'مشروع', pts: 5, maxCount: 3 }]
  };
  const R_LABEL = {
    id: 'label', type: 'lines', section: 'التأطير والإشراف',
    label: 'تأطير مشروع حصل على وسم لابل، مشروع مبتكر، مشروع مؤسسة ناشئة بعد آخر استفادة',
    lines: [{ id: 'p', label: 'مشروع', pts: 10, maxCount: 3 }]
  };
  const R_STUDIES = {
    id: 'studies', type: 'lines', section: 'الدراسات والخبرة',
    label: 'الدراسات والخبرة خلال الثلاث سنوات الأخيرة',
    lines: [
      { id: 'nat', label: 'دراسة وخبرة ذات بعد وطني', pts: 2, maxPts: 6 },
      { id: 'intl', label: 'دراسة وخبرة ذات بعد دولي', pts: 3, maxPts: 9 },
      { id: 'report', label: 'تحرير تقرير ذو بعد وطني (لكل مشروع)', pts: 3, maxPts: 6 }
    ]
  };
  const R_PATENTS_FULL = {
    id: 'patents', type: 'lines', section: 'الأنشطة التكنولوجية',
    label: 'براءات الاختراع والمنتجات التكنولوجية المتحصل عليها بعد آخر استفادة',
    lines: [
      { id: 'patent', label: 'براءة اختراع (شهادة براءة اختراع / إشهاد بقبول براءة اختراع)', pts: 15, maxPts: 45 },
      { id: 'filing', label: 'إيداع للحصول على براءة اختراع', pts: 4, maxPts: 8 },
      { id: 'onda', label: 'شهادة (ONDA) لكل برنامج', pts: 10, maxPts: 20 },
      { id: 'tool', label: 'تطوير بطاقية (أداة مساعدة في اتخاذ القرار/قاعدة بيانات)', pts: 10, maxPts: 20 },
      { id: 'proto', label: 'نموذج أولي عملي', pts: 10, maxPts: 20 },
      { id: 'startup', label: 'مشروع مبتكر / مشروع مؤسسة ناشئة', pts: 10, maxPts: 20 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* معايير مشتركة بين شبكات المستخدمين بمراكز البحث                     */
  /* ------------------------------------------------------------------ */
  const RS_SENIORITY = { id: 'seniority', type: 'lines', section: 'نشاطات المترشح', label: 'الأقدمية في القطاع',
    lines: [{ id: 'y', label: 'عدد السنوات', pts: 1, maxPts: 8 }] };
  const RS_PREV = { id: 'prev', type: 'prev', section: 'نشاطات المترشح', base: 5,
    label: 'عدد التربصات المستفاد منها خلال 05 سنوات الأخيرة (5 - n)' };
  const RS_COMMITTEES = { id: 'committees', type: 'lines', section: 'نشاطات المترشح', label: 'عضوية اللجان الدائمة في المركز أو المؤسسة',
    lines: [{ id: 'c', label: 'لجنة', pts: 2, maxPts: 4 }] };
  const RS_TECH_PATENTS = {
    id: 'patents', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
    label: 'براءات الاختراع المتحصل عليها بعد الاستفادة من آخر تربص',
    lines: [
      { id: 'patent', label: 'براءة اختراع (شهادة INAPI أو إشهاد بقبول براءة اختراع)', pts: 10 },
      { id: 'onda', label: 'شهادة (ONDA)', pts: 10, maxPts: 30 },
      { id: 'tool', label: 'تطوير بطاقية رقمية (أداة مساعدة في اتخاذ القرار/قاعدة بيانات)', pts: 10, maxPts: 30 }
    ]
  };
  const RS_TECH_PROJECTS = {
    id: 'projects', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
    label: 'المشاركة في المشاريع الدولية ومشاريع التطوير التكنولوجي بعد آخر استفادة',
    lines: [
      { id: 'pnr', label: 'PNR', pts: 7 },
      { id: 'intl', label: 'مشروع دولي (Erasmus, Prima, Horizon Europe ...)', pts: 7 },
      { id: 'tech_p', label: 'مشروع تطوير تكنولوجي مع شريك سوسيو-اقتصادي/موضوعاتي معتمد من طرف المجلس العلمي', pts: 5 },
      { id: 'tech_np', label: 'مشروع تطوير تكنولوجي بدون شريك مصادق عليه من قبل الإدارة', pts: 3 },
      { id: 'startup', label: 'مشروع مؤسسة مصادق عليه من قبل المجلس العلمي للمركز', pts: 1 }
    ]
  };
  const RS_TECH_HEAD = { id: 'head', type: 'check', section: 'نشاطات المترشح',
    label: 'رئيس قسم تقني، رئيس مصلحة مشتركة، رئيس مصلحة تقنية، رئيس ورشة، مسؤول فرقة', pts: 3 };

  /* ------------------------------------------------------------------ */
  /* الشبكات                                                            */
  /* ------------------------------------------------------------------ */
  const GRIDS = [
    {
      id: 'U_CONF', code: 'ج-1', scope: 'university',
      title: 'المشاركة في التظاهرات العلمية الدولية',
      population: 'الأساتذة والأساتذة الاستشفائيون الجامعيون وطلبة الدكتوراه غير الأجراء',
      subtitle: 'خاص بالمؤسسات الجامعية والمدارس',
      programs: ['conf'],
      signer: 'رئيس المجلس العلمي',
      ranks: [
        { id: 'pe', label: 'أستاذ مميز / أستاذ استشفائي جامعي مميز', pts: 9 },
        { id: 'pr', label: 'أستاذ / أستاذ استشفائي جامعي', pts: 7 },
        { id: 'mca', label: 'أستاذ محاضر قسم "أ"', pts: 5 },
        { id: 'mcb', label: 'أستاذ محاضر قسم "ب"', pts: 3 },
        { id: 'maa', label: 'أستاذ مساعد (يحضر الدكتوراه)', pts: 2 },
        { id: 'phd', label: 'طالب دكتوراه غير أجير', pts: 1, student: true }
      ],
      criteria: [
        { id: 'rank', type: 'rank', section: 'الرتبة العلمية', label: 'الرتبة العلمية' },
        { id: 'prev', type: 'prev', section: 'الرتبة العلمية', base: 3, label: 'الاستفادات السابقة للثلاث سنوات (3 - n)' }
      ].concat(U_TEACHER_COMMON),
      notes: [
        'تؤخذ بعين الاعتبار جميع الأعمال المذكورة في الشبكة بعد الاستفادة السابقة حتى في حالة تحويل المؤسسة الجامعية أو البحثية.',
        'احتساب الأعمال يكون ابتداءً من تاريخ غلق منصة إيداع الملفات لآخر استفادة.',
        'يشترط للطلبة والأساتذة الذين يحضرون الدكتوراه تسجيل منتظم ابتداءً من التسجيل الثاني.',
        'تعطى الأولوية لطلبة الدكتوراه الحائزين على نجوم.'
      ]
    },
    {
      id: 'U_SEJ', code: 'ج-2', scope: 'university',
      title: 'الإقامة العلمية قصيرة المدى ذات مستوى العالي',
      population: 'الأساتذة المميزون، الأساتذة، الأساتذة المحاضرون "أ" و"ب" (والاستشفائيون الجامعيون)',
      subtitle: 'خاص بالمؤسسات الجامعية والمدارس',
      programs: ['sejour'],
      signer: 'رئيس المجلس العلمي',
      ranks: [
        { id: 'pe', label: 'أستاذ مميز / أستاذ استشفائي جامعي مميز', pts: 9 },
        { id: 'pr', label: 'أستاذ / أستاذ استشفائي جامعي', pts: 7 },
        { id: 'mca', label: 'أستاذ محاضر قسم "أ"', pts: 5 },
        { id: 'mcb', label: 'أستاذ محاضر قسم "ب"', pts: 3, habBonus: true }
      ],
      criteria: [
        { id: 'rank', type: 'rank', section: 'الرتبة العلمية', label: 'الرتبة العلمية',
          bonus: { label: 'إضافة 04 نقاط مرة واحدة لتحضير التأهيل الجامعي بطلب من المعني قبل إيداع ملف التأهيل (تقديم تعهد) — للأستاذ المحاضر "ب"', pts: 4, onlyRanks: ['mcb'] } },
        { id: 'prev', type: 'prev', section: 'الرتبة العلمية', base: 3, label: 'الاستفادات السابقة للثلاث سنوات (3 - n)' }
      ].concat(U_TEACHER_COMMON),
      notes: [
        'تؤخذ بعين الاعتبار جميع الأعمال المذكورة في الشبكة بعد الاستفادة السابقة حتى في حالة تحويل المؤسسة الجامعية أو البحثية.',
        'احتساب الأعمال يكون ابتداءً من تاريخ غلق منصة إيداع الملفات لآخر استفادة.',
        'مدة الإقامة من 7 إلى 15 يوما.'
      ]
    },
    {
      id: 'U_STAGE', code: 'ج-3', scope: 'university',
      title: 'تربص تحسين المستوى بالخارج',
      population: 'طلبة الدكتوراه والأساتذة المساعدون الذين يحضرون الدكتوراه',
      subtitle: 'خاص بالمؤسسات الجامعية والمدارس',
      programs: ['stage', 'stage_long'],
      signer: 'رئيس المجلس العلمي',
      ranks: [
        { id: 'maa', label: 'أستاذ مساعد / أستاذ باحث يحضر الدكتوراه', pts: 0 },
        { id: 'phd', label: 'طالب دكتوراه غير أجير', pts: 0, student: true },
        { id: 'cotutelle', label: 'طالب دكتوراه في إطار الإشراف المشترك (Co-tutelle)', pts: 0, student: true }
      ],
      criteria: [
        { id: 'reg', type: 'lines', section: 'التسجيل', label: 'التسجيل المنتظم في الدكتوراه',
          lines: [{ id: 'y', label: 'عدد التسجيلات المنتظمة', pts: 2 }] },
        { id: 'prev', type: 'prev', section: 'التسجيل', base: 3, label: 'الاستفادات السابقة للثلاث سنوات (3 - n)' },
        { id: 'incub', type: 'check', section: 'المرافقة', label: 'مشروع مؤسسة ناشئة في الحاضنة الجامعية (شهادة تسجيل المشروع)', pts: 1 },
        U_SUPPORT,
        { id: 'prizes', type: 'lines', section: 'الإنتاج العلمي', label: 'جوائز وطنية ودولية مرتبطة بإنجازات علمية',
          lines: [{ id: 'p', label: 'جائزة', pts: 5 }] },
        U_PUBS,
        { id: 'comms_intl', type: 'lines', section: 'الإنتاج العلمي', label: 'مداخلات دولية بعد الاستفادة السابقة',
          note: 'يجب تسمية المؤسسة في المداخلة. 04 مداخلات دولية كحد أقصى.', maxCount: 4,
          lines: [
            { id: 'cls', label: 'مصنفة (SCOPUS, WOS)', pts: 6 },
            { id: 'idx', label: 'مفهرسة', pts: 4, maxCount: 4 },
            { id: 'non', label: 'غير مصنفة', pts: 2, maxCount: 4 }
          ] },
        { id: 'comms_nat', type: 'lines', section: 'الإنتاج العلمي', label: 'مداخلات وطنية بعد الاستفادة السابقة',
          lines: [{ id: 'nat', label: 'مداخلة وطنية', pts: 1, maxCount: 4 }] },
        U_BOOKS[1],
        U_PEDA[1],
        Object.assign({}, U_PEDA[2], { label: 'دروس بيداغوجية متوفرة على الخط (e-Learning) — بالنسبة إلى الأستاذ المساعد' }),
        U_SUPERVISION[3],
        U_SUPERVISION[1],
        SENIOR_POST
      ],
      notes: [
        'طلبة الدكتوراه غير الأجراء يرتبون بالنسبة لزملائهم على مستوى كلياتهم/أقسامهم في حدود الإمكانيات المالية المتوفرة.',
        'طلبة الدكتوراه المسجلون في إطار الإشراف المشترك (Co-tutelle) يرتبون بالنسبة لزملائهم على مستوى كلياتهم/أقسامهم.',
        'طالبو التربصات الذين تخلوا عن تسجيل سابق في طور الدكتوراه واستفادوا من تسجيل جديد ليست لهم الأولوية.',
        'تعطى الأولوية للطلبة الحائزين على نجوم.',
        'تؤخذ بعين الاعتبار جميع الأعمال بعد الاستفادة السابقة، واحتسابها يكون ابتداءً من تاريخ غلق منصة إيداع الملفات لآخر استفادة.'
      ]
    },
    {
      id: 'U_ATS', code: 'ج-4', scope: 'university',
      title: 'تربص تحسين المستوى — مخصص لفئة الموظفين الإداريين والتقنيين',
      population: 'المستخدمون الإداريون والتقنيون (المرسمون والحائزون على شهادة جامعية)',
      subtitle: 'خاص بالمؤسسات الجامعية والمدارس',
      programs: ['stage', 'stage_special'],
      signer: 'لجنة الانتقاء للهيئة التابعة للمؤسسة الجامعية',
      ranks: [
        { id: 'c18', label: 'الصنف أعلى من 17', pts: 12 },
        { id: 'c17', label: 'الصنف 17', pts: 11.5 },
        { id: 'c16', label: 'الصنف 16', pts: 11 },
        { id: 'c15', label: 'الصنف 15', pts: 10.5 },
        { id: 'c14', label: 'الصنف 14', pts: 10 },
        { id: 'c13', label: 'الصنف 13', pts: 9.5 },
        { id: 'c12', label: 'الصنف 12', pts: 9 },
        { id: 'c11', label: 'الصنف 11', pts: 8.5 },
        { id: 'c10', label: 'الصنف 10', pts: 8 }
      ],
      criteria: [
        { id: 'rank', type: 'rank', section: 'الرتبة', label: 'الرتبة (الصنف)' },
        { id: 'seniority', type: 'lines', section: 'الرتبة', label: 'الأقدمية في القطاع',
          lines: [{ id: 'y', label: 'عدد السنوات', pts: 0.5, maxPts: 10 }] },
        { id: 'lang', type: 'lines', section: 'التحكم في اللغات', label: 'التحكم في اللغات',
          lines: [
            { id: 'dest', label: 'التحكم في لغة التكوين حسب الوجهة', pts: 1, maxCount: 1 },
            { id: 'en', label: 'التسجيل في المركز المكثف للغات في اللغة الإنجليزية (مع ضرورة رفع المستوى خلال السنوات المقبلة)', pts: 2, maxCount: 1 }
          ] },
        { id: 'eval_att', type: 'scale', section: 'تقييم المسؤول المباشر', label: 'الحضور', max: 3, step: 0.5 },
        { id: 'eval_comp', type: 'scale', section: 'تقييم المسؤول المباشر', label: 'الكفاءة في العمل', max: 3, step: 0.5 },
        { id: 'eval_init', type: 'scale', section: 'تقييم المسؤول المباشر', label: 'المبادرة', max: 3, step: 0.5 },
        { id: 'eval_avail', type: 'scale', section: 'تقييم المسؤول المباشر', label: 'التفرغ', max: 3, step: 0.5 },
        { id: 'q1275', type: 'check', section: 'المساهمات', label: 'المساهمة في تجسيد آليات القرار الوزاري رقم 1275', pts: 1 },
        { id: 'support', type: 'lines', section: 'المساهمات',
          label: 'شهادة تثبت عمل داخل هيئات المرافقة (CDC، دار المقاولاتية، حاضنة أعمال، CATI...)، المشاركة في الحياة الجامعية، عضوية في اللجان الدائمة',
          lines: [{ id: 'c', label: 'شهادة / عضوية', pts: 1, maxPts: 2 }] },
        { id: 'intl_proj', type: 'scale', section: 'المساهمات', label: 'المشاركة في المشاريع الدولية (شهادة المشاركة)', max: 2, step: 1 },
        { id: 'senior', type: 'check', section: 'المساهمات', label: 'المنصب العالي (هيكلي/وظيفي)', pts: 2 },
        { id: 'prev_stays', type: 'lines', section: 'الاستفادات السابقة',
          label: 'عدد الاستفادات من التربصات المنجزة بالخارج خلال الست سنوات الماضية',
          lines: [{ id: 'n', label: 'تربص (ناقص 05 نقاط لكل تربص)', pts: -5 }] }
      ],
      notes: [
        'لا يمكن أن يكون عضو لجنة الانتقاء يحمل صفة المترشح برسم سنة الانتقاء.',
        'يتم تنفيذ التربص قصير المدى في الخارج حصرا في إطار الاتفاقيات الدولية المبرمة.',
        'يجب أن يكون الرفض مبررا.',
        'تنشأ لجان الانتقاء بمقرر من مدير المؤسسة وتتكون من ممثلين عن الإدارة وممثلين عن المستخدمين بالتساوي (المادة 15).'
      ]
    },
    {
      id: 'R_CONF_SEJ', code: 'م-1', scope: 'research',
      title: 'التظاهرة العلمية، الإقامة العلمية قصيرة المدى ذات مستوى العالي',
      population: 'الباحثون الدائمون (مدير بحث مميز، مدير بحث، أستاذ بحث "أ" و"ب")',
      subtitle: 'خاصة بالباحثين الدائمين',
      programs: ['conf', 'sejour'],
      signer: 'رئيس المجلس العلمي',
      ranks: [
        { id: 'dre', label: 'مدير بحث مميز', pts: 9 },
        { id: 'dr', label: 'مدير بحث', pts: 7 },
        { id: 'mra', label: 'أستاذ بحث "أ"', pts: 5 },
        { id: 'mrb', label: 'أستاذ بحث "ب"', pts: 3 }
      ],
      criteria: [
        { id: 'rank', type: 'rank', section: 'الرتبة العلمية', label: 'الرتبة العلمية',
          bonus: { label: 'إضافة 04 نقاط مرة واحدة لتحضير التأهيل الجامعي بطلب من المعني قبل إيداع ملف التأهيل — أستاذ بحث "ب"', pts: 4, onlyRanks: ['mrb'] } },
        { id: 'prev', type: 'prev', section: 'الرتبة العلمية', base: 4, label: 'عدد الاستفادات خلال الأربع (04) سنوات الأخيرة (4 - n)' },
        R_PUBS_INTL, R_CONF_PAPERS, R_PUBS_NAT, R_COMMS_INTL, R_COMMS_NAT,
        { id: 'proceeding', type: 'lines', section: 'المداخلات', label: 'Proceeding',
          lines: [{ id: 'p', label: 'نشاط', pts: 3, maxCount: 3 }] },
        R_PATENTS_FULL, R_BOOKS, R_PROJECTS,
        { id: 'admin', type: 'lines', section: 'الأنشطة العلمية والإدارية', label: 'المساهمة في الأنشطة الإدارية بعد آخر استفادة',
          lines: [
            { id: 'head', label: 'مدير وحدة بحث، مدير مساعد، مدير قسم، مسؤول فرقة بحث، رئيس مصلحة تقنية، رئيس مجلس علمي، مسؤول حاضنة...', pts: 2, maxPts: 2 },
            { id: 'lab', label: 'مسؤول مخبر/ورشة', pts: 1, maxPts: 1 },
            { id: 'council', label: 'عضو في المجلس العلمي أو في مجلس الإدارة', pts: 1, maxPts: 1 },
            { id: 'incub', label: 'عضوية في اللجنة العلمية للحاضنة', pts: 1, maxPts: 4 }
          ] },
        R_SCI_ACT,
        { id: 'supervision', type: 'lines', section: 'التأطير والإشراف',
          label: 'الإشراف أو الإشراف المشترك على مذكرات (بكالوريا+05 سنوات و/أو ماستر) وأطروحات الدكتوراه بعد آخر استفادة',
          note: 'يجب أن تكون مواضيع الأطروحات المعالجة جزءا من مهام واختصاص مركز البحث.',
          lines: [
            { id: 'memo', label: 'مذكرة تمت مناقشتها', pts: 2, maxPts: 6 },
            { id: 'phd_def', label: 'أطروحة دكتوراه تمت مناقشتها', pts: 10, maxPts: 30 },
            { id: 'phd_cur', label: 'أطروحة دكتوراه قيد الإنجاز', pts: 8, maxPts: 24 }
          ] },
        R_1275, R_LABEL, R_STUDIES
      ],
      notes: [
        'المنشور العلمي الذي يظهر في نفس الوقت في Scopus وWeb of Science يحسب مرة واحدة بالعلامة القصوى.',
        'تؤخذ بعين الاعتبار جميع الأعمال المذكورة في الشبكة بعد الاستفادة السابقة حتى في حالة تحويل المؤسسة الجامعية أو البحثية.',
        'احتساب الأعمال يكون ابتداءً من تاريخ غلق منصة إيداع الملفات لآخر استفادة.'
      ]
    },
    {
      id: 'R_STAGE', code: 'م-2', scope: 'research',
      title: 'التربصات قصيرة المدى',
      population: 'الباحثون الدائمون الذين يحضرون أطروحة الدكتوراه',
      subtitle: 'خاصة بالباحثين الدائمين',
      programs: ['stage'],
      signer: 'رئيس المجلس العلمي',
      ranks: [{ id: 'rp', label: 'باحث دائم يحضر الدكتوراه', pts: 0 }],
      criteria: [
        { id: 'reg', type: 'lines', section: 'معايير التقييم', label: 'التسجيل بانتظام في الدكتوراه حسب التنظيم المعمول به',
          lines: [{ id: 'y', label: 'سنة تسجيل', pts: 2 }] },
        { id: 'prev', type: 'prevN', section: 'معايير التقييم', options: [4, 5],
          label: 'عدد التربصات المنجزة خلال السنوات الأخيرة (N - n)',
          note: 'N: أكبر عدد من التسجيلات لكل فئة؛ n: عدد التربصات المنجزة. 4-n (حد أقصى 03)، 5-n (حد أقصى 04).' },
        R_PUBS_INTL, R_CONF_PAPERS, R_PUBS_NAT, R_COMMS_INTL, R_COMMS_NAT,
        { id: 'patents', type: 'lines', section: 'الأنشطة التكنولوجية', label: 'براءات الاختراع المتحصل عليها بعد آخر استفادة',
          lines: R_PATENTS_FULL.lines.filter(l => l.id !== 'filing') },
        R_BOOKS, R_PROJECTS,
        { id: 'admin', type: 'lines', section: 'الأنشطة العلمية والإدارية', label: 'المساهمة في الأنشطة الإدارية بعد آخر استفادة',
          lines: [
            { id: 'team', label: 'مسؤول فرقة بحث', pts: 2, maxPts: 2 },
            { id: 'council', label: 'عضو في المجلس العلمي أو في مجلس الإدارة', pts: 1, maxPts: 1 },
            { id: 'incub', label: 'عضوية في اللجنة العلمية للحاضنة', pts: 1, maxPts: 4 }
          ] },
        R_SCI_ACT,
        { id: 'supervision', type: 'lines', section: 'التأطير والإشراف',
          label: 'الإشراف أو الإشراف المشترك على مذكرات (بكالوريا+05 سنوات و/أو ماستر) بعد آخر استفادة',
          lines: [{ id: 'memo', label: 'مذكرة تمت مناقشتها', pts: 2, maxPts: 6 }] },
        R_1275, R_LABEL, R_STUDIES
      ],
      notes: [
        'المنشور العلمي الذي يظهر في نفس الوقت في Scopus وWeb of Science يحسب مرة واحدة بالعلامة القصوى.',
        'تؤخذ بعين الاعتبار جميع الأعمال بعد الاستفادة السابقة حتى في حالة تحويل المؤسسة.',
        'احتساب الأعمال يكون ابتداءً من تاريخ غلق منصة إيداع الملفات لآخر استفادة.'
      ]
    },
    {
      id: 'R_ADM', code: 'م-3', scope: 'research',
      title: 'التربصات قصيرة المدى بالخارج — المستخدمون الإداريون بمراكز البحث',
      population: 'المستخدمون الإداريون بمراكز البحث (شعبة إدارة البحث + شعبة الإعلام العلمي والتكنولوجي)',
      subtitle: 'خاص بالمستخدمين الإداريين بمراكز البحث',
      programs: ['stage', 'stage_special'],
      signer: 'لجنة الانتقاء',
      ranks: [],
      criteria: [
        RS_SENIORITY, RS_PREV,
        { id: 'relevance', type: 'scale', section: 'نشاطات المترشح', label: 'ملاءمة التربص لوظيفة المترشح', max: 2, step: 0.5 },
        { id: 'importance', type: 'scale', section: 'نشاطات المترشح', label: 'أهمية التكوين بالنسبة لبرنامج تطوير المؤسسة', max: 8, step: 0.5 },
        { id: 'head', type: 'check', section: 'نشاطات المترشح', label: 'رئيس مصلحة إدارية - خلية', pts: 3 },
        RS_COMMITTEES,
        { id: 'q1275', type: 'check', section: 'نشاطات المترشح', label: 'المساهمة في تجسيد آليات القرار الوزاري رقم 1275', pts: 2 },
        { id: 'studies', type: 'check', section: 'نشاطات المترشح', label: 'نشر الدراسات في المجلات العلمية', pts: 2 }
      ],
      notes: [
        'لا يمكن أن يكون عضو لجنة الانتقاء يحمل صفة المترشح برسم سنة الانتقاء.',
        'يتم تنفيذ التربص قصير المدى في الخارج حصرا في إطار الاتفاقيات الدولية المبرمة.'
      ]
    },
    {
      id: 'R_TECH_ENG', code: 'م-4', scope: 'research',
      title: 'التربصات قصيرة المدى — المستخدمون التقنيون لدعم البحث (شعبة الهندسة)',
      population: 'المستخدمون التقنيون لدعم البحث — شعبة الهندسة',
      subtitle: 'خاصة بالمستخدمين التقنيين لدعم البحث',
      programs: ['stage', 'stage_special'],
      signer: 'المجلس العلمي',
      ranks: [],
      criteria: [
        RS_SENIORITY, RS_PREV,
        { id: 'relevance', type: 'scale', section: 'نشاطات المترشح', label: 'ملاءمة التربص لوظيفة المترشح', max: 5, step: 0.5 },
        { id: 'importance', type: 'scale', section: 'نشاطات المترشح', label: 'أهمية التكوين بالنسبة لبرنامج تطوير المؤسسة', max: 5, step: 0.5 },
        RS_TECH_HEAD, RS_COMMITTEES, RS_TECH_PATENTS, RS_TECH_PROJECTS,
        { id: 'q1275', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
          label: 'المساهمة في الإشراف على طالب في إطار القرار 1275 (مذكرة بكالوريا+05 سنوات/أو ماستر) بعد آخر استفادة',
          lines: [{ id: 'p', label: 'مشروع', pts: 5, maxCount: 3 }] },
        { id: 'english', type: 'check', section: 'المساهمة في الأنشطة التكنولوجية', label: 'قيام بأعمال بحثية، خبرة، تقارير باللغة الإنجليزية في ميادين العلوم والتكنولوجيا', pts: 5 }
      ],
      notes: ['يتم تنفيذ التربص قصير المدى في الخارج حصرا في إطار الاتفاقيات الدولية المبرمة.']
    },
    {
      id: 'R_TECH_DEV', code: 'م-5', scope: 'research',
      title: 'التربصات قصيرة المدى — المستخدمون التقنيون لدعم البحث (شعبة التطوير التكنولوجي)',
      population: 'المستخدمون التقنيون لدعم البحث — شعبة التطوير التكنولوجي',
      subtitle: 'خاصة بالمستخدمين التقنيين لدعم البحث',
      programs: ['stage', 'stage_special'],
      signer: 'المجلس العلمي',
      ranks: [],
      criteria: [
        RS_SENIORITY, RS_PREV,
        { id: 'relevance', type: 'scale', section: 'نشاطات المترشح', label: 'ملاءمة التربص لوظيفة المترشح', max: 5, step: 0.5 },
        { id: 'importance', type: 'scale', section: 'نشاطات المترشح', label: 'أهمية التكوين بالنسبة لبرنامج تطوير المؤسسة', max: 5, step: 0.5 },
        RS_TECH_HEAD, RS_COMMITTEES, RS_TECH_PATENTS, RS_TECH_PROJECTS,
        { id: 'memo', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
          label: 'إشراف على المذكرات (بكالوريا+05 سنوات) التي تمت مناقشتها بعد الاستفادة من آخر تربص',
          lines: [{ id: 'm', label: 'مذكرة تمت مناقشتها', pts: 0.5 }] },
        { id: 'label', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
          label: 'تأطير مشروع حصل على وسم لابل، مشروع مبتكر، مشروع مؤسسة ناشئة (بعد الاستفادة من آخر تربص)',
          lines: [{ id: 'p', label: 'مشروع', pts: 10 }] },
        { id: 'q1275', type: 'lines', section: 'المساهمة في الأنشطة التكنولوجية',
          label: 'المساهمة في الإشراف على طالب في إطار القرار 1275 بعد آخر استفادة',
          lines: [{ id: 'p', label: 'مشروع', pts: 5, maxCount: 3 }] },
        { id: 'english', type: 'check', section: 'المساهمة في الأنشطة التكنولوجية', label: 'قيام بأعمال بحثية، خبرة، تقارير باللغة الإنجليزية في ميادين العلوم والتكنولوجيا', pts: 3 }
      ],
      notes: ['يتم تنفيذ التربص قصير المدى في الخارج حصرا في إطار الاتفاقيات الدولية المبرمة.']
    }
    ,
    {
      id: 'X_SPECIAL', code: 'خ-1', scope: 'university', noScoring: true,
      title: 'تداريب تحسين المستوى في إطار البرنامج الخاص',
      population: 'الأساتذة الباحثون والاستشفائيون الجامعيون والباحثون الدائمون (البرنامج الخاص)',
      subtitle: 'بدون شبكة تنقيط — حسب الشروط المعلن عنها من قبل الوصاية',
      programs: ['stage_special'],
      signer: 'رئيس المجلس العلمي',
      ranks: [
        { id: 'pe', label: 'أستاذ مميز / أستاذ استشفائي جامعي مميز / مدير بحث مميز', pts: 0 },
        { id: 'pr', label: 'أستاذ / أستاذ استشفائي جامعي / مدير بحث', pts: 0 },
        { id: 'mca', label: 'أستاذ محاضر قسم "أ" / أستاذ بحث "أ"', pts: 0 },
        { id: 'mcb', label: 'أستاذ محاضر قسم "ب" / أستاذ بحث "ب"', pts: 0 },
        { id: 'maa2', label: 'أستاذ مساعد / باحث', pts: 0 }
      ],
      criteria: [],
      notes: [
        'يتم انتقاء المترشحين للاستفادة من تداريب تحسين المستوى في إطار البرنامج الخاص حسب الشروط المعلن عنها من قبل الوصاية (المادة 14).',
        'تنجز حصرا حسب البرنامج المسطر من قبل الوصاية في إطار الاتفاقيات المبرمة؛ وفي حالة عدم وجود اتفاقية على مستوى المؤسسة يمكن الاستفادة من اتفاقيات مؤسسة أخرى (المادة 12).',
        'تخصص لها 80% من حصة 90% الموجهة لتربصات تحسين المستوى (المادة 5).'
      ]
    },
    {
      id: 'X_MASTER', code: 'خ-2', scope: 'university', noScoring: true,
      title: 'طلبة السنة الثانية ماستر — عروض التكوين المشتركة ذات الطابع الدولي',
      population: 'الطلبة غير الأجراء المسجلون في السنة الثانية ماستر (شهادة مزدوجة أو مشتركة)',
      subtitle: 'مستثنون من الانتقاء بالمجلس العلمي (المادة 14) — تسيير الملف والمتابعة فقط',
      programs: ['stage_long'],
      signer: 'مدير المؤسسة',
      ranks: [{ id: 'm2', label: 'طالب ماستر 2 (تكوين مشترك دولي)', pts: 0 }],
      criteria: [],
      notes: [
        'تربص لا تتعدى مدته خمسة أشهر وتسعة وعشرين يوما (المادة 12).',
        'يتم التكفل بهم من قبل المؤسسات التي يسجلون فيها (المادة 10).'
      ]
    }
  ];

  // ملفات الترشح المطلوبة حسب الشبكة/الصنف
  function requiredDocs(grid, rankId, program) {
    const d = ['nationality'];
    if (!grid) return d;
    switch (grid.id) {
      case 'U_CONF': {
        const r = rankId || '';
        if (r === 'phd' || r === 'maa') d.push('reg_regular');
        if (r === 'phd') d.push('conf_request');
        d.push('conf_invitation', 'conf_program', 'conf_paper');
        break;
      }
      case 'R_CONF_SEJ':
        if (program === 'conf') d.push('conf_invitation', 'conf_program', 'conf_paper');
        else d.push('workplan', 'host_countries');
        break;
      case 'U_SEJ':
        d.push('workplan', 'host_countries');
        break;
      case 'U_STAGE':
        if (rankId === 'cotutelle') d.push('convention_cotutelle', 'reg_regular');
        else if (rankId === 'phd') d.push('reg_regular', 'workplan');
        else d.push('reg_proof', 'workplan');
        break;
      case 'R_STAGE':
        d.push('reg_proof', 'workplan');
        break;
      case 'X_SPECIAL':
        d.push('special_conditions');
        break;
      case 'X_MASTER':
        d.push('reg_master2', 'convention_master');
        break;
      default: // المستخدمون الإداريون والتقنيون
        d.push('convention', 'work_cert', 'degree');
        if (program === 'stage_special') d.push('special_conditions');
    }
    return d;
  }

  global.GRIDS_DATA = { GRIDS, PROGRAMS, DOCS, RETURN_DOCS, RETURN_DOC_LABELS, AUTHOR_WEIGHTS, requiredDocs };
})(typeof window !== 'undefined' ? window : globalThis);

/* الهيكل الافتراضي: جامعة محمد خيضر بسكرة — قابل للتعديل من الإعدادات (إضافة/حذف كليات وأقسام) */
(function (global) {
  'use strict';
  const F = (id, color, ar, fr, en, depts) => ({ id, color, ar, fr, en, depts: depts.map(([did, dar, dfr, den]) => ({ id: did, ar: dar, fr: dfr, en: den })) });
  global.DEFAULT_STRUCTURE = {
    institution: {
      ar: 'جامعة محمد خيضر بسكرة',
      fr: 'Université Mohamed Khider de Biskra',
      en: 'Mohamed Khider University of Biskra'
    },
    faculties: [
      F('fsesnv', '#2563eb', 'كلية العلوم الدقيقة وعلوم الطبيعة والحياة', 'Faculté des Sciences Exactes et des Sciences de la Nature et de la Vie', 'Faculty of Exact Sciences and Natural and Life Sciences', [
        ['math', 'قسم الرياضيات', 'Département de Mathématiques', 'Department of Mathematics'],
        ['info', 'قسم الإعلام الآلي', 'Département d\'Informatique', 'Department of Computer Science'],
        ['sm', 'قسم علوم المادة', 'Département des Sciences de la Matière', 'Department of Material Sciences'],
        ['snv', 'قسم علوم الطبيعة والحياة', 'Département des Sciences de la Nature et de la Vie', 'Department of Natural and Life Sciences'],
        ['agro', 'قسم العلوم الفلاحية', 'Département des Sciences Agronomiques', 'Department of Agronomic Sciences']
      ]),
      F('fst', '#0891b2', 'كلية العلوم والتكنولوجيا', 'Faculté des Sciences et de la Technologie', 'Faculty of Science and Technology', [
        ['gch', 'قسم الهندسة المدنية والري', 'Département de Génie Civil et Hydraulique', 'Department of Civil and Hydraulic Engineering'],
        ['gm', 'قسم الهندسة الميكانيكية', 'Département de Génie Mécanique', 'Department of Mechanical Engineering'],
        ['ge', 'قسم الهندسة الكهربائية', 'Département de Génie Électrique', 'Department of Electrical Engineering'],
        ['ci', 'قسم الكيمياء الصناعية', 'Département de Chimie Industrielle', 'Department of Industrial Chemistry'],
        ['arch', 'قسم الهندسة المعمارية', 'Département d\'Architecture', 'Department of Architecture']
      ]),
      F('fll', '#9333ea', 'كلية الآداب واللغات', 'Faculté des Lettres et des Langues', 'Faculty of Letters and Languages', [
        ['ar', 'قسم الآداب واللغة العربية', 'Département des Lettres et Langue Arabe', 'Department of Arabic Language and Literature'],
        ['le', 'قسم اللغات الأجنبية', 'Département des Langues Étrangères', 'Department of Foreign Languages']
      ]),
      F('fshs', '#db2777', 'كلية العلوم الإنسانية والاجتماعية', 'Faculté des Sciences Humaines et Sociales', 'Faculty of Humanities and Social Sciences', [
        ['ss', 'قسم العلوم الاجتماعية', 'Département des Sciences Sociales', 'Department of Social Sciences'],
        ['sh', 'قسم العلوم الإنسانية', 'Département des Sciences Humaines', 'Department of Humanities']
      ]),
      F('fdsp', '#b45309', 'كلية الحقوق والعلوم السياسية', 'Faculté de Droit et des Sciences Politiques', 'Faculty of Law and Political Science', [
        ['droit', 'قسم الحقوق', 'Département de Droit', 'Department of Law'],
        ['sp', 'قسم العلوم السياسية', 'Département des Sciences Politiques', 'Department of Political Science']
      ]),
      F('fsecsg', '#15803d', 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير', 'Faculté des Sciences Économiques, Commerciales et des Sciences de Gestion', 'Faculty of Economics, Commerce and Management', [
        ['eco', 'قسم العلوم الاقتصادية', 'Département des Sciences Économiques', 'Department of Economics'],
        ['com', 'قسم العلوم التجارية', 'Département des Sciences Commerciales', 'Department of Commercial Sciences'],
        ['gest', 'قسم علوم التسيير', 'Département des Sciences de Gestion', 'Department of Management Sciences']
      ]),
      F('staps', '#dc2626', 'معهد علوم وتقنيات النشاطات البدنية والرياضية', 'Institut des Sciences et Techniques des Activités Physiques et Sportives', 'Institute of Physical Education and Sports Sciences', [
        ['staps', 'علوم وتقنيات النشاطات البدنية والرياضية', 'STAPS', 'Sports Sciences']
      ]),
      F('rect', '#475569', 'رئاسة الجامعة والمصالح المشتركة', 'Rectorat et services communs', 'Rectorate and shared services', [
        ['rel', 'نيابة المديرية للعلاقات الخارجية', 'Vice-rectorat des relations extérieures', 'Vice-rectorate for External Relations'],
        ['pg', 'نيابة المديرية للتكوين العالي في الطور الثالث', 'Vice-rectorat de la formation doctorale', 'Vice-rectorate for Doctoral Training'],
        ['sg', 'الأمانة العامة', 'Secrétariat général', 'General Secretariat'],
        ['bib', 'المكتبة المركزية', 'Bibliothèque centrale', 'Central Library']
      ])
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);

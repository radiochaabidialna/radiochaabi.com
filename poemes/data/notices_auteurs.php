<?php
/**
 * ---------------------------------------------------------------
 *  Notices d'auteurs (poètes du melhoun)
 * ---------------------------------------------------------------
 *  Deux sources sont fusionnées à l'affichage :
 *    1) la base `webchaabi.biographies` (lue, jamais modifiée) ;
 *    2) les notices ci-dessous, rédigées à partir des documents
 *       fournis par l'utilisateur (fichiers .doc).
 *
 *  Clé = nom de l'auteur tel qu'il figure dans `qacidates.auteur`.
 * ---------------------------------------------------------------
 */
declare(strict_types=1);


/* Fichier interne : appelé directement, il répond 404 au lieu de s'exécuter. */
if (isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}

return [

/* ═══════════════════════════════════════════════════════════════
   Sélections du registre « Ben khlouf Lakhdar.doc »
   (dates, régions et vers cités par le document)
   ═══════════════════════════════════════════════════════════════ */

"Mohamed Benmsaib" => [
  'nom_ar' => 'الحاج محمد بن مسايب',
  'siecle' => 'début XVIIIᵉ – mort en 1768',
  'region' => 'Tlemcen',
  'bio_fr' =>
    "Né au début du XVIIIᵉ siècle dans une famille andalouse installée à Tlemcen. Après une éducation brillante, il se consacre à la poésie. S'étant attiré des ennuis avec les autorités turques, il quitte Tlemcen pour le Maroc, avant d'y revenir à la fin de sa vie, où il meurt en odeur de sainteté.\n\n" .
    "Il est considéré comme **le poète le plus fécond du Maghreb occidental** : son œuvre est évaluée à plus de **deux mille pièces**. Il est enterré à Tlemcen ; les femmes, lors de la <em>ziyâra</em> à son mausolée, répètent : « <em>بن مسايب حضار الغايب</em> » (Ben Messayeb, celui qui est présent parmi les absents).\n\n" .
    "Parmi ses qacidates les plus célèbres, « <em>إليك نشكي بأمري يا الوحداني</em> ». Le document signale une énigme restée fameuse dans ce poème : les vers où il est question de « <em>soixante-six sultans</em> » surmontés d'un « <em>yâqût</em> qui brille » — 66 étant la valeur numérale (<em>abjad</em>) du mot <strong>الله</strong>. L'auteur du document rapporte, comme hypothèse personnelle, que le « yâqût » désignerait la <em>chedda</em> (la voyelle) du mot divin.",
  'bio_ar' =>
    "الحاج محمد بن مسايب، من تلمسان. وُلد في مطلع القرن الثامن عشر في أسرة أندلسية، تلقّى تعليمًا ممتازًا ثم انصرف إلى الشعر. بعد خلافات مع السلطات التركية غادر تلمسان إلى المغرب، ثم عاد إليها في آخر عمره وتوفّي بها. يُعدّ أكثر شعراء المغرب الأقصى غزارةً: يُقدَّر ديوانه بأكثر من ألفي قصيدة. وإذا زارت النساءُ ضريحَه قلن: «بن مسايب حضار الغايب». ومن أشهر قصائده «إليك نشكي بأمري يا الوحداني».",
  'vers' => 'بن مسايب حضار الغايب',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Cheikh Mohamed Ben Debbah" => [
  'nom_ar' => 'محمد بن ذباح',
  'siecle' => 'XVIIIᵉ siècle',
  'region' => 'Tlemcen · Constantine',
  'bio_fr' =>
    "Poète du XVIIIᵉ siècle, il vécut entre **Tlemcen et Constantine**. Le registre cite de lui l'incipit « <em>الربيع أقبل بجيش الغمام جرار</em> » — c'est précisément la qacidate <strong>Er-Rabiaâ Aqbal</strong> de ce répertoire, où le printemps est décrit comme une armée dont les nuages sont les soldats et la pluie les tambours.",
  'bio_ar' =>
    "شاعر من القرن الثامن عشر، عاش بين تلمسان وقسنطينة. ومن شعره المطلع «الربيع أقبل بجيش الغمام جرار»، وهي القصيدة المعروفة بالربيعية.",
  'vers' => 'الربيع اقبل بجيش الغمام جرار',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Mohamed Ben Sahla" => [
  'nom_ar' => 'محمد بن سحلة',
  'siecle' => 'XVIIIᵉ siècle',
  'region' => 'Tlemcen',
  'bio_fr' =>
    "Poète de Tlemcen, XVIIIᵉ siècle. Son fils **Boumediene Ben Sahla** fut également poète — le registre cite de ce dernier « <em>سبحان خالقي سلطني</em> » (aussi connu sous « <em>يوم الخميس أش آداني</em> »).",
  'bio_ar' =>
    "شاعر تلمساني من القرن الثامن عشر، وابنه بومدين بن سحلة شاعر أيضًا، ومن شعره «سبحان خالقي سلطني» المعروف بـ«يوم الخميس أش آداني».",
  'vers' => 'خاطري بالجفا تعذب',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Cheikh Moustafa Ben Lekbabti" => [
  'nom_ar' => 'مصطفى بن لكبابطي',
  'siecle' => '1769 – 1860',
  'region' => 'Alger · Alexandrie',
  'bio_fr' =>
    "Né à **Alger en 1769**, mort en exil à **Alexandrie en 1860**. Il fut **Grand Mufti malékite à la Djamaa El Kabîr** d'Alger. Ami du poète Mohamed Ben Chahed, lui aussi mufti malékite.",
  'bio_ar' =>
    "وُلد بالجزائر العاصمة سنة 1769 وتوفّي في المنفى بالإسكندرية سنة 1860. تولّى الإفتاء المالكي بجامع الجزائر الكبير، وكان صديقًا للشاعر محمد بن شاهد.",
  'vers' => 'من يبات يراعي الأحباب أش هي حالته',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Cheikh Mohamed Ben Ismail" => [
  'nom_ar' => 'محمد بن إسماعيل',
  'siecle' => '1820 – 1870',
  'region' => 'Casbah d\'Alger',
  'bio_fr' =>
    "Né à la **Casbah d'Alger** (1820-1870). Le registre voit en lui l'un des plus merveilleux textes poétiques algériens avec sa qacidate de <strong>la séparation</strong> (« <em>ذاع صبري</em> » / « الفراق »). Il est le père du poète **Kouider Ben Ismaïl**.",
  'bio_ar' =>
    "وُلد بقصبة الجزائر (1820-1870)، ويُعدّ نصّه الشعري في «الفراق» («ذاع صبري») من أجمل النصوص الشعبية الجزائرية. وهو والد الشاعر قويدر بن إسماعيل.",
  'vers' => 'ذاع صبري',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Cheikh Kouider Ben Ismaïl" => [
  'nom_ar' => 'قويدر بن إسماعيل',
  'siecle' => '1850 – 1922',
  'region' => 'Alger',
  'bio_fr' =>
    "Né en **1850**, mort en **1922**, fils du poète Mohamed Ben Ismaïl. Héritier d'une double tradition — savante et populaire — il a laissé des pièces restées au répertoire, dont **« Sidi Sahnoun »** (présente dans ce répertoire : <em>Ya Men Qalbek Mamhoun</em>) et « العاشقة ».\n\n" .
    "Le registre cite de lui : « <em>صبت على الجزائر وفاض عنها بحر البهتان</em> ».",
  'bio_ar' =>
    "وُلد سنة 1850 وتوفّي سنة 1922، وهو ابن الشاعر محمد بن إسماعيل. من أشهر ما تركه: «سيدي سحنون» و«العاشقة»، ومن شعره «صبت على الجزائر وفاض عنها بحر البهتان».",
  'vers' => 'سيدي سحنون',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

"Belkacem Ould Said" => [
  'nom_ar' => 'بلقاسم ولد سيدي سعيد',
  'siecle' => '1875 – 1945',
  'region' => 'Mostaganem',
  'bio_fr' =>
    "Poète de **Mostaganem** (1875-1945). Le registre cite de lui l'incipit « <em>كفاش حيلتي يا ناسي واش هو عمّالي</em> » — c'est la qacidate <strong>Kifech Hilti Ya Nassi</strong> de ce répertoire.",
  'bio_ar' =>
    "شاعر من مستغانم (1875-1945)، ومن شعره المطلع «كفاش حيلتي يا ناسي واش هو عمّالي» — وهي القصيدة المعروفة في هذا الديوان.",
  'vers' => 'كفاش حيلتي يا ناسي',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

/* ═══════════════════════════════════════════════════════════════
   Sidi Lakhdar Ben Khlouf — notice détaillée
   ═══════════════════════════════════════════════════════════════ */

"Lakhdar Ben Khlouf" => [
  'nom_ar'  => 'سيدي لخضر بن خلوف',
  'siecle'  => 'XVIᵉ siècle',
  'region'  => 'Mostaganem · Dahra',
  'bio_fr'  =>
    "**Identité.** Sidi Lakhdar Ben Khelouf — de son vrai nom <em>Lakhal</em> — est un barde et mystique du XVIᵉ siècle, originaire de la région de Mostaganem. La tradition rapporte que le Prophète lui aurait demandé en songe de changer son prénom <em>al-Akhal</em> (le noir) en <em>Akhdar</em> (le vert).\n\n" .
    "**Le panégyriste du Prophète.** Surnommé « prince des bardes du Dahra », il fut un brillant panégyriste du Prophète et l'un des rares auteurs à s'être consacré <em>exclusivement</em> au <em>madih</em> — hormis deux pièces sur la bataille de Mazagran contre les Espagnols (26 août 1558), dont il relata les péripéties avec précision. Son renom dépassa les limites du pays des Beni Chougran et de Mascara où il vécut.\n\n" .
    "**Itinéraire.** Orphelin de père très jeune, il chérissait particulièrement sa mère Kella. Sa jeunesse se passa à Mazagran, dans la banlieue de Mostaganem. Après la cinquantaine, il entreprit un voyage à Tlemcen auprès de Sidi Boumédiène : ce contact intellectuellement très fructueux le marqua profondément. Il quitta alors Mazagran et la poésie lyrique pour s'établir chez les Ouled Brahim, près de Mostaganem, où il s'affirma comme illustre panégyriste du Prophète.\n\n" .
    "**Le songe.** Trop pauvre pour accomplir le pèlerinage, il aurait vu le Prophète en songe quatre-vingt-neuf fois, et celui-ci lui aurait accordé une ultime faveur : venir le voir, avec ses dix compagnons, « <em>dans la réalité et non plus en rêve</em> » (<em>felyaqda la felmnan</em>) — ainsi qu'il l'avait juré dans un poème de deux cents vers commençant par « <em>Ya taj El anbya l-kram…</em> ».\n\n" .
    "**Mémoire.** Il aurait vécu 125 ans. Malgré sa célébrité, la famille Ben Khelouf vivait dans une pauvreté totale. Le barde est enterré au douar qui porte son nom, <strong>Sidi Lakhdar</strong> (wilaya de Mostaganem, à environ 60 km de Mostaganem). Mohamed Bekhoucha rassembla 31 pièces du poète et les publia en 1985 à Rabat sous le titre <em>Diwan de Sidi Lakhdar Ben Khelouf</em>.",
  'bio_ar'  =>
    "سيدي لخضر بن خلوف — واسمه في الأصل «الأخضر» — بادٍ ومتصوّف من منطقة مستغانم، عاش في القرن السادس عشر.\n\n" .
    "يُعدّ من أبرز شعراء المدح النبوي، وقد وقف فنه على مدح الرسول ﷺ دون سواه، إلا قصيدتين في معركة مزغران ضد الإسبان سنة 1558، وصف فيهما مجريات المعركة بدقة. عاش في بلاد بني شقران ومعسكر، وذاع صيته في نواحيها.\n\n" .
    "توفّي والده وهو صغير، وكان بارًّا بأمه «كَلّة». وبعد الخمسين قصد تلمسان ولقي سيدي بومدين، فأثمر اللقاء تحوّلًا في حياته: ترك مزغران والشعر الغزلي وانصرف إلى العبادة والتصوّف، واستقرّ عند أولاد براهيم قرب مستغانم.\n\n" .
    "يُروى أنه رأى النبي ﷺ في المنام تسعًا وثمانين مرة، ووعد بأن يراه يقظة مع عشرة من أصحابه، كما جاء في قصيدته التي مطلعها «يا تاج الأنبياء الكرام». تُوفّي ودُفن في دوّار يحمل اسمه «سيدي لخضر» بولاية مستغانم. جمع محمد بخوشة إحدى وثلاثين قصيدة من شعره ونشرها في الرباط سنة 1985 بعنوان «ديوان سيدي لخضر بن خلوف».",
  'vers' => 'يا فارس من تم جيت اليوم قصة مزغران معلومة',
  'source_doc' => 'Ben khlouf Lakhdar.doc',
],

];

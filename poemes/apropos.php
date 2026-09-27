<?php
/**
 * PAGE — À PROPOS
 * ---------------------------------------------------------------
 * Page publique : elle parle du chaâbi, du projet et de la façon de
 * lire une qacida. Aucun détail technique (base, serveur, code) :
 * le visiteur n'en a pas besoin.
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$st = get_stats();

page_head([
    'title' => 'À propos — le chaâbi, ses poètes et ses voix | Qacidates',
    'desc'  => "Le chaâbi, le melhoun et la qacida : ce que ce répertoire rassemble, comment lire une qacida, et pourquoi ces textes se transmettent de cheikh en cheikh.",
    'canonical' => page_url('apropos'),
    'nav_apropos' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Le projet</p>
    <h1 class="hero__title">À propos</h1>
    <p class="hero__lead">Le chaâbi algérien : ses poètes, ses voix, ses vers — réunis en arabe et en français.</p>
  </div>

  <section class="chant">
    <div class="chant__head">
      <p class="chant__label-ar" dir="rtl" lang="ar">الشعبي والملحون</p>
      <h3 class="chant__label-fr">Le chaâbi, une poésie chantée</h3>
    </div>
    <div class="leaves">
      <div class="leaf leaf--fr">
        <span class="leaf__tag">Français</span>
        <div class="leaf__body">
          <p class="prose">Le <strong>chaâbi</strong> naît à Alger au début du XX<sup>e</sup> siècle, dans la
          Casbah. Mais ce que l'on y chante est plus ancien : des <strong>qacidates</strong>, des poèmes en
          arabe populaire — le <strong>melhoun</strong> — dont certains remontent au XVI<sup>e</sup> siècle.</p>

          <p class="prose">Le poète y dit l'amour et l'absence, la misère et la foi, l'exil, la beauté, la
          sagesse. Il s'en remet au ciel, se plaint des jaloux, décrit une démarche, célèbre le Prophète,
          médite sur la mort. Puis le poème passe à la <strong>voix</strong> : un cheikh le reprend, le
          pétrit, l'impose — et le voilà pour cent ans.</p>

          <p class="prose">C'est cela qui fait la beauté de cette tradition : <strong>le texte ne vit que
          par la bouche qui le porte</strong>. Chaque interprète laisse sa marque, sans jamais effacer
          l'auteur.</p>
        </div>
      </div>
      <div class="leaf leaf--ar">
        <span class="leaf__tag">العربية</span>
        <div class="leaf__body" dir="rtl" lang="ar">
          <p class="prose">الشعبي فنّ غنائي جزائري وُلد في القصبة، يحمل في داخله شعراً أقدم منه: القصائد
          الملحونة، بعضها يعود إلى القرن السادس عشر.</p>
          <p class="prose">فيها الحبّ والفراق، والفقر والإيمان، والغربة والجمال والحكمة. ينظمها شاعر، ثم
          يتلقّفها المنشد فيمنحها صوته، فتبقى قروناً.</p>
          <p class="prose">النصّ لا يحيا إلّا بصوت من يحمله — والمنشد يطبعها بطابعه دون أن يمحو صاحبها.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="chant">
    <div class="chant__head">
      <p class="chant__label-ar" dir="rtl" lang="ar">فكرة المشروع</p>
      <h3 class="chant__label-fr">Ce que ce site rassemble</h3>
    </div>
    <div class="leaves">
      <div class="leaf leaf--fr">
        <span class="leaf__tag">Français</span>
        <div class="leaf__body">
          <p class="prose"><strong><?= (int) $st['qacidates'] ?></strong> qacidates, de
          <strong><?= (int) $st['auteurs'] ?></strong> poètes, portées par
          <strong><?= (int) $st['interpretes'] ?></strong> interprètes — et
          <strong><?= (int) $st['audios'] ?></strong> enregistrements à écouter.</p>

          <p class="prose">Pour chaque pièce, le site réunit : le <strong>texte arabe</strong>, sa
          <strong>traduction française</strong>, le <strong>poète</strong> et la <strong>voix</strong> qui
          l'a enregistrée, le <strong>thème</strong>, la <strong>structure</strong> du poème, et — quand la
          pièce est encore mal connue — la <strong>photographie du manuscrit</strong> qui l'a transmise.</p>

          <p class="prose">L'objectif est simple : <strong>qu'on puisse lire ces poèmes</strong> — en arabe si
          on le parle, en français sinon — et qu'on sache toujours <strong>d'où vient chaque vers</strong>.</p>
        </div>
      </div>
      <div class="leaf leaf--ar">
        <span class="leaf__tag">العربية</span>
        <div class="leaf__body" dir="rtl" lang="ar">
          <p class="prose">في هذا الموقع <strong><?= (int) $st['qacidates'] ?></strong> قصيدة، لـ
          <strong><?= (int) $st['auteurs'] ?></strong> شاعراً، بأصوات
          <strong><?= (int) $st['interpretes'] ?></strong> منشداً، مع
          <strong><?= (int) $st['audios'] ?></strong> تسجيلاً للاستماع.</p>
          <p class="prose">لكلّ قصيدة: نصّها العربي، وترجمته الفرنسية، وصاحبها، ومن أنشدها، وموضوعها،
          وبنيتها، وصورة المخطوط حين لا يكون النصّ المطبوع متوفّراً.</p>
          <p class="prose">الهدف بسيط: أن تُقرأ هذه القصائد، وأن يُعرف أصل كلّ بيت.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="chant">
    <div class="chant__head">
      <p class="chant__label-ar" dir="rtl" lang="ar">كيف نقرأ قصيدة</p>
      <h3 class="chant__label-fr">Comment lire une qacida</h3>
    </div>
    <div class="leaves">
      <div class="leaf leaf--fr" style="grid-column:1/-1">
        <span class="leaf__tag">Repères</span>
        <div class="leaf__body">
          <dl class="apropos-list">
            <div>
              <dt>Le poète et l'interprète</dt>
              <dd>Ce ne sont pas les mêmes personnes, et c'est essentiel. Le poète écrit ; le cheikh chante.
                Une même qacida peut ainsi exister en plusieurs enregistrements, chacun avec son
                <dfn class="gloss" tabindex="0" data-def="Prélude instrumental et vocal qui installe le mode avant le chant.">istikhbar</dfn>,
                son rythme, son émotion.</dd>
            </div>
            <div>
              <dt>La structure</dt>
              <dd>Une qacida se déploie par sections, souvent annoncées : la <em>khamassa</em> (le quintet
                d'ouverture), le <em>mâtla'</em> (le premier vers), le <em>khalâs</em> (la conclusion).
                Le site affiche ces repères quand le poème les porte.</dd>
            </div>
            <div>
              <dt>Le refrain</dt>
              <dd>Certains poèmes reviennent à un même vers, repris par l'auditoire. Il figure en tête de
                la fiche, dans les deux langues.</dd>
            </div>
            <div>
              <dt>Trois états de texte</dt>
              <dd>Selon l'avancement du travail : <strong>texte arabe et traduction</strong> ;
                <strong>texte arabe seul</strong> (la traduction française est annoncée « à venir ») ;
                ou <strong>manuscrit scanné</strong> quand la pièce n'a pas encore été saisie. Dans ce
                dernier cas, la loupe permet de lire la page d'origine.</dd>
            </div>
            <div>
              <dt>Les voix anonymes</dt>
              <dd>Beaucoup de pièces anciennes n'ont pas d'enregistrement connu : la pastille
                <strong>« Autres »</strong>, dans les filtres, les rassemble. Ce sont souvent les plus
                belles — et les plus rares.</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </section>

  <section class="chant">
    <div class="chant__head">
      <p class="chant__label-ar" dir="rtl" lang="ar">المصادر</p>
      <h3 class="chant__label-fr">D'où viennent ces textes</h3>
    </div>
    <div class="leaves">
      <div class="leaf leaf--fr">
        <span class="leaf__tag">Français</span>
        <div class="leaf__body">
          <p class="prose">Ce répertoire vient d'abord de la <strong>tradition orale</strong> : des
          enregistrements de cheikhs, des recueils de chansons, des carnets recopiés à la main.</p>
          <p class="prose">Il vient aussi des <strong>manuscrits</strong> — pages jaunies, encre d'un autre
          siècle — que des familles et des chercheurs ont conservés. Plusieurs sont reproduits ici.</p>
          <p class="prose">Textes et traductions sont confrontés, corrigés, complétés au fil des
          rencontres. Là où un doute subsiste, le site l'indique plutôt que de trancher.</p>
        </div>
      </div>
      <div class="leaf leaf--ar">
        <span class="leaf__tag">العربية</span>
        <div class="leaf__body" dir="rtl" lang="ar">
          <p class="prose">هذا الرصيد يأتي أوّلاً من الرواية الشفهية: تسجيلات الشيوخ، ودواوين الأغاني،
          ودفاتر نُسخت بخطّ اليد.</p>
          <p class="prose">ويأتي أيضاً من المخطوطات التي حفظتها عائلات وباحثون، وبعضها مصوّرٌ هنا.</p>
          <p class="prose">تُقابل النصوص والترجمات وتُصحّح وتُكمّل مع الأيّام، وما بقي فيه شكّ يُذكر بوضوح
          بدل أن يُقطع فيه.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="chant">
    <div class="chant__head">
      <p class="chant__label-ar" dir="rtl" lang="ar">كيف تستعمل الموقع</p>
      <h3 class="chant__label-fr">Comment parcourir le répertoire</h3>
    </div>
    <div class="leaves">
      <div class="leaf leaf--fr" style="grid-column:1/-1">
        <span class="leaf__tag">Guide</span>
        <div class="leaf__body">
          <ul class="apropos-list apropos-list--ul">
            <li><strong>Chercher</strong> — le moteur fouille le titre, l'auteur, l'interprète <em>et le
              corps du poème</em>, en arabe comme en français.</li>
            <li><strong>Filtrer</strong> — par interprète, par poète, par thème, ou seulement les pièces
              qui ont un enregistrement.</li>
            <li><strong>Écouter</strong> — quand un fichier audio existe, le lecteur reste au bas de la page
              pendant qu'on lit le texte.</li>
            <li><strong>Naviguer dans une pièce</strong> — la barre de chapitres, en haut de chaque qacida,
              mène directement à la strophe voulue.</li>
            <li><strong>Agrandir un manuscrit</strong> — un clic sur la loupe ouvre la page scannée en grand.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <p style="text-align:center;margin-top:1.6rem">
    <a class="poem__back" href="<?= h(page_url()) ?>">← Toutes les qacidates</a>
    <a class="btn-ghost" href="<?= h(page_url('interpretes')) ?>" style="margin-left:.6rem">Les interprètes</a>
    <a class="btn-ghost" href="<?= h(page_url('auteurs')) ?>" style="margin-left:.3rem">Les poètes</a>
  </p>
</section>
<?php page_foot(['v' => ASSET_V]); ?>

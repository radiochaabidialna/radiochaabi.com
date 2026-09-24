/**
 * Outil de détection de conflits CSS — Radio Chaabi
 * Usage console :
 *   CssConflict.scan('#back-to-top')
 *   CssConflict.scan('button#back-to-top', ['opacity','visibility','transform','pointer-events'])
 *   CssConflict.report('#back-to-top')
 */
(function (w) {
  'use strict';

  function specificity(selector) {
    // Approximation W3C : a,b,c (id, class/attr, type)
    var a = 0, b = 0, c = 0;
    var s = selector.replace(/::?[a-z-]+(\([^)]*\))?/gi, function (m) {
      // pseudo-elements count as type, pseudo-classes as class
      if (m.indexOf('::') === 0) { c++; return ' '; }
      b++; return ' ';
    });
    s.replace(/#[\w-]+/g, function () { a++; return ''; });
    s.replace(/\.[\w-]+|\[[^\]]*\]/g, function () { b++; return ''; });
    s.replace(/[\w-]+/g, function (m) {
      if (m === 'not' || m === 'is' || m === 'where' || m === 'has') return '';
      c++; return '';
    });
    return { a: a, b: b, c: c, score: a * 10000 + b * 100 + c, text: a + ',' + b + ',' + c };
  }

  function collectRules(selectorHint) {
    var results = [];
    var sheets = Array.prototype.slice.call(document.styleSheets || []);
    sheets.forEach(function (sheet, si) {
      var href = '';
      try { href = sheet.href || (sheet.ownerNode && sheet.ownerNode.id) || 'inline#' + si; } catch (e) { href = 'restricted'; }
      var rules;
      try { rules = sheet.cssRules || sheet.rules; } catch (e) { return; }
      if (!rules) return;
      for (var i = 0; i < rules.length; i++) {
        walkRule(rules[i], href, results, selectorHint);
      }
    });
    return results;
  }

  function walkRule(rule, href, out, hint) {
    try {
      if (rule.type === 4 /* MEDIA */ && rule.cssRules) {
        for (var j = 0; j < rule.cssRules.length; j++) walkRule(rule.cssRules[j], href + ' @media', out, hint);
        return;
      }
      if (!rule.selectorText || !rule.style) return;
      var sel = rule.selectorText;
      if (hint && sel.toLowerCase().indexOf(hint.replace(/^#/, '').replace(/^button/, '').toLowerCase().split(/[\s.>]+/).pop()) === -1) {
        // soft filter: keep if any token matches
        var tokens = hint.replace(/[.#]/g, ' ').split(/\s+/).filter(Boolean);
        var hit = tokens.some(function (t) { return sel.toLowerCase().indexOf(t.toLowerCase()) !== -1; });
        if (!hit) return;
      }
      var decls = [];
      for (var k = 0; k < rule.style.length; k++) {
        var prop = rule.style[k];
        var val = rule.style.getPropertyValue(prop);
        var imp = rule.style.getPropertyPriority(prop);
        decls.push({ prop: prop, value: val, important: imp === 'important' });
      }
      if (!decls.length) return;
      var sp = specificity(sel);
      out.push({
        selector: sel,
        specificity: sp,
        href: href,
        decls: decls,
        cssText: rule.cssText
      });
    } catch (e) { /* ignore */ }
  }

  function scan(selector, props) {
    var el = document.querySelector(selector);
    if (!el) {
      console.warn('[CssConflict] Élément introuvable:', selector);
      return null;
    }
    props = props || ['opacity', 'visibility', 'display', 'transform', 'pointer-events', 'position', 'z-index', 'bottom', 'right'];
    var rules = collectRules(selector);
    // Sort by specificity desc, important first
    rules.sort(function (A, B) {
      var ia = A.decls.some(function (d) { return d.important; }) ? 1 : 0;
      var ib = B.decls.some(function (d) { return d.important; }) ? 1 : 0;
      if (ib !== ia) return ib - ia;
      return B.specificity.score - A.specificity.score;
    });

    var computed = w.getComputedStyle(el);
    var report = {
      selector: selector,
      element: el,
      computed: {},
      rules: rules,
      conflicts: []
    };
    props.forEach(function (p) {
      report.computed[p] = computed.getPropertyValue(p);
    });

    // Detect prop conflicts: same prop with different values + !important
    var byProp = {};
    rules.forEach(function (r) {
      r.decls.forEach(function (d) {
        if (props.indexOf(d.prop) === -1) return;
        if (!byProp[d.prop]) byProp[d.prop] = [];
        byProp[d.prop].push({
          selector: r.selector,
          specificity: r.specificity.text,
          value: d.value,
          important: d.important,
          href: r.href
        });
      });
    });
    Object.keys(byProp).forEach(function (prop) {
      var list = byProp[prop];
      if (list.length < 2) return;
      var values = {};
      list.forEach(function (x) {
        var key = x.value + (x.important ? ' !important' : '');
        values[key] = (values[key] || 0) + 1;
      });
      if (Object.keys(values).length > 1) {
        report.conflicts.push({ prop: prop, sources: list, computed: report.computed[prop] });
      }
    });

    return report;
  }

  function report(selector, props) {
    var r = scan(selector, props);
    if (!r) return;
    console.group('%c[CssConflict] ' + selector, 'color:#b45309;font-weight:bold');
    console.log('Computed:', r.computed);
    if (r.conflicts.length) {
      console.warn('Conflits détectés:', r.conflicts.length);
      r.conflicts.forEach(function (c) {
        console.group('prop: ' + c.prop + ' → computed: ' + c.computed);
        console.table(c.sources.map(function (s) {
          return {
            selector: s.selector,
            specificity: s.specificity,
            value: s.value,
            important: s.important ? 'YES' : '',
            source: (s.href || '').replace(/^.*\//, '')
          };
        }));
        console.groupEnd();
      });
    } else {
      console.log('Aucun conflit multi-valeur sur les propriétés demandées.');
    }
    console.log('Règles matchées (tri spécificité):', r.rules.length);
    console.table(r.rules.slice(0, 25).map(function (x) {
      return {
        selector: x.selector,
        spec: x.specificity.text,
        important: x.decls.filter(function (d) { return d.important; }).map(function (d) { return d.prop; }).join(', '),
        source: (x.href || '').replace(/^.*\//, '')
      };
    }));
    console.groupEnd();
    return r;
  }

  w.CssConflict = { scan: scan, report: report, specificity: specificity };
  console.info('[CssConflict] prêt — CssConflict.report("#back-to-top")');
})(window);

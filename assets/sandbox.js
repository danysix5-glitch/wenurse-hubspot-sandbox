/* ============================================================================
   sandbox.js — Bedienlogik der Sandbox
   - baut die Leiste oben
   - zeichnet die Ansicht aus window.SANDBOX_VIEW
   - setzt die Änderungs-Marker und den Abnahme-Drawer
   - Export der Abnahme als JSON / Markdown
   ============================================================================ */
(function () {
  'use strict';

  const VIEW = window.SANDBOX_VIEW || null;
  const VERGLEICH = window.SANDBOX_VERGLEICH || null;
  const CFG = VIEW || VERGLEICH;
  const IST_VERGLEICH = !VIEW && !!VERGLEICH;   /* Vergleichsseite: mehrere Segmente nebeneinander */
  if (!CFG) {
    console.error('Kein window.SANDBOX_VIEW oder window.SANDBOX_VERGLEICH gefunden. ' +
                  'Die Ansicht kann nicht gezeichnet werden.');
    return;
  }
  if (!window.HS) {
    console.error('hubspot.js wurde nicht geladen.');
    return;
  }

  /* --------------------------------------------------------------- Pur-Modus
     `…html?pur=1` zeigt nur die Karten: keine Leiste, keine Marker, kein Drawer,
     nichts abgedunkelt. Gedacht für die Freigabe an andere Personen (Link oder
     lokale Datei) – Navigation nur über die Fusszeile unten. */
  const PUR = (function () {
    try { return new URLSearchParams(location.search).has('pur') || location.hash === '#pur'; }
    catch (e) { return /[?&]pur/.test(location.search); }
  })();
  if (PUR) {
    document.body.classList.add('sb-clean', 'sb-marker-aus', 'sb-ohne-puls');
  }
  /* Objekt-Klasse: steuert u. a. die Breite der linken Spalte (Kontakte breiter,
     weil dort die Stammdaten und das assoziierte Lead-Objekt stehen). */
  if (CFG.objektIntern) document.body.classList.add('sb-objekt-' + CFG.objektIntern);

  /* ------------------------------------------------------------------ Speicher */
  const SPEICHER_KEY = 'wenurse-hubspot-sandbox:' + (CFG.datei || 'ansicht');

  function laden() {
    try { return JSON.parse(localStorage.getItem(SPEICHER_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function sichern(daten) {
    try { localStorage.setItem(SPEICHER_KEY, JSON.stringify(daten)); } catch (e) { /* file:// ignoriert */ }
  }

  const aenderungen = (CFG.aenderungen || []).map(function (a, i) {
    return { nr: a.nr || i + 1, titel: a.titel, text: a.text || '', ziel: a.ziel || null, status: '', kommentar: '' };
  });
  const zustand = laden();
  aenderungen.forEach(function (a) {
    const s = zustand[a.nr];
    if (s) { a.status = s.status || ''; a.kommentar = s.kommentar || ''; }
  });

  function merken() {
    const out = {};
    aenderungen.forEach(function (a) { out[a.nr] = { status: a.status, kommentar: a.kommentar }; });
    sichern(out);
  }

  /* ---------------------------------------------------------------------- DOM */
  const el = HS.el;
  const svg = HS.svg;

  /* ------------------------------------------------------------------ 1. Leiste */
  const NAV = [{ text: 'Übersicht', href: '../index.html' }];

  /* Bereich (Kontakt / Unternehmen / Deal) und Ansicht bzw. Stage.
     Die Auswahllisten kommen aus data/segmente.js – erzeugt aus dem Blatt
     «Segmente» in Sandbox-Matrizen.xlsx (Pipeline-Stages + Deal-Kategorie). */
  const BEREICHE = [
    { key: 'kontakt', text: 'Kontakt' },
    { key: 'unternehmen', text: 'Unternehmen' },
    { key: 'deal', text: 'Deal' }
  ];
  const SEGMENTE = window.SB_SEGMENTE || [];
  const DATEI = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  const AKTUELL = SEGMENTE.filter(function (s) { return s.datei === DATEI; })[0] || null;
  const hatBereich = function (key) {
    return SEGMENTE.some(function (s) { return s.objekt === key; });
  };

  const bereichWahl = el('select', { class: 'sb-wahl', id: 'sb-bereich-wahl',
    title: 'Bereich wählen – danach erscheinen rechts die zugehörigen Ansichten' },
    BEREICHE.map(function (b) {
      return el('option', { value: b.key, disabled: hatBereich(b.key) ? null : true }, [b.text]);
    }));
  const ansichtWahl = el('select', { class: 'sb-wahl sb-wahl--breit', id: 'sb-ansicht-wahl',
    title: 'Ansicht bzw. Stage wählen' });

  function ansichtFuellen(bereich, gewaehlt) {
    ansichtWahl.innerHTML = '';
    const liste = SEGMENTE.filter(function (s) { return s.objekt === bereich; });
    if (!liste.length) {
      ansichtWahl.appendChild(el('option', { value: '' }, ['– keine Ansicht definiert –']));
      return;
    }
    if (!gewaehlt) {
      ansichtWahl.appendChild(el('option', { value: '', selected: true }, ['– Ansicht wählen –']));
    }
    const nachGruppe = [];
    liste.forEach(function (s) {
      let g = nachGruppe.filter(function (x) { return x.name === s.gruppe; })[0];
      if (!g) { g = { name: s.gruppe, segmente: [] }; nachGruppe.push(g); }
      g.segmente.push(s);
    });
    nachGruppe.forEach(function (g) {
      const og = el('optgroup', { label: g.name });
      g.segmente.forEach(function (s) {
        const rest = s.titel.indexOf('·') >= 0 ? s.titel.split('·').slice(1).join('·').trim() : s.titel;
        og.appendChild(el('option', { value: s.datei, selected: s.datei === gewaehlt ? true : null },
          [s.id + ' · ' + rest]));
      });
      ansichtWahl.appendChild(og);
    });
  }

  const startBereich = AKTUELL ? AKTUELL.objekt
    : (BEREICHE.filter(function (b) { return b.key === CFG.objekt && hatBereich(b.key); })[0]
       || BEREICHE.filter(function (b) { return hatBereich(b.key); })[0] || BEREICHE[0]).key;
  bereichWahl.value = startBereich;
  ansichtFuellen(startBereich, AKTUELL ? AKTUELL.datei : null);

  bereichWahl.addEventListener('change', function () {
    if (hatBereich(bereichWahl.value)) {
      const erstes = SEGMENTE.filter(function (s) { return s.objekt === bereichWahl.value; })[0];
      location.href = erstes.datei + '.html';
    }
  });
  ansichtWahl.addEventListener('change', function () {
    if (ansichtWahl.value) location.href = ansichtWahl.value + '.html';
  });

  const zaehler = el('span', { class: 'sb-zaehler', id: 'sb-zaehler' }, ['0']);

  const bar = el('div', { class: 'sb-bar' }, [
    el('div', { class: 'sb-bar__marke' }, [
      el('span', { class: 'sb-bar__dot' }), 'WeNurse · HubSpot-Sandbox'
    ]),
    el('div', { class: 'sb-bar__trenner' }),
    el('div', {}, [
      el('div', { class: 'sb-bar__titel' }, [CFG.titel || 'Ansicht']),
      CFG.untertitel ? el('div', { class: 'sb-bar__unter' }, [CFG.untertitel]) : null
    ]),
    el('div', { class: 'sb-bar__trenner' }),
    el('nav', { class: 'sb-nav' }, NAV.map(function (n) {
      const aktiv = (CFG.navAktiv && CFG.navAktiv === n.text) || DATEI === 'index';
      return el('a', { href: n.href, class: aktiv ? 'sb-nav--aktiv' : '' }, [n.text]);
    })),
    el('div', { class: 'sb-bar__trenner' }),
    bereichWahl,
    ansichtWahl,
    el('span', { class: 'sb-bar__spacer' }),
    IST_VERGLEICH ? null
      : el('button', { class: 'sb-btn sb-btn--primaer', id: 'sb-abnahme-btn', title: 'Änderungsliste öffnen (Taste D)' },
          ['Abnahme', zaehler]),    el('label', { class: 'sb-schalter', title: 'Änderungs-Marker ein/aus (Taste M)' }, [
      el('input', { type: 'checkbox', id: 'sb-marker-schalter', checked: 'checked' }), 'Marker'
    ]),
    el('button', { class: 'sb-btn', id: 'sb-clean-btn', title: 'Sandbox-Leiste ausblenden – für Screenshots (Taste C)' }, ['Screenshot-Modus']),
    el('label', { class: 'sb-schalter', title: 'Mitte und rechts abdunkeln – Fokus auf der linken Spalte (Taste F)' }, [
      el('input', { type: 'checkbox', id: 'sb-fokus-schalter', checked: 'checked' }), 'Fokus'
    ]),
    el('button', { class: 'sb-btn', id: 'sb-klappen-btn', title: 'Alle Karten auf- oder zuklappen (Taste K)' }, ['Karten']),
    el('label', { class: 'sb-schalter',
                  title: 'Angaben unter dem Kartentitel ein-/ausblenden: interner Name, Bedingung, '
                       + 'Stage-Variante (Taste B)' },
       [el('input', { type: 'checkbox', id: 'sb-bedingung-schalter', checked: 'checked' }), 'Bedingungen']),
    CFG.feldBearbeiten
      ? el('button', { class: 'sb-btn', id: 'sb-feld-btn',
                       title: 'Eigenschaften aus dem Feldkatalog hinzufügen oder entfernen (Taste E)' },
             ['Felder ändern'])
      : null,
    CFG.reihenfolgeExport
      ? el('button', { class: 'sb-btn', id: 'sb-reihenfolge-btn',
                       title: 'Feldauswahl und Reihenfolge dieser Ansicht als JSON speichern' },
             ['Felder ↓'])
      : null,
    CFG.reihenfolgeExport
      ? el('button', { class: 'sb-btn', id: 'sb-reihenfolge-kopie',
                       title: 'Reihenfolge als JSON in die Zwischenablage kopieren' }, ['kopieren'])
      : null,
    el('button', { class: 'sb-btn', id: 'sb-druck-btn', title: 'Drucken / als PDF sichern' }, ['PDF'])
  ]);
  document.body.insertBefore(bar, document.body.firstChild);

  function barHoeheSetzen() {
    document.documentElement.style.setProperty('--sb-h', bar.offsetHeight + 'px');
  }
  barHoeheSetzen();
  window.addEventListener('resize', barHoeheSetzen);

  /* Knopf verbinden – fehlende Elemente (z. B. auf der Vergleichsseite) 
     dürfen die Seite nicht abbrechen. */
  function klick(id, fn) {
    const e = document.getElementById(id);
    if (e) e.addEventListener('click', fn);
    return e;
  }

  /* ------------------------------------------------------------ 2. Ansicht bauen */
  /* Vergleichsseite: gleiche Karten aller Segmente auf derselben Zeile, farblich
     gepaart (gleiche Kartenbezeichnung = gleiche Farbe), damit man sofort sieht,
     welche Karten zusammengehören bzw. wo eine Stage eine Variante braucht. */
  const VERGLEICH_FARBEN = 12;
  let pickerFuerSegment = null;      /* wird im Feldmodus gesetzt (Block 6c) */

  function farbeFuer(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) % 100000; }
    return h % VERGLEICH_FARBEN;
  }

  /* Farbe = Identität der Karte (Kartenname + Feldmenge), NICHT der blosse Kartenname:
     eine Stage-Variante mit anderen Feldern bekommt also eine eigene Farbe, damit
     sichtbar bleibt, was wirklich dasselbe ist. Pro Seite nie zweimal dieselbe Farbe. */
  function farbenVerteilen(ids) {
    const farbe = {}, belegt = {}, doppelt = {};
    ids.forEach(function (id) {
      let f = farbeFuer(id);
      if (belegt[f]) {
        let frei = -1;
        for (let k = 1; k <= VERGLEICH_FARBEN; k++) {
          const alt = (f + k) % VERGLEICH_FARBEN;
          if (!belegt[alt]) { frei = alt; break; }
        }
        if (frei >= 0) f = frei;
        else doppelt[id] = true;      /* mehr Identitäten als Farben → Wiederholung */
      }
      belegt[f] = true;
      farbe[id] = f;
    });
    return { farbe: farbe, doppelt: doppelt };
  }

  function vergleichZeichnen() {
    const wrap = document.getElementById('sb-vergleich');
    if (!wrap) return;
    const spalten = VERGLEICH.spalten || [];
    wrap.style.gridTemplateColumns = '230px repeat(' + Math.max(spalten.length, 1) + ', minmax(230px, 1fr))';

    /* Zeilen = Kartenbezeichnungen, Reihenfolge nach erster Spalte, dann Rest */
    const zeilen = [];
    spalten.forEach(function (sp) {
      (sp.karten || []).forEach(function (k) {
        if (zeilen.indexOf(k.titel) < 0) zeilen.push(k.titel);
      });
    });

    /* Kopfzeile: Ecke + ein Kopf je Segment */
    wrap.appendChild(el('div', { class: 'sb-vergleich__zelle sb-vergleich__ecke' }, [
      el('div', { class: 'sb-vergleich__ecke-titel' }, ['Karten']),
      el('div', { class: 'sb-vergleich__ecke-unter' }, [zeilen.length + ' Kartenbezeichnungen'])
    ]));
    spalten.forEach(function (sp) {
      const felder = (sp.karten || []).reduce(function (n, k) { return n + (k.felder || []).length; }, 0);
      wrap.appendChild(el('div', { class: 'sb-vergleich__zelle sb-vergleich__kopf', 'data-sb-kopf': sp.segmentId }, [
        el('div', { class: 'sb-vergleich__kopfzeile' }, [
          el('span', { class: 'sb-vergleich__id' }, [sp.segmentId]),
          el('span', { class: 'sb-vergleich__meta' }, [(sp.karten || []).length + ' Karten · ' + felder + ' Felder'])
        ]),
        el('div', { class: 'sb-vergleich__titel' }, [sp.kurz || sp.titel])
      ]));
    });

    /* Je Kartenbezeichnung eine Zeile. Die Farbe hängt an der Karten-Identität
       (Kartenname + Feldmenge): gleiche Karten einer Zeile haben dieselbe Farbe,
       eine Stage-Variante mit anderen Feldern bekommt eine eigene Farbe.
       Die ausführlichen Angaben stehen im Kopf JEDER Karte (Interner Name, Bedingung,
       Stage-Variante) – der Zeilenkopf bleibt deshalb schlank. */
    const ids = [];
    zeilen.forEach(function (titel) {
      spalten.forEach(function (sp) {
        const k = (sp.karten || []).filter(function (x) { return x.titel === titel; })[0];
        if (!k) return;
        const id = k.varianteId || k.titel;
        if (ids.indexOf(id) < 0) ids.push(id);
      });
    });
    const farbInfo = farbenVerteilen(ids);
    const farben = farbInfo.farbe;
    function farbKlasse(id) {
      return 'sb-vergleich__farbe-' + farben[id] +
             (farbInfo.doppelt[id] ? ' sb-vergleich__farbe--doppelt' : '');
    }
    zeilen.forEach(function (titel) {
      const vorhanden = spalten
        .map(function (sp) { return (sp.karten || []).filter(function (k) { return k.titel === titel; })[0]; })
        .filter(Boolean);
      const varianten = [];
      vorhanden.forEach(function (k) {
        const id = k.varianteId || k.titel;
        if (varianten.indexOf(id) < 0) varianten.push(id);
      });
      wrap.appendChild(el('div', {
        class: 'sb-vergleich__zelle sb-vergleich__zeile-kopf ' + farbKlasse(varianten[0])
      }, [
        el('div', { class: 'sb-vergleich__zeilenname' }, [titel]),        el('div', { class: 'sb-vergleich__zeilenmeta' },
          ['in ' + vorhanden.length + ' von ' + spalten.length + ' Segmenten · ' +
           (varianten.length > 1 ? varianten.length + ' Varianten'
                                 : 'überall identisch')])
      ]));
      spalten.forEach(function (sp) {
        const karte = (sp.karten || []).filter(function (k) { return k.titel === titel; })[0];
        if (!karte) {
          wrap.appendChild(el('div', { class: 'sb-vergleich__zelle sb-vergleich__leer' }, ['–']));
          return;
        }
        const karteFarbe = karte.varianteId || karte.titel;
        wrap.appendChild(el('div', {
          class: 'sb-vergleich__zelle sb-vergleich__karte ' + farbKlasse(karteFarbe),
          'data-sb-segment': sp.segmentId,
          'data-sb-variante': karte.varianteId || karte.titel
        }, [
          el('div', { class: 'hs-card' }, [HS.abschnitt(Object.assign({}, karte, { zu: false }))])
        ]));
      });
    });

    /* Fusszeile: pro Segment eine Eigenschaft ergänzen (auch in leere Karten) */
    wrap.appendChild(el('div', { class: 'sb-vergleich__zelle sb-vergleich__zeile-kopf' }, ['Ergänzen']));
    spalten.forEach(function (sp) {
      const kartenListe = (window.SB_KARTEN || {})[String(CFG.objektIntern || '').toLowerCase()] || [];
      const knopf = el('button', { class: 'sb-feld-add sb-feld-add--ende', type: 'button',
                                   title: 'Eigenschaft in eine wählbare Karte dieses Segments legen' },
                       ['+ Eigenschaft hinzufügen']);
      knopf.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (pickerFuerSegment) pickerFuerSegment(sp.segmentId, kartenListe[0]);
      });
      wrap.appendChild(el('div', { class: 'sb-vergleich__zelle', 'data-sb-segment': sp.segmentId }, [knopf]));
    });
  }
  if (IST_VERGLEICH) { vergleichZeichnen(); } else { HS.renderView(CFG); }

  /* --------------------------------------------------------- 3. Änderungs-Marker */
  function markerSetzen() {
    aenderungen.forEach(function (a) {
      if (!a.ziel) return;
      const zielEl = document.querySelector('[data-sb-id="' + a.ziel + '"]');
      if (!zielEl) {
        console.warn('Marker-Ziel nicht gefunden: ' + a.ziel);
        return;
      }
      zielEl.classList.add('sb-mark-target', 'sb-markiert');
      const istFeld = zielEl.getAttribute('data-sb-typ') === 'feld';
      if (istFeld) zielEl.classList.add('sb-mark-feld');
      /* Mehrere Vorschläge zur selben Karte: Marker nebeneinander statt übereinander */
      const vorher = Number(zielEl.dataset.sbMarker || 0);
      zielEl.dataset.sbMarker = vorher + 1;
      const btn = el('button', {
        class: 'sb-mark' + (!istFeld && vorher ? ' sb-mark--gestapelt' + Math.min(vorher, 3) : ''),
        title: a.nr + ' · ' + a.titel,
        text: String(a.nr)
      });
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        drawerOeffnen();
        const zeile = document.querySelector('[data-sb-nr="' + a.nr + '"]');
        if (zeile) zeile.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      zielEl.appendChild(btn);
      a._el = btn;
    });
    statusFarben();
  }

  function statusFarben() {
    aenderungen.forEach(function (a) {
      if (!a._el) return;
      a._el.className = 'sb-mark' + (a.status ? ' sb-status-' + a.status : '');
    });
    const offen = aenderungen.filter(function (a) { return !a.status; }).length;
    zaehler.textContent = String(offen);
    zaehler.title = offen + ' von ' + aenderungen.length + ' Änderungen noch ohne Rückmeldung';
  }

  /* --------------------------------------------------------------- 4. Drawer */
  const drawerKoerper = el('div', { class: 'sb-drawer__koerper' });

  const drawer = el('aside', { class: 'sb-drawer', id: 'sb-drawer', 'aria-hidden': 'true' }, [
    el('div', { class: 'sb-drawer__kopf' }, [
      el('h2', {}, ['Änderungsliste · Abnahme']),
      el('span', { class: 'hs-card__spacer' }),
      el('button', { class: 'sb-btn', style: 'border-color:#cbd6e2;color:#33475b;background:#fff', id: 'sb-drawer-zu' }, ['Schliessen'])
    ]),
    drawerKoerper,
    el('div', { class: 'sb-drawer__fuss' }, [
      el('button', { class: 'sb-btn sb-btn--primaer', id: 'sb-export', title: 'Abnahme als JSON-Datei speichern' }, ['JSON speichern']),
      el('button', { class: 'sb-btn', id: 'sb-kopieren', title: 'Zusammenfassung als Text in die Zwischenablage kopieren' }, ['Text kopieren']),
      el('button', { class: 'sb-btn', id: 'sb-reset', title: 'Alle Rückmeldungen zurücksetzen' }, ['Zurücksetzen'])
    ])
  ]);
  document.body.appendChild(drawer);

  function drawerZeichnen() {
    drawerKoerper.innerHTML = '';
    if (!aenderungen.length) {
      drawerKoerper.appendChild(el('p', { class: 'sb-leer' }, [
        'Für diese Ansicht sind keine Änderungen markiert. In der Konfiguration unter "aenderungen" ergänzen.'
      ]));
      return;
    }
    aenderungen.forEach(function (a) {
      const kar = el('div', { class: 'sb-eintrag' + (a.status ? ' sb-eintrag--' + a.status : ''), datensbnr: String(a.nr) });
      kar.setAttribute('data-sb-nr', String(a.nr));
      kar.appendChild(el('div', { class: 'sb-eintrag__kopf' }, [
        el('span', { class: 'sb-eintrag__nr' }, [String(a.nr)]),
        el('div', { class: 'sb-eintrag__titel' }, [a.titel])
      ]));
      if (a.text) kar.appendChild(el('p', { class: 'sb-eintrag__text' }, [a.text]));
      if (a.ziel) kar.appendChild(el('div', { class: 'sb-eintrag__ziel' }, ['Sichtbar bei: ' + a.ziel]));

      kar.appendChild(el('p', { class: 'sb-eintrag__frage' }, ['Rückmeldung Backoffice:']));
      const btns = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
        statusBtn(a, 'ok', '✓ passt so'),
        statusBtn(a, 'aendern', '✎ Änderung nötig'),
        statusBtn(a, 'nein', '✗ streichen'),
        statusBtn(a, '', '○ offen')
      ]);
      kar.appendChild(btns);
      const kom = el('textarea', { class: 'sb-kommentar', placeholder: 'Kommentar / Wunsch …', style: 'margin-top:8px' });
      kom.value = a.kommentar;
      kom.addEventListener('change', function () { a.kommentar = kom.value; merken(); });
      kom.addEventListener('input', function () { a.kommentar = kom.value; });
      kar.appendChild(kom);
      drawerKoerper.appendChild(kar);
    });
  }

  function statusBtn(a, status, label) {
    const b = el('button', {
      class: 'sb-statusbtn' + (status ? ' sb-statusbtn--' + status : '') + (a.status === status ? ' sb-statusbtn--aktiv' : ''),
      text: label
    });
    b.addEventListener('click', function () {
      a.status = a.status === status ? '' : status;
      merken(); statusFarben(); drawerZeichnen();
    });
    return b;
  }

  function drawerOeffnen() {
    drawer.classList.add('sb-drawer--offen');
    drawer.setAttribute('aria-hidden', 'false');
    drawerZeichnen();
  }
  function drawerSchliessen() {
    drawer.classList.remove('sb-drawer--offen');
    drawer.setAttribute('aria-hidden', 'true');
  }

  klick('sb-abnahme-btn', function () {
    drawer.classList.contains('sb-drawer--offen') ? drawerSchliessen() : drawerOeffnen();
  });
  klick('sb-drawer-zu', drawerSchliessen);

  /* ------------------------------------------------------------- 5. Exportieren */
  function hinweis(text) {
    let t = document.querySelector('.sb-hinweis');
    if (!t) { t = el('div', { class: 'sb-hinweis' }); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('sb-hinweis--an');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('sb-hinweis--an'); }, 2200);
  }

  const STUFEN = { ok: 'passt so', aendern: 'Änderung nötig', nein: 'streichen', '': 'offen' };
  const SYMBOL = { ok: '✓', aendern: '✎', nein: '✗', '': '○' };

  function zusammenfassung() {
    let s = '# Abnahme: ' + (CFG.titel || '') + '\n';
    s += 'Ansicht: ' + (CFG.objekt || '') + ' · Datei: ' + (CFG.datei || '') + '\n';
    s += 'Stand: ' + new Date().toLocaleString('de-CH') + '\n\n';
    aenderungen.forEach(function (a) {
      s += SYMBOL[a.status] + ' ' + a.nr + '. ' + a.titel + ' — ' + STUFEN[a.status] + '\n';
      if (a.text) s += '   Vorschlag: ' + a.text + '\n';
      if (a.kommentar) s += '   Kommentar: ' + a.kommentar + '\n';
    });
    return s;
  }

  klick('sb-export', function () {
    const daten = {
      ansicht: CFG.titel || '',
      objekt: CFG.objekt || '',
      datei: CFG.datei || '',
      exportiert: new Date().toISOString(),
      aenderungen: aenderungen.map(function (a) {
        return { nr: a.nr, titel: a.titel, vorschlag: a.text, status: a.status || 'offen', kommentar: a.kommentar };
      })
    };
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'abnahme-' + (CFG.datei || 'ansicht') + '.json' });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    hinweis('Abnahme als JSON exportiert');
  });

  klick('sb-kopieren', function () {
    const text = zusammenfassung();
    function fallback() {
      const ta = el('textarea', { style: 'position:fixed;left:-9999px' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else { fallback(); }
    hinweis('Zusammenfassung in die Zwischenablage kopiert');
  });

  klick('sb-reset', function () {
    aenderungen.forEach(function (a) { a.status = ''; a.kommentar = ''; });
    merken(); statusFarben(); drawerZeichnen(); hinweis('Rückmeldungen zurückgesetzt');
  });

  /* ------------------------------------------------------- 6. Schalter & Tasten */
  const markerSchalter = document.getElementById('sb-marker-schalter');
  function markerSichtbar(an) {
    document.body.classList.toggle('sb-marker-aus', !an);
    document.querySelectorAll('.sb-mark').forEach(function (m) { m.style.display = an ? '' : 'none'; });
    markerSchalter.checked = an;
  }
  markerSchalter.addEventListener('change', function () { markerSichtbar(markerSchalter.checked); });

  const cleanBtn = document.getElementById('sb-clean-btn');
  cleanBtn.addEventListener('click', function () {
    document.body.classList.add('sb-clean');
    barHoeheSetzen();
    hinweis('Screenshot-Modus · Taste C bringt die Leiste zurück');
  });

  /* Fokus-Modus: mittlere und rechte Spalte leicht ausblenden, damit der Blick
     auf der linken Spalte bleibt (Standard: an, Taste F schaltet um). Gilt auch im
     Pur-Modus – dort ist die Leiste ausgeblendet, die Taste F wirkt trotzdem. */
  const fokusSchalter = document.getElementById('sb-fokus-schalter');
  function fokusSetzen(an) {
    document.body.classList.toggle('sb-fokus', an);
    if (fokusSchalter) fokusSchalter.checked = an;
  }
  fokusSetzen(true);
  if (fokusSchalter) {
    fokusSchalter.addEventListener('change', function () { fokusSetzen(fokusSchalter.checked); });
  }

  /* Bedingungen/Angaben unter dem Kartentitel ein- und ausblenden.
     Standard: **aus** – die Standard-Ansicht ist aufgeräumt; Taste B zeigt die Angaben
     (interner Name, Bedingung, Stage-Variante). Der Zustand wird im Browser gemerkt. */
  const bedingungSchalter = document.getElementById('sb-bedingung-schalter');
  const BEDINGUNG_KEY = 'wenurse-sandbox-bedingungen';
  function bedingungenZeigen(an) {
    document.body.classList.toggle('sb-ohne-bedingung', !an);
    if (bedingungSchalter) bedingungSchalter.checked = an;
    try { localStorage.setItem(BEDINGUNG_KEY, an ? 'an' : 'aus'); } catch (e) { /* egal */ }
  }
  let bedingungenAn = false;
  try { bedingungenAn = localStorage.getItem(BEDINGUNG_KEY) === 'an'; } catch (e) { /* egal */ }
  bedingungenZeigen(bedingungenAn);
  if (bedingungSchalter) {
    bedingungSchalter.addEventListener('change', function () { bedingungenZeigen(bedingungSchalter.checked); });
  }

  /* Karten auf-/zuklappen (nützlich bei Ansichten mit vielen Karten) */
  let alleOffen = false;
  function kartenKlappen(offen) {
    alleOffen = offen;
    document.querySelectorAll('.hs-abschnitt').forEach(function (s) {
      s.classList.toggle('hs-abschnitt--zu', !offen);
    });
    document.getElementById('sb-klappen-btn').classList.toggle('sb-btn--aktiv', offen);
  }
  document.getElementById('sb-klappen-btn').addEventListener('click', function () {
    kartenKlappen(!alleOffen);
  });

  document.getElementById('sb-druck-btn').addEventListener('click', function () { window.print(); });

  /* ------------------------------------------- 6b. Felder: Auswahl & Reihenfolge */
  let feldmodus = function () { };      /* wird unten gesetzt, wenn bearbeitbar */
  if (CFG.reihenfolgeExport) {
    let gezogen = null;
    let geaendert = false;
    const neueFelder = [];              /* vom Nutzer ergänzte Eigenschaften */
    const entfernteFelder = [];         /* vom Nutzer entfernte Eigenschaften */

    function felderZiehbar(behaelter) {
      behaelter.querySelectorAll('.hs-feld').forEach(function (feld) {
        if (!feld.dataset.intern) return;
        feld.setAttribute('draggable', 'true');
        feld.classList.add('sb-ziehbar');

        feld.addEventListener('dragstart', function (e) {
          gezogen = feld;
          feld.classList.add('sb-zieht');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', feld.dataset.intern); } catch (err) { /* egal */ }
          }
        });
        feld.addEventListener('dragend', function () {
          feld.classList.remove('sb-zieht');
          gezogen = null;
        });
        feld.addEventListener('dragover', function (e) {
          if (!gezogen || gezogen === feld || gezogen.parentNode !== feld.parentNode) return;
          e.preventDefault();
          const kasten = feld.getBoundingClientRect();
          const danach = (e.clientY - kasten.top) > kasten.height / 2;
          behaelter.insertBefore(gezogen, danach ? feld.nextSibling : feld);
          if (!geaendert) { geaendert = true; markiereGeaendert(); }
        });
      });
    }

    function markiereGeaendert() {
      document.getElementById('sb-reihenfolge-btn').classList.add('sb-btn--aktiv');
      hinweis('Reihenfolge geändert – jetzt mit «Reihenfolge ↓» speichern und ins Excel einlesen');
    }

    /* Pfeil-Knöpfe: funktionieren mit jeder Maus und auch auf dem Touchpad */
    function knopf(beschriftung, titel, beiKlick) {
      const b = el('button', { class: 'sb-verschieben__knopf', title: titel, 'aria-label': titel },
                   [beschriftung]);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        beiKlick();
        markiereGeaendert();
      });
      return b;
    }

    function pfeileAnbringen(feld) {
      const label = feld.querySelector('.hs-feld__label');
      if (!label || label.querySelector('.sb-verschieben')) return;
      const behaelter = el('span', { class: 'sb-verschieben' }, [
        knopf('↑', 'Nach oben', function () {
          const vorher = feld.previousElementSibling;
          if (vorher) feld.parentNode.insertBefore(feld, vorher);
        }),
        knopf('↓', 'Nach unten', function () {
          const nachher = feld.nextElementSibling;
          if (nachher) feld.parentNode.insertBefore(nachher, feld);
        })
      ]);
      label.appendChild(behaelter);
    }

    document.querySelectorAll('.hs-abschnitt').forEach(function (karte) {
      karte.querySelectorAll('.hs-felder').forEach(function (behaelter) {
        felderZiehbar(behaelter);
        behaelter.querySelectorAll('.hs-feld').forEach(pfeileAnbringen);
      });
    });

    function kartenSammeln(wurzel) {
      const karten = [];
      (wurzel || document).querySelectorAll('.hs-abschnitt').forEach(function (karte) {
        const titelEl = karte.querySelector('.hs-abschnitt__titel');
        if (!titelEl) return;
        const titel = titelEl.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
        const felder = [];
        karte.querySelectorAll('.hs-feld').forEach(function (feld) {
          if (feld.dataset.intern) felder.push(feld.dataset.intern);
        });
        if (titel && felder.length) karten.push({ titel: titel, felder: felder });
      });
      return karten;
    }

    function reihenfolgeSammeln() {
      const kopf = { ansicht: CFG.titel, erstellt: new Date().toISOString(),
                     objekt: String(CFG.objektIntern || '') };
      if (IST_VERGLEICH) {
        /* Raster: eine Spalte liegt nicht mehr in EINEM Container, sondern verteilt sich
           über die Zellen der Spalte → je Segment alle [data-sb-segment]-Zellen sammeln. */
        const segmente = [], gesehen = [];
        document.querySelectorAll('.sb-vergleich [data-sb-segment]').forEach(function (zelle) {
          const seg = zelle.getAttribute('data-sb-segment');
          if (!seg || gesehen.indexOf(seg) >= 0) return;
          gesehen.push(seg);
          const karten = [];
          document.querySelectorAll('.sb-vergleich [data-sb-segment="' + seg + '"]')
            .forEach(function (z) {
              kartenSammeln(z).forEach(function (k) {
                const schon = karten.filter(function (x) { return x.titel === k.titel; })[0];
                if (schon) schon.felder = schon.felder.concat(k.felder);
                else karten.push(k);
              });
            });
          segmente.push({
            segment: seg,
            objekt: String(CFG.objektIntern || ''),
            karten: karten,
            hinzugefuegt: neueFelder.filter(function (f) { return f.segment === seg; }),
            entfernt: entfernteFelder.filter(function (f) { return f.segment === seg; })
          });
        });
        return Object.assign({ modus: 'vergleich', gruppe: VERGLEICH.gruppe, datei: CFG.datei,
                               segmente: segmente }, kopf);
      }
      return Object.assign({ segment: CFG.segmentId || CFG.datei, datei: CFG.datei,
                             karten: kartenSammeln(document),
                             hinzugefuegt: neueFelder, entfernt: entfernteFelder }, kopf);
    }

    const EXPORT_NAME = IST_VERGLEICH
      ? 'felder-vergleich-' + String(VERGLEICH.gruppe || CFG.datei).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : 'felder-' + (CFG.segmentId || CFG.datei);

    document.getElementById('sb-reihenfolge-btn').addEventListener('click', function () {
      const text = JSON.stringify(reihenfolgeSammeln(), null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: EXPORT_NAME + '.json' });
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      hinweis('Gespeichert: ' + EXPORT_NAME + '.json');
    });

    const kopierBtn = document.getElementById('sb-reihenfolge-kopie');
    kopierBtn.addEventListener('click', function () {
      const text = JSON.stringify(reihenfolgeSammeln(), null, 2);
      function fallback() {
        const ta = el('textarea', { style: 'position:fixed;left:-9999px' });
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { /* egal */ }
        ta.remove();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(fallback);
      } else { fallback(); }
      hinweis('Feldauswahl als JSON in der Zwischenablage');
    });

    /* ------------------------- 6c. Eigenschaften hinzufügen / entfernen */
    if (CFG.feldBearbeiten) {
      const objektIntern = String(CFG.objektIntern || CFG.objekt || '').toLowerCase();
      const katalog = (window.SB_FELDKATALOG || {})[objektIntern] || [];
      const feldKnopf = document.getElementById('sb-feld-btn');
      /* Auf der Vergleichsseite sind alle Spalten bearbeitbar, sonst nur die linke */
      const editWurzel = document.querySelector('.sb-vergleich') || document.querySelector('.hs-col--links');
      let picker = null;

      /* Sicherung im localStorage: Bearbeitungen sollen ein Neuladen überleben.
         Der JSON-Export ist die Übergabe ans Excel – die Sicherung ist der Notnagel,
         damit ein versehentliches Neuladen die Arbeit nicht wegwirft. */
      const SICHERUNG_KEY = 'wenurse-sandbox-edits:' + CFG.datei;

      function sicherungSchreiben() {
        try {
          if (!neueFelder.length && !entfernteFelder.length) {
            localStorage.removeItem(SICHERUNG_KEY);
            return;
          }
          localStorage.setItem(SICHERUNG_KEY, JSON.stringify(
            { ts: new Date().toISOString(), anzahl: neueFelder.length + entfernteFelder.length,
              stand: reihenfolgeSammeln() }));
        } catch (e) { /* localStorage blockiert oder voll – dann eben ohne Sicherung */ }
      }

      function sicherungLesen() {
        try { return JSON.parse(localStorage.getItem(SICHERUNG_KEY) || 'null'); }
        catch (e) { return null; }
      }

      function segmentVon(karte) {
        const sp = karte.closest('[data-sb-segment]');
        return sp ? sp.getAttribute('data-sb-segment') : (CFG.segmentId || CFG.datei);
      }

      function kartenName(karte) {
        const da = karte.getAttribute('data-sb-karte');
        if (da) return da;
        const t = karte.querySelector('.hs-abschnitt__titel');
        return t ? t.textContent.replace(/\s*\(\d+\)\s*$/, '').trim() : '';
      }

      function knopfAktualisieren() {
        const n = neueFelder.length + entfernteFelder.length;
        if (feldKnopf) {
          feldKnopf.textContent = n ? 'Felder ändern (' + n + ')' : 'Felder ändern';
          feldKnopf.classList.toggle('sb-btn--aktiv', n > 0);
        }
        sicherungSchreiben();
      }

      /* Zahl in der Kartenüberschrift («Einsatz-Kern (9)») nachziehen */
      function zaehlerImTitel(karte) {
        const n = karte.querySelectorAll('.hs-feld').length;
        const zahl = karte.querySelector('.hs-karte__zahl');
        if (zahl) { zahl.textContent = '(' + n + ')'; return; }
        const t = karte.querySelector('.hs-abschnitt__titel');
        if (!t) return;
        const text = t.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
        t.textContent = text + ' (' + n + ')';
      }

      function loeschKnopfAnbringen(feld, segment, kartenname) {
        if (feld.querySelector('.sb-feld-weg')) return;
        const b = el('button', { class: 'sb-feld-weg', type: 'button',
                                 title: 'Eigenschaft aus dieser Ansicht entfernen (bleibt im Feldkatalog)' },
                     ['×']);
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          const karte = feld.closest('.hs-abschnitt');
          entfernteFelder.push({ segment: segment, karte: kartenname, intern: feld.dataset.intern });
          feld.remove();
          if (karte) zaehlerImTitel(karte);
          knopfAktualisieren();
        });
        feld.appendChild(b);
      }

      function feldEinsetzen(segment, kartenname, eintrag) {
        const ziel = kartenElement(segment, kartenname);
        if (ziel) {
          const f = el('div', { class: 'hs-feld hs-feld--neu', datensbtyp: 'feld', 'data-intern': eintrag.n }, [
            el('div', { class: 'hs-feld__label' }, [eintrag.l]),
            el('div', { class: 'hs-feld__wert' }, ['–'])
          ]);
          ziel.behaelter.insertBefore(f, ziel.add || null);
          pfeileAnbringen(f);
          felderZiehbar(ziel.behaelter);
          loeschKnopfAnbringen(f, segment, kartenname);
          const karte = f.closest('.hs-abschnitt');
          if (karte) zaehlerImTitel(karte);
        }
        neueFelder.push({ segment: segment, karte: kartenname, intern: eintrag.n, label: eintrag.l });
        knopfAktualisieren();
        if (!ziel) {
          hinweis(eintrag.l + ' → ' + segment + ', Karte «' + kartenname + '» vorgemerkt. '
            + 'Die Karte erscheint, sobald die Auswahl im Excel eingelesen ist.');
        }
      }

      /* Alle Karten eines Segments – auf der Vergleichsseite liegen sie in mehreren
         Rasterzellen, deshalb über alle Zellen des Segments sammeln. */
      function kartenImSegment(segment) {
        if (!segment) {
          return Array.prototype.slice.call((editWurzel || document).querySelectorAll('.hs-abschnitt'));
        }
        let alle = [];
        document.querySelectorAll('[data-sb-segment="' + segment + '"]').forEach(function (zelle) {
          alle = alle.concat(Array.prototype.slice.call(zelle.querySelectorAll('.hs-abschnitt')));
        });
        return alle;
      }

      function kartenElement(segment, kartenname) {
        let treffer = null;
        kartenImSegment(segment).forEach(function (karte) {
          if (treffer) return;
          if (kartenName(karte) !== kartenname) return;
          const behaelter = karte.querySelector('.hs-felder');
          if (behaelter) treffer = { behaelter: behaelter, add: karte.querySelector('.sb-feld-add') };
        });
        return treffer;
      }

      function pickerSchliessen() {
        if (picker) { picker.remove(); picker = null; }
      }

      function pickerOeffnen(segment, startKarte) {
        pickerSchliessen();
        const kartenListe = (window.SB_KARTEN || {})[objektIntern] || [];
        const zielWahl = el('select', { class: 'sb-picker__karte', title: 'Zielkarte wählen' },
          kartenListe.map(function (n) {
            return el('option', { value: n, selected: n === startKarte ? true : null }, [n]);
          }));
        if (startKarte && kartenListe.indexOf(startKarte) < 0) {
          zielWahl.appendChild(el('option', { value: startKarte, selected: true }, [startKarte]));
        }
        let zielKarte = zielWahl.value || startKarte;

        /* interne Namen → Karte, über die ganze Spalte des Segments (verhindert
           Dubletten: eine Eigenschaft steht nur in einer Karte der Ansicht) */
        function felderImSegment() {
          const drin = {};
          kartenImSegment(segment).forEach(function (karte) {
            const name = kartenName(karte);
            karte.querySelectorAll('.hs-feld').forEach(function (f) {
              if (f.dataset.intern) drin[f.dataset.intern] = name;
            });
          });
          neueFelder.forEach(function (f) {
            if (f.segment === segment) drin[f.intern] = f.karte;
          });
          return drin;
        }

        function feldVerschieben(intern, vonKarte) {
          const quelle = kartenElement(segment, vonKarte);
          if (!quelle) return;
          quelle.behaelter.querySelectorAll('.hs-feld').forEach(function (f) {
            if (f.dataset.intern !== intern) return;
            const karte = f.closest('.hs-abschnitt');
            f.remove();
            if (karte) zaehlerImTitel(karte);
          });
          neueFelder.forEach(function (f) {
            if (f.segment === segment && f.intern === intern) f.karte = zielKarte;
          });
        }

        const suche = el('input', { class: 'sb-picker__suche', type: 'search',
          placeholder: 'Eigenschaft suchen – Anzeigename, interner Name oder HubSpot-Gruppe' });
        const liste = el('div', { class: 'sb-picker__liste' });
        const fuss = el('div', { class: 'sb-picker__fuss' });

        function zeichnen() {
          const q = suche.value.trim().toLowerCase();
          const drin = felderImSegment();
          liste.innerHTML = '';
          const treffer = katalog.filter(function (e) {
            if (drin[e.n] === zielKarte) return false;      /* steht schon in dieser Karte */
            return !q || (e.l + ' ' + (e.nl || '') + ' ' + e.n + ' ' + e.g).toLowerCase().indexOf(q) >= 0;
          });
          fuss.textContent = treffer.length + ' von ' + katalog.length + ' Eigenschaften für «' +
            zielKarte + '»' + (q ? ' · gefiltert' : '') +
            ' · «in …» bedeutet: steht in einer anderen Karte und wird dorthin verschoben';
          if (!treffer.length) {
            liste.appendChild(el('div', { class: 'sb-picker__leer' }, ['Keine passende Eigenschaft gefunden.']));
            return;
          }
          treffer.slice(0, 500).forEach(function (e) {
            const zeile = el('button', { class: 'sb-picker__zeile', type: 'button' }, [
              el('span', { class: 'sb-picker__label' }, [e.nl || e.l]),
              el('span', { class: 'sb-picker__intern' }, [e.n]),
              e.g ? el('span', { class: 'sb-picker__gruppe' }, [e.g]) : null,
              e.nl && e.nl !== e.l ? el('span', { class: 'sb-picker__abzeichen sb-picker__abzeichen--neu' },
                                        ['bisher: ' + e.l]) : null,
              drin[e.n] ? el('span', { class: 'sb-picker__abzeichen sb-picker__abzeichen--andere' },
                             ['in «' + drin[e.n] + '»'])
                : e.a ? el('span', { class: 'sb-picker__abzeichen' }, ['in Auswahl'])
                      : el('span', { class: 'sb-picker__abzeichen sb-picker__abzeichen--neu' }, ['neu'])
            ]);
            zeile.addEventListener('click', function () {
              const alt = drin[e.n];
              if (alt && alt !== zielKarte) {
                feldVerschieben(e.n, alt);
                hinweis('«' + e.l + '» von «' + alt + '» nach «' + zielKarte + '» verschoben');
              }
              feldEinsetzen(segment, zielKarte, e);
              zeichnen();
            });
            liste.appendChild(zeile);
          });
        }
        suche.addEventListener('input', zeichnen);
        zielWahl.addEventListener('change', function () { zielKarte = zielWahl.value; zeichnen(); });

        const zu = el('button', { class: 'sb-picker__zu', type: 'button', title: 'Schliessen (Esc)' }, ['×']);
        zu.addEventListener('click', pickerSchliessen);

        const box = el('div', { class: 'sb-picker' }, [
          el('div', { class: 'sb-picker__kopf' }, [
            el('div', {}, [
              el('div', { class: 'sb-picker__titel' }, ['Eigenschaft hinzufügen']),
              el('div', { class: 'sb-picker__unter' }, ['Klick auf eine Zeile legt sie in die gewählte Karte'])
            ]),
            zu
          ]),
          zielWahl,
          suche,
          liste,
          fuss
        ]);
        picker = el('div', { class: 'sb-picker-huelle' }, [box]);
        picker.addEventListener('click', function (e) { if (e.target === picker) pickerSchliessen(); });
        document.body.appendChild(picker);
        zeichnen();
        suche.focus();
      }

      if (editWurzel) {
        editWurzel.querySelectorAll('.hs-abschnitt').forEach(function (karte) {
          const behaelter = karte.querySelector('.hs-felder');
          if (!behaelter) return;
          const kartenname = kartenName(karte);
          const segment = segmentVon(karte);
          karte.querySelectorAll('.hs-feld').forEach(function (f) { loeschKnopfAnbringen(f, segment, kartenname); });
          const add = el('button', { class: 'sb-feld-add', type: 'button',
                                     title: 'Eigenschaft aus dem Feldkatalog in diese Karte aufnehmen' },
                         ['+ Feld hinzufügen']);
          add.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            pickerOeffnen(segment, kartenname);
          });
          behaelter.appendChild(add);
        });
        /* Zusätzlicher Knopf am Ende jeder Spalte: Eigenschaft in eine (auch leere) Karte legen.
           Auf der Vergleichsseite übernimmt das die Fusszeile des Rasters
           (vergleichZeichnen) – hier also NICHT nochmal anbauen. */
        const kartenListe = (window.SB_KARTEN || {})[objektIntern] || [];
        const spalten = editWurzel.classList.contains('sb-vergleich')
          ? []
          : [editWurzel];
        if (kartenListe.length) {
          spalten.forEach(function (spalte) {
            const segment = spalte.getAttribute('data-sb-segment') || CFG.segmentId || CFG.datei;
            const addEnde = el('button', { class: 'sb-feld-add sb-feld-add--ende', type: 'button',
                                           title: 'Eigenschaft in eine beliebige Karte dieses Segments legen' },
                               ['+ Eigenschaft hinzufügen (Karte wählbar)']);
            addEnde.addEventListener('click', function (e) {
              e.preventDefault(); e.stopPropagation();
              pickerOeffnen(segment, kartenListe[0]);
            });
            spalte.appendChild(addEnde);
          });
        }
      }

      pickerFuerSegment = pickerOeffnen;      /* für die Fusszeile der Vergleichsseite */

      /* --------------------------------- Sicherung wiederherstellen (Notnagel) */
      function standEinheiten(stand) {
        return (stand && stand.modus === 'vergleich')
          ? (stand.segmente || [])
          : [{ segment: CFG.segmentId || CFG.datei, karten: (stand && stand.karten) || [] }];
      }

      /* Was würde das Wiederherstellen der Sicherung ändern? (leer = Ansicht ist aktuell) */
      function standDiff(stand) {
        const plan = [];
        standEinheiten(stand).forEach(function (e) {
          (e.karten || []).forEach(function (k) {
            const ziel = kartenElement(e.segment, k.titel);
            if (!ziel) return;                       /* Karte in dieser Ansicht nicht vorhanden */
            const ist = [];
            ziel.behaelter.querySelectorAll('.hs-feld').forEach(function (f) {
              if (f.dataset.intern) ist.push(f.dataset.intern);
            });
            k.felder.forEach(function (intern) {
              if (ist.indexOf(intern) < 0) plan.push({ art: 'neu', e: e, k: k, intern: intern });
            });
            ist.forEach(function (intern) {
              if (k.felder.indexOf(intern) < 0) plan.push({ art: 'weg', e: e, k: k, intern: intern });
            });
            const sollReihe = k.felder.filter(function (x) { return ist.indexOf(x) >= 0; });
            const istReihe = ist.filter(function (x) { return k.felder.indexOf(x) >= 0; });
            if (sollReihe.join('|') !== istReihe.join('|')) plan.push({ art: 'ordnung', e: e, k: k });
          });
        });
        return plan;
      }

      function standAnwenden(stand) {
        const plan = standDiff(stand);
        plan.filter(function (p) { return p.art === 'weg'; }).forEach(function (p) {
          const feld = kartenElement(p.e.segment, p.k.titel);
          if (!feld) return;
          feld.behaelter.querySelectorAll('.hs-feld').forEach(function (f) {
            if (f.dataset.intern !== p.intern) return;
            const karte = f.closest('.hs-abschnitt');
            f.remove();
            if (karte) zaehlerImTitel(karte);
            entfernteFelder.push({ segment: p.e.segment, karte: p.k.titel, intern: p.intern });
          });
        });
        plan.filter(function (p) { return p.art === 'neu'; }).forEach(function (p) {
          const eintrag = katalog.filter(function (x) { return x.n === p.intern; })[0]
                          || { n: p.intern, l: p.intern };
          feldEinsetzen(p.e.segment, p.k.titel, eintrag);
        });
        standEinheiten(stand).forEach(function (e) {
          (e.karten || []).forEach(function (k) {
            const ziel = kartenElement(e.segment, k.titel);
            if (!ziel) return;
            k.felder.forEach(function (intern) {          /* Reihenfolge der Sicherung */
              const f = ziel.behaelter.querySelector('.hs-feld[data-intern="' + intern + '"]');
              if (f) ziel.behaelter.insertBefore(f, ziel.add || null);
            });
          });
        });
        knopfAktualisieren();
        hinweis(plan.length + ' Änderung(en) aus der Sicherung übernommen – bitte «Felder ↓» exportieren');
      }

      const sicherung = sicherungLesen();
      if (sicherung && sicherung.stand && feldKnopf && feldKnopf.parentNode) {
        const anzahl = standDiff(sicherung.stand).length;
        if (anzahl) {
          const zeit = new Date(sicherung.ts || Date.now())
            .toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
          const b = el('button', { class: 'sb-btn sb-btn--aktiv', id: 'sb-edits-btn', type: 'button',
            title: 'Nicht exportierte Bearbeitung dieser Ansicht wiederherstellen («×»-Entfernungen und '
                 + 'neu hinzugefügte Eigenschaften)' },
            ['Bearbeitung von ' + zeit + ' übernehmen (' + anzahl + ')']);
          feldKnopf.parentNode.insertBefore(b, feldKnopf.nextSibling);
          b.addEventListener('click', function () {
            feldmodus(true);
            standAnwenden(sicherung.stand);
            b.remove();
          });
        }
      }

      /* Beim Verlassen/Neuladen warnen, solange etwas nicht exportiert ist */
      window.addEventListener('beforeunload', function (e) {
        if (neueFelder.length + entfernteFelder.length) { e.preventDefault(); e.returnValue = ''; }
      });

      feldmodus = function (an) {
        document.body.classList.toggle('sb-feldmodus', an);
        if (an) kartenKlappen(true);          /* alle Karten offen, damit alles sichtbar ist */
        else pickerSchliessen();
        knopfAktualisieren();
        hinweis(an ? 'Bearbeiten aktiv · «×» entfernt ein Feld, «+ Feld hinzufügen» öffnet den Feldkatalog'
                   : 'Bearbeiten beendet');
      };

      if (feldKnopf) {
        feldKnopf.addEventListener('click', function () {
          feldmodus(!document.body.classList.contains('sb-feldmodus'));
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') pickerSchliessen();
      });
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      document.body.classList.toggle('sb-clean');
      barHoeheSetzen();
    } else if (k === 'm') {
      markerSichtbar(!markerSchalter.checked);
    } else if (k === 'k') {
      kartenKlappen(!alleOffen);
    } else if (k === 'e') {
      feldmodus(!document.body.classList.contains('sb-feldmodus'));
    } else if (k === 'f') {
      fokusSetzen(!fokusSchalter.checked);
    } else if (k === 'b') {
      bedingungenZeigen(document.body.classList.contains('sb-ohne-bedingung'));
    } else if (k === 'd' || k === 'a') {
      drawer.classList.contains('sb-drawer--offen') ? drawerSchliessen() : drawerOeffnen();
    } else if (k === 'escape') {
      drawerSchliessen();
    }
  });

  /* ------------------------------------------------- 7. Fusszeile (Navigation)
     Zeigt am Ende der Seite, wo man ist, und verlinkt die Nachbaransichten der
     Gruppe, den Gruppenvergleich und die Übersicht. Im Pur-Modus ist das die
     einzige Navigation (die Leiste oben ist dort ausgeblendet). */
  function fusszeile() {
    const nav = CFG.nav;
    if (!nav) return;
    const zusatz = PUR ? '?pur=1' : '';

    function link(ziel, text, klasse) {
      return el('a', { href: ziel + zusatz, class: 'sb-fuss__link' + (klasse ? ' ' + klasse : '') },
                [text]);
    }
    const reihe = [];
    if (nav.zurueck) reihe.push(link(nav.zurueck.datei + '.html', '← ' + (nav.zurueck.kurz || nav.zurueck.titel)));
    if (nav.weiter) reihe.push(link(nav.weiter.datei + '.html', (nav.weiter.kurz || nav.weiter.titel) + ' →'));
    if (nav.vergleich) {
      reihe.push(link(nav.vergleich.datei + '.html',
                      '⇄ Gruppenvergleich «' + nav.vergleich.titel + '»', 'sb-fuss__vergleich'));
    }
    if (nav.mitglieder) {
      nav.mitglieder.forEach(function (m) {
        reihe.push(link(m.datei + '.html', m.kurz || m.titel));
      });
    }
    reihe.push(link('../index.html', 'Übersicht'));

    const kopf = [];
    if (nav.gruppe) kopf.push(nav.gruppe);
    if (nav.position) kopf.push(nav.position);
    if (PUR) kopf.push('Freigabe-Ansicht (ohne Bedienelemente)');

    document.body.appendChild(el('footer', { class: 'sb-fuss' }, [
      el('div', { class: 'sb-fuss__ort' }, [kopf.join(' · ')]),
      el('nav', { class: 'sb-fuss__nav' }, reihe)
    ]));
  }

  /* ------------------------------------------------------------------ 8. Start */
  if (!IST_VERGLEICH) { markerSetzen(); drawerZeichnen(); }
  fusszeile();
})();

/* ============================================================================
   hubspot.js — baut die HubSpot-Record-Ansicht aus einem Config-Objekt.
   Reines DOM-Rendering, keine Abhängigkeiten, läuft per Doppelklick (file://).
   Einstiegspunkt:  HS.renderView(window.SANDBOX_VIEW)
   ============================================================================ */
window.HS = (function () {
  'use strict';

  /* ------------------------------------------------------------------ Icons */
  const ICONS = {
    chevronLeft:  '<path d="M15 5l-7 7 7 7"/>',
    chevronRight: '<path d="M9 5l7 7-7 7"/>',
    chevronDown:  '<path d="M6 9.5l6 6 6-6"/>',
    chevronUp:    '<path d="M6 14.5l6-6 6 6"/>',
    kebab:        '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    zahnrad:      '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
    notiz:        '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    email:        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 7.4l8.4 5.8 8.4-5.8"/>',
    anruf:        '<path d="M4 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4A16 16 0 014 4z"/>',
    aufgabe:      '<path d="M4 6.5l2 2 3-3M4 15l2 2 3-3M13 7.5h7M13 16h7"/>',
    meeting:      '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
    mehr:         '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
    extern:       '<path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 14.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h3.5"/>',
    suche:        '<circle cx="11" cy="11" r="6.2"/><path d="M20 20l-4.6-4.6"/>',
    plus:         '<path d="M12 5.5v13M5.5 12h13"/>',
    haken:        '<path d="M5 12.8l4.2 4.2L19 7.4"/>',
    schliessen:   '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    person:       '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.6-3.6 4-5.2 7-5.2s5.4 1.6 7 5.2"/>',
    firma:        '<path d="M4 21V5a1.2 1.2 0 011.2-1.2h8.6A1.2 1.2 0 0115 5v16"/><path d="M15 10h4.8A1.2 1.2 0 0121 11.2V21"/><path d="M7 8h4M7 12h4M7 16h4M18 15h1M18 18h1"/>',
    deal:         '<path d="M3.5 8.2L12 4.2l8.5 4L12 12.2z"/><path d="M3.5 8.2v7.6L12 19.8l8.5-4V8.2"/>',
    buegel:       '<path d="M8.5 12.5l6-6a3 3 0 114.2 4.2l-8 8a5 5 0 01-7.1-7.1l7-7"/>',
    filter:       '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sort:         '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
    uhr:          '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    kalender:     '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10.5h17M8 3.5v3.5M16 3.5v3.5"/>',
    info:         '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    trend:        '<path d="M4 16.5l5-5 3.5 3.5L20 7.5"/><path d="M20 12V7.5h-4.5"/>',
    datei:        '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
    lupeKiste:    ''
  };

  function svg(name, size) {
    const box = document.createElement('span');
    box.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) +
      '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || ICONS.info) + '</svg>';
    return box.firstChild;
  }

  /* --------------------------------------------------------------- Elemente */
  function anhaengen(node, kinder) {
    if (kinder === null || kinder === undefined || kinder === false) return;
    (Array.isArray(kinder) ? kinder : [kinder]).forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      node.appendChild(
        typeof k === 'string' || typeof k === 'number'
          ? document.createTextNode(String(k))
          : k
      );
    });
  }

  function el(tag, attrs, kinder) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'datensb') n.setAttribute('data-sb-id', v);
        else if (k === 'datensbtyp') n.setAttribute('data-sb-typ', v);
        else n.setAttribute(k, v);
      });
    }
    anhaengen(n, kinder);
    return n;
  }

  /* ------------------------------------------------------------- Werte/Felder */
  function initialen(name) {
    if (!name) return '–';
    return String(name)
      .split(/\s+/)
      .filter(function (w) { return /[A-Za-zÀ-ÿ]/.test(w); })
      .slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); })
      .join('');
  }

  function avatar(o) {
    o = o || {};
    const klassen = ['hs-avatar'];
    if (o.klein) klassen.push('hs-avatar--xs');
    if (o.farbe) klassen.push('hs-avatar--' + o.farbe);
    if (o.initialen) klassen.push('hs-avatar--initialen');
    return el('span', { class: klassen.join(' ') },
      [o.initialen ? o.initialen : svg(o.icon || 'person', o.klein ? 13 : 20)]);
  }

  function wert(f) {
    const w = f.wert;
    if (w === null || w === undefined || w === '') {
      return el('span', { class: 'hs-leer' }, ['–']);
    }
    switch (f.art) {
      case 'token':
        return el('span', { class: 'hs-tokens' },
          [el('span', { class: 'hs-token' }, [w, svg('schliessen', 11)])]);
      case 'tokens':
        return el('span', { class: 'hs-tokens' }, (w || []).map(function (t) {
          return el('span', { class: 'hs-token' }, [t, svg('schliessen', 11)]);
        }));
      case 'pill':
        return el('span', { class: 'hs-pill hs-pill--' + (f.farbe || 'teal') }, [w]);
      case 'pillhell':
        return el('span', { class: 'hs-pill hs-pill--hell' }, [w]);
      case 'person':
        return el('span', { class: 'hs-person' },
          [avatar({ klein: true, initialen: initialen(w), farbe: f.avatarFarbe }),
           el('a', { class: 'hs-link', href: '#' }, [w])]);
      case 'link':
        return el('a', { class: 'hs-link', href: f.href || '#' }, [w]);
      case 'meter':
        return el('span', { class: 'hs-meter' }, [
          el('span', { class: 'hs-meter__track' },
            [el('span', { class: 'hs-meter__fill', style: 'width:' + (f.prozent || 0) + '%' })]),
          el('span', {}, [w])
        ]);
      case 'datum':
        return el('span', { class: 'hs-progress__datum' }, [svg('kalender', 14), w]);
      case 'lang':
        return el('span', { class: 'hs-wert--lang' }, [w]);
      default:
        return el('span', {}, [w]);
    }
  }

  function feld(f) {
    return el('div', {
      class: 'hs-feld' + (f.breit ? ' hs-feld--breit' : ''),
      datensb: f.sbId,
      datensbtyp: 'feld',
      'data-intern': f.intern          /* interner HubSpot-Name, für Reihenfolge-Export */
    }, [
      el('div', { class: 'hs-feld__label' }, [
        f.label,
        /* Künftiger Name aus dem Datenmodell: heutiger Name klein daneben */
        f.labelHeute ? el('span', { class: 'hs-feld__umbenannt', title: 'heutiger Name in HubSpot' },
                          ['bisher: ' + f.labelHeute]) : null
      ]),
      el('div', { class: 'hs-feld__wert' }, [wert(f)])
    ]);
  }

  function felderGrid(felder, spalten) {
    return el('div', { class: 'hs-felder hs-felder--' + (spalten || 2) }, (felder || []).map(feld));
  }

  /* ---------------------------------------------------------------- Abschnitte */
  /* Info-Zeilen (Label + Wert) – strukturiert unter dem Kartentitel statt Fliesstext */
  function infoZeilen(zeilen) {
    const box = el('div', { class: 'hs-karte__info' });
    (zeilen || []).forEach(function (z) {
      if (!z || !z.w) return;
      box.appendChild(el('span', { class: 'hs-karte__info-k' }, [z.k]));
      box.appendChild(el('span', { class: 'hs-karte__info-w' }, [z.w]));
    });
    return box.childNodes.length ? box : null;
  }

  /* Varianten-Block: gilt nur für eine Stage (Hilfseigenschaft «Layout-Kontext») */
  function varianteBlock(v) {
    return el('div', { class: 'hs-karte__variante' }, [
      el('div', { class: 'hs-karte__variante-kopf' }, [v.kopf || 'Stage-Variante'])
    ].concat([infoZeilen(v.zeilen)]));
  }

  function abschnittKopf(titel, klein, a) {
    const zusatz = [];
    zusatz.push(el(klein ? 'h4' : 'h3', { class: 'hs-abschnitt__titel' }, [titel]));
    /* Anzahl der Felder – eigener Span, damit die Sandbox ihn nachziehen kann */
    if (a && typeof a.anzahl === 'number') {
      zusatz.push(el('span', { class: 'hs-karte__zahl' }, ['(' + a.anzahl + ')']));
    }
    /* Altbestand (vor der strukturierten Info): interner Name inline */
    if (a && a.intern && !a.info) {
      zusatz.push(el('span', { class: 'hs-karte__intern', title: 'interner Kartenname in HubSpot' },
                     ['(' + a.intern + ')']));
    }
    const kopf = el('div', { class: 'hs-abschnitt__kopf' }, [
      svg('chevronDown', klein ? 15 : 16)
    ].concat(zusatz).concat([
      el('button', { class: 'hs-iconbtn', title: 'Abschnittsoptionen', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
    ]).concat(a && a.kartenId ? [
      /* Interner Kartenname (HubSpot) – immer sichtbar, klein unter dem Titel */
      el('div', { class: 'hs-abschnitt__karteid', title: 'interner Kartenname in HubSpot' },
         [a.kartenId])
    ] : []));
    /* Angaben zur Karte klein und strukturiert unter dem Namen */
    if (a && (a.info || a.bedingung || a.stage_treu || a.variante)) {
      const meta = el('div', { class: 'hs-karte__meta' });
      if (a.info) {
        meta.appendChild(infoZeilen(a.info));
      } else {                                  /* Altbestand: Fliesstext */
        if (a.bedingung) meta.appendChild(el('div', {}, ['Bedingung: ' + a.bedingung]));
        if (a.stage_treu) meta.appendChild(el('div', { class: 'hs-karte__meta--treu' }, [a.stage_treu]));
      }
      if (a.variante) meta.appendChild(varianteBlock(a.variante));
      kopf.appendChild(meta);
    }
    kopf.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      kopf.parentNode.classList.toggle('hs-abschnitt--zu');
    });
    return kopf;
  }

  function abschnitt(a) {
    const sec = el('section', {
      class: 'hs-abschnitt' + (a.zu ? ' hs-abschnitt--zu' : ''),
      datensb: a.sbId,
      datensbtyp: 'abschnitt',
      'data-sb-karte': a.karte || null
    }, [
      abschnittKopf(a.titel, false, a)
    ]);
    /* In der linken Record-Karte stehen die Eigenschaften untereinander
       (eine pro Zeile) – so wie in HubSpot. Mehr Spalten nur auf Wunsch. */
    if (a.felder) sec.appendChild(felderGrid(a.felder, a.spalten || 1));
    (a.abschnitte || []).forEach(function (u) {
      sec.appendChild(el('div', { class: 'hs-abschnitt-unter', datensb: u.sbId }, [
        abschnittKopf(u.titel, true),
        u.felder ? felderGrid(u.felder, u.spalten || 1) : null,
        u.text ? el('p', { class: 'hs-wert--lang', style: 'padding:0 12px 14px;margin:0' }, [u.text]) : null
      ]));
    });
    return sec;
  }

  /* --------------------------------------------------------------------- Karten */
  function karteMitKopf(titel, koerper, opt) {
    opt = opt || {};
    const card = el('div', { class: 'hs-card', datensb: opt.sbId, datensbtyp: opt.typ || 'karte' });
    if (titel) {
      card.appendChild(el('div', { class: 'hs-card__kopf' }, [
        svg('chevronDown', 16),
        el('h4', { class: 'hs-card__titel' }, [titel]),
        opt.rechts || null,
        opt.menu === false ? null
          : el('button', { class: 'hs-iconbtn', title: 'Kartenoptionen', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
      ]));
    }
    card.appendChild(el('div', { class: 'hs-card__koerper' }, [koerper]));
    return card;
  }

  function karte(k) {
    switch (k.typ) {

      case 'felder':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          k.titel
            ? el('div', { class: 'hs-card__kopf' }, [
                svg('chevronDown', 16),
                el('h4', { class: 'hs-card__titel' }, [k.titel]),
                k.rechts || null,
                el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
              ])
            : null,
          el('div', { class: k.titel ? 'hs-card__koerper' : '', style: k.titel ? '' : 'padding:12px' },
            [felderGrid(k.felder, k.spalten)])
        ]);

      case 'text':
        return karteMitKopf(k.titel, el('p', { class: 'hs-wert--lang', style: 'margin:0' }, [k.text]), k);

      case 'leer':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          k.titel
            ? el('div', { class: 'hs-card__kopf' }, [
                el('h4', { class: 'hs-card__titel' }, [k.titel]),
                el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
              ])
            : null,
          el('div', { class: 'hs-leerbox' }, [
            el('div', { class: 'hs-leerbox__bild' }, [illustration()]),
            el('p', {}, [k.text])
          ])
        ]);

      /* Deal-Progression (Start-/Enddatum + Balken) */
      case 'progression':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          el('div', { class: 'hs-card__kopf' }, [
            el('h4', { class: 'hs-card__titel' }, [k.titel]),
            el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
          ]),
          el('div', { class: 'hs-card__koerper' }, [
            el('div', { class: 'hs-progress' }, [
              el('div', { class: 'hs-progress__zeile' }, [
                el('div', {}, [
                  el('div', { class: 'hs-feld__label' }, [k.start.label]),
                  el('div', { class: 'hs-feld__wert' }, [el('span', { class: 'hs-progress__datum' }, [svg('kalender', 14), k.start.wert])])
                ]),
                el('div', { style: 'text-align:right' }, [
                  el('div', { class: 'hs-feld__label' }, [k.ende.label]),
                  el('div', { class: 'hs-feld__wert' }, [el('span', { class: 'hs-progress__datum' }, [svg('kalender', 14), k.ende.wert])])
                ])
              ]),
              el('div', { class: 'hs-progress__bar' }, [
                el('div', { class: 'hs-progress__fill', style: 'width:' + (k.fuellung || 0) + '%' })
              ]),
              el('div', { class: 'hs-progress__werte' }, (k.werte || []).map(function (w) {
                return el('div', {}, w);
              }))
            ])
          ])
        ]);

      /* Deal-Stage-Tracker */
      case 'tracker':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          k.titel
            ? el('div', { class: 'hs-card__kopf' }, [
                el('h4', { class: 'hs-card__titel' }, [k.titel]),
                el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
              ])
            : null,
          el('div', { class: 'hs-card__koerper' }, [
            el('div', { class: 'hs-tracker-kopf' }, [
              el('span', {}, [svg('uhr', 16)]),
              el('span', {}, ['Deal stage:']),
              el('span', { class: 'hs-pill hs-pill--' + (k.stageFarbe || 'gruen') }, [k.stage]),
              k.dauer ? el('span', {}, ['for ' + k.dauer]) : null
            ]),
            el('div', { class: 'hs-stagebar' }, (k.segmente || []).map(function (s) {
              return el('div', { class: 'hs-stagebar__seg' + (s.zustand ? ' hs-stagebar__seg--' + s.zustand : '') },
                [s.check ? el('span', { class: 'hs-stagebar__check' }, [svg('haken', 11)]) : null]);
            })),
            k.felder ? felderGrid(k.felder, k.spalten || 4) : null
          ])
        ]);

      /* Lead Score */
      case 'score':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          el('div', { class: 'hs-card__kopf' }, [
            svg('chevronDown', 16),
            el('h4', { class: 'hs-card__titel' }, [k.titel])
          ]),
          el('div', { class: 'hs-card__koerper' }, [
            k.badge ? el('div', { style: 'margin-bottom:10px' }, [el('span', { class: 'hs-pill hs-pill--hell' }, [k.badge])]) : null,
            el('div', { class: 'hs-score' }, [
              el('div', {}, [
                el('div', { class: 'hs-score__gross' }, [String(k.wert)]),
                k.delta ? el('div', { class: 'hs-score__delta' }, [svg('trend', 14), k.delta]) : null
              ]),
              el('div', { class: 'hs-score__liste' }, (k.zeilen || []).map(function (z) {
                return el('div', { class: 'hs-score__row' }, [el('span', {}, [z.label]), el('span', {}, [z.wert])]);
              }))
            ]),
            k.link ? el('div', { style: 'margin-top:10px' }, [el('a', { class: 'hs-link', href: '#' }, [k.link])]) : null
          ])
        ]);

      /* Lead-Stager-Tracker */
      case 'leadStager':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          el('div', { class: 'hs-card__kopf' }, [
            svg('chevronDown', 16),
            el('h4', { class: 'hs-card__titel' }, [k.titel]),
            k.tag ? el('span', { class: 'hs-pill hs-pill--hell', style: 'margin-left:auto' }, [k.tag]) : null,
            el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('kebab', 16)])
          ]),
          el('div', { class: 'hs-card__koerper' }, [
            felderGrid(k.felder, 1),
            el('div', { class: 'hs-tracker-leiste' }, [
              el('div', { class: 'hs-tracker-leiste__bar' }, [
                el('div', { class: 'hs-tracker-leiste__fill', style: 'width:' + (k.fuellung || 15) + '%' })
              ]),
              k.leisteText ? el('span', { class: 'hs-tracker-leiste__txt' }, [k.leisteText]) : null
            ])
          ])
        ]);

      /* Assoziations-Liste (Companies / Contacts / Deals) */
      case 'liste':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          el('div', { class: 'hs-aso__kopf' }, [
            el('h4', { class: 'hs-aso__titel' }, [k.titel + (k.anzahl !== undefined ? ' (' + k.anzahl + ')' : '')]),
            el('div', { class: 'hs-aso__tools' }, [
              k.add
                ? el('button', { class: 'hs-aso__add' }, [svg('plus', 14), 'Add'])
                : null,
              el('button', { class: 'hs-iconbtn', 'aria-label': 'Optionen' }, [svg('zahnrad', 16)])
            ])
          ]),
          k.suchen
            ? el('div', { class: 'hs-aso__filterzeile' }, [
                el('label', { class: 'hs-suche' }, [svg('suche', 15), el('input', { type: 'text', placeholder: 'Suchen' })]),
                el('span', { class: 'hs-card__spacer' }),
                el('button', { class: 'hs-btn' }, [svg('filter', 14), 'Filters']),
                el('button', { class: 'hs-btn' }, [svg('sort', 14), 'Sort'])
              ])
            : null,
          (k.eintraege && k.eintraege.length)
            ? el('div', { class: 'hs-aso__liste' }, k.eintraege.map(eintrag))
            : el('div', { class: 'hs-leerbox', style: 'padding:18px 16px' }, [
                el('div', { class: 'hs-leerbox__bild' }, [illustration(true)]),
                el('p', {}, [k.leerText || 'Keine Einträge'])
              ]),
          k.alleLink
            ? el('a', { class: 'hs-aso__fuss', href: '#' }, [k.alleLink, svg('extern', 14)])
            : null
        ]);

      /* Anhänge */
      case 'anhaenge':
        return el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' }, [
          el('div', { class: 'hs-aso__kopf' }, [
            svg('chevronDown', 16),
            el('h4', { class: 'hs-aso__titel' }, [k.titel || 'Attachments']),
            el('div', { class: 'hs-aso__tools' }, [
              el('button', { class: 'hs-aso__add' }, ['Add ', svg('chevronDown', 13)])
            ])
          ]),
          el('div', { class: 'hs-card__koerper' }, [
            el('div', {
              class: 'hs-leerbox',
              style: 'border:1px dashed var(--hs-border-2);border-radius:6px;padding:20px 14px'
            }, [
              el('div', { class: 'hs-leerbox__bild' }, [svg('buegel', 26)]),
              el('p', {}, [k.text || 'Dateien hierher ziehen — oder klicken zum Hochladen'])
            ])
          ])
        ]);

      /* Activity-Feed */
      case 'feed':
        return el('div', { datensb: k.sbId, datensbtyp: 'feed' }, (k.gruppen || []).map(function (g) {
          return el('div', {}, [
            el('div', { class: 'hs-feed__gruppe' }, [g.titel]),
            el('div', {}, (g.eintraege || []).map(activity))
          ]);
        }));

      /* Gruppierter Abschnitt in der Mitte (Überschrift + Karten darunter) */
      case 'gruppe':
        return el('section', { class: 'hs-abschnitt hs-abschnitt--mitte', datensb: k.sbId, datensbtyp: 'gruppe' }, [
          abschnittKopf(k.titel),
          el('div', { class: 'hs-gruppe__inhalt' }, (k.karten || []).map(karte))
        ]);

      case 'html':
        const box = el('div', { class: 'hs-card', datensb: k.sbId, datensbtyp: 'karte' });
        box.innerHTML = k.html || '';
        return box;

      default:
        return el('div', { class: 'hs-card' }, [el('div', { class: 'hs-card__koerper' }, ['Unbekannter Kartentyp: ' + k.typ])]);
    }
  }

  /* --------------------------------------------------------- Assoziations-Eintrag */
  function eintrag(e) {
    const card = el('div', { class: 'hs-eintrag', datensb: e.sbId });

    card.appendChild(el('div', { class: 'hs-eintrag__kopf' }, [
      avatar({ klein: true, icon: e.icon || 'person', initialen: e.initialen || null, farbe: e.farbe }),
      el('div', { style: 'flex:1 1 auto;min-width:0' }, [
        el('div', { class: 'hs-eintrag__titel' }, [e.titel]),
        el('div', { class: 'hs-eintrag__zeilen' }, (e.zeilen || []).map(function (z) {
          return el('div', {}, [el('b', {}, [z[0]]), ' ', z[1]]);
        }))
      ])
    ]));

    if (e.labels && e.labels.length) {
      card.appendChild(el('div', { class: 'hs-eintrag__labels' }, e.labels.map(function (l) {
        return el('span', { class: 'hs-label-chip' }, [typeof l === 'string' ? l : l.text]);
      })));
    }
    if (e.dealKarte) {
      card.appendChild(el('div', { class: 'hs-eintrag__sep' }));
      card.appendChild(el('div', { class: 'hs-eintrag__zeile-oben' }, [
        el('span', { class: 'hs-pill hs-pill--grau' }, ['Deal Stage: ' + e.dealKarte.stage, svg('chevronDown', 12)])
      ]));
      card.appendChild(el('div', { class: 'hs-eintrag__zeilen' }, (e.dealKarte.zeilen || []).map(function (z) {
        return el('div', {}, [el('b', {}, [z[0]]), ' ', z[1]]);
      })));
      if (e.dealKarte.fuss) {
        card.appendChild(el('div', { class: 'hs-eintrag__sep' }));
        card.appendChild(el('div', { class: 'hs-eintrag__labels' }, [
          el('span', { class: 'hs-pill hs-pill--hell' }, [e.dealKarte.fuss])
        ]));
      }
    }
    return card;
  }

  /* -------------------------------------------------------------- Activity-Feed */
  const ACTIVITY_ICON = {
    email: 'email', incoming: 'email', notiz: 'notiz', anruf: 'anruf',
    aufgabe: 'aufgabe', meeting: 'meeting', datei: 'datei'
  };

  function activity(a) {
    const card = el('article', {
      class: 'hs-activity hs-activity--' + (a.typ || 'notiz') +
        (a.offen === false ? ' hs-activity--zu' : '') +
        (a.klasse ? ' ' + a.klasse : ''),
      datensb: a.sbId
    });

    const kopf = el('div', { class: 'hs-activity__kopf' }, [
      svg(ACTIVITY_ICON[a.typ] || 'notiz', 16),
      el('span', { style: 'flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:4px;align-items:center' },
        (a.kopf || []).map(function (seg) {
          return el(seg.stark ? 'b' : 'span', { class: seg.stark ? 'hs-activity__titel' : 'hs-activity__meta' }, [seg.t]);
        })),
      el('span', { class: 'hs-activity__zeit' }, [
        a.statusPunkt ? el('span', { class: 'hs-dot hs-dot--' + a.statusPunkt }) : null,
        a.zeit,
        svg('chevronDown', 14)
      ])
    ]);
    kopf.addEventListener('click', function () { card.classList.toggle('hs-activity--zu'); });
    card.appendChild(kopf);

    const koerper = el('div', { class: 'hs-activity__koerper' }, (a.koerper || []).map(function (p) {
      return typeof p === 'string' ? el('p', {}, [p]) : p;
    }));
    if (a.koerper && a.koerper.length) card.appendChild(koerper);

    if (a.aufgabe) {
      card.appendChild(el('div', { class: 'hs-activity__koerper', style: 'display:flex;gap:8px;align-items:flex-start' }, [
        el('span', { class: 'hs-checkbox' + (a.erledigt ? ' hs-checkbox--fertig' : '') }, [svg('haken', 11)]),
        el('span', { style: 'color:var(--hs-text)' }, [a.aufgabe])
      ]));
    }

    if (a.fuss) {
      card.appendChild(el('div', { class: 'hs-activity__fuss' }, a.fuss.map(function (f) {
        return el('span', { class: 'hs-activity__stat' }, [
          f.punkt ? el('span', { class: 'hs-dot hs-dot--' + f.punkt }) : null,
          f.label ? f.label + ': ' : null,
          f.wert ? el('b', {}, [f.wert]) : null,
          f.text || null,
          f.link ? el('a', { class: 'hs-link hs-activity__link', href: '#' }, [f.link]) : null
        ]);
      })));
    }
    return card;
  }

  /* ---------------------------------------------------------------- Illustration */
  function illustration(klein) {
    return el('div', { html:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 104" width="' + (klein ? 74 : 118) + '" height="' + (klein ? 55 : 88) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M34 40l36-13 36 13-36 13z" opacity=".85"/>' +
      '<path d="M34 40v30l36 13 36-13V40" opacity=".55"/>' +
      '<path d="M70 53v30" opacity=".35"/>' +
      '<circle cx="98" cy="72" r="15" fill="currentColor" opacity=".18"/>' +
      '<circle cx="98" cy="72" r="15"/>' +
      '<path d="M109 83l10 10"/>' +
      '</svg>' });
  }

  /* ------------------------------------------------------------------ Spalten */
  function linkeSpalte(cfg) {
    const sp = el('div', { class: 'hs-col hs-col--links' });
    const card = el('div', { class: 'hs-card' });

    card.appendChild(el('div', { class: 'hs-recordkopf' }, [
      el('a', { class: 'hs-recordkopf__zurueck', href: '#' }, [svg('chevronLeft', 16), cfg.zurueck || 'Zurück']),
      el('span', { class: 'hs-card__spacer' }),
      el('button', { class: 'hs-actions-btn' }, ['Actions', svg('chevronDown', 14)]),
      el('button', { class: 'hs-iconbtn', title: 'Erweitern', 'aria-label': 'Erweitern' }, [svg('extern', 16)])
    ]));

    const ident = cfg.identitaet || {};
    card.appendChild(el('div', { class: 'hs-ident' }, [
      el('div', { class: 'hs-ident__zeile' }, [
        avatar(ident.avatar || {}),
        el('div', { style: 'flex:1 1 auto;min-width:0' }, [
          el('h1', { class: 'hs-ident__name' }, [ident.name]),
          ident.unter ? el('div', { class: 'hs-ident__unter' }, [ident.unter]) : null,
          (ident.badges && ident.badges.length)
            ? el('div', { class: 'hs-ident__badges' }, ident.badges.map(function (b) {
                return el('span', { class: 'hs-pill hs-pill--' + (b.farbe || 'hell') }, [b.text]);
              }))
            : null
        ])
      ])
    ]));

    if (cfg.aktionen) {
      const NAMEN = { Note: 'Note', Email: 'Email', Call: 'Call', Task: 'Task', Meeting: 'Meeting', More: 'More' };
      card.appendChild(el('div', { class: 'hs-aktionen' }, cfg.aktionen.map(function (a) {
        const key = NAMEN[a] || a;
        const icon = { Note: 'notiz', Email: 'email', Call: 'anruf', Task: 'aufgabe', Meeting: 'meeting', More: 'mehr' }[key] || 'mehr';
        return el('button', { class: 'hs-aktionen__item', title: a }, [svg(icon, 20), el('span', {}, [a])]);
      })));
    }

    ((cfg.links && cfg.links.karten) || cfg.karten || []).forEach(function (k) {
      if (k.typ === 'abschnitt') card.appendChild(abschnitt(k));
      else sp.appendChild(karte(k));
    });

    sp.insertBefore(card, sp.firstChild);
    return sp;
  }

  function mittelSpalte(cfg) {
    const sp = el('div', { class: 'hs-col hs-col--mitte' });
    const m = cfg.mitte || {};

    if (m.tabs) {
      sp.appendChild(el('nav', { class: 'hs-tabs' }, m.tabs.map(function (t, i) {
        const label = typeof t === 'string' ? t : t.text;
        const aktiv = (m.aktivTab || m.tabs[0]) === (typeof t === 'string' ? t : t.text);
        return el('a', { class: 'hs-tab' + (aktiv ? ' hs-tab--aktiv' : ''), href: '#' }, [label]);
      }).concat([
        el('span', { class: 'hs-card__spacer' }),
        el('button', { class: 'hs-tab', style: 'display:inline-flex;gap:5px;align-items:center' }, [svg('zahnrad', 14), 'Customize'])
      ])));
    }

    if (m.subTabs) {
      sp.appendChild(el('div', { class: 'hs-subtabs' }, m.subTabs.map(function (t) {
        return el('a', { class: 'hs-subtab' + (t === m.aktivSubTab ? ' hs-subtab--aktiv' : ''), href: '#' }, [t]);
      })));
    }

    if (m.leiste) {
      sp.appendChild(el('div', { class: 'hs-filterzeile' }, [
        m.leiste.suche ? el('label', { class: 'hs-suche' }, [svg('suche', 15), el('input', { type: 'text', placeholder: 'Suchen' })]) : null,
        el('span', { class: 'hs-card__spacer' }),
        m.leiste.rechts ? el('a', { class: 'hs-link', href: '#', style: 'font-size:13px' }, [m.leiste.rechts]) : null
      ]));
      if (m.leiste.chips) {
        sp.appendChild(el('div', { class: 'hs-filterzeile' }, m.leiste.chips.map(function (c) {
          return el('button', { class: 'hs-chip' + (c.klar ? ' hs-chip--klar' : '') },
            [c.text, c.x ? svg('schliessen', 12) : null, c.pfeil ? svg('chevronDown', 12) : null]);
        })));
      }
    }

    (m.karten || []).forEach(function (k) { sp.appendChild(karte(k)); });

    if (m.chrome) sp.appendChild(m.chrome);
    return sp;
  }

  function rechteSpalte(cfg) {
    const sp = el('div', { class: 'hs-col hs-col--rechts' });
    const r = cfg.rechts || {};
    if (r.titel) {
      sp.appendChild(el('div', { class: 'hs-card' }, [
        el('div', { class: 'hs-summary__kopf' }, [
          svg('chevronDown', 16),
          el('h2', { class: 'hs-summary__titel' }, [r.titel]),
          el('span', { class: 'hs-card__spacer' }),
          r.badge ? el('span', { class: 'hs-btn hs-btn--primaer', style: 'padding:2px 8px;font-size:11px' }, [r.badge]) : null
        ])
      ]));
    }
    (r.karten || []).forEach(function (k) { sp.appendChild(karte(k)); });
    return sp;
  }

  /* ------------------------------------------------------------------- Ausgabe */
  function renderView(cfg) {
    const app = document.getElementById('hs-app');
    if (!app) return;
    app.innerHTML = '';
    app.appendChild(linkeSpalte(cfg));
    app.appendChild(mittelSpalte(cfg));
    app.appendChild(rechteSpalte(cfg));
  }

  return {
    renderView: renderView,
    el: el,
    svg: svg,
    karte: karte,
    abschnitt: abschnitt,
    feld: feld,
    felderGrid: felderGrid,
    activity: activity,
    eintrag: eintrag,
    avatar: avatar,
    initialen: initialen,
    illustration: illustration
  };
})();

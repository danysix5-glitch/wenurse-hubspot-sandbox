/* ============================================================================
   beispiele.js — gemeinsame Bausteine für die aus HubSpot erzeugten Ansichten
   (views/hubspot-kontakt.html, hubspot-unternehmen.html)

   Diese Aktivitäten sind erfunden. Sie füllen in der Vorschau die mittlere
   Spalte, damit die Ansicht realistisch aussieht. Wer sie ändert, ändert sie
   in allen Ansichten, die sie benutzen.
   ============================================================================ */
window.SB_BEISPIELE = {

  /* Aktivitäten-Feed Kontakt (Bewerbung / Lead) */
  feedKontakt: {
    typ: 'feed',
    sbId: 'feed',
    gruppen: [
      {
        titel: 'Upcoming',
        eintraege: [
          {
            typ: 'aufgabe',
            kopf: [{ t: 'Task' }, { t: 'assigned to' }, { t: 'Rita Beispiel', stark: true }],
            zeit: 'Fällig 24. Sep. 2026 08:00',
            aufgabe: 'Feedback erhalten? Sonst auf Absage stellen.'
          }
        ]
      },
      {
        titel: 'September 2026',
        eintraege: [
          {
            typ: 'email',
            kopf: [{ t: 'Email tracking' }, { t: 'Kurze Rückmeldung zu deinem Interesse bei WeNurse', stark: true }],
            zeit: '21. Sep. 2026 14:52',
            statusPunkt: 'grau',
            fuss: [{ punkt: 'gruen', label: 'Opens', wert: '1' }, { label: 'Clicks', wert: '0' }]
          },
          {
            typ: 'incoming',
            kopf: [{ t: 'Incoming email – Re: Kurze Rückmeldung zu deinem Interesse bei WeNurse from' },
                   { t: 'Anna Bewerberin', stark: true }],
            zeit: '21. Sep. 2026 14:51',
            koerper: [
              'Hallo Daniel',
              'Vielen Dank für deine Nachfrage. Ich habe Interesse, mehr über WeNurse zu erfahren, nur fehlt mir leider gerade die Zeit dafür. Ich melde mich in den nächsten Wochen wieder bei dir.'
            ]
          },
          {
            typ: 'email',
            kopf: [{ t: 'Email – Kurze Rückmeldung zu deinem Interesse bei WeNurse from' },
                   { t: 'Rita Beispiel', stark: true }],
            zeit: '21. Sep. 2026 10:25',
            statusPunkt: 'gruen',
            koerper: [
              'Hallo Anna Bewerberin',
              'Vielen Dank für dein Interesse an WeNurse – wir haben uns sehr über deine Kontaktaufnahme gefreut.',
              'Damit wir deine Bewerbung richtig einordnen können: In welchem Pensum und ab wann könntest du dir einen Einsatz vorstellen?'
            ],
            fuss: [{ punkt: 'gruen', label: 'Opens', wert: '1' }, { label: 'Clicks', wert: '0' }]
          },
          {
            typ: 'anruf',
            kopf: [{ t: 'Logged call – No answer' }, { t: 'Rita Beispiel', stark: true }],
            zeit: '21. Sep. 2026 10:24',
            koerper: ['3. Call – tel. scheint ausgeschaltet zu sein, heisst «Zielnummer zurzeit nicht erreichbar» – Mail gesendet.']
          },
          {
            typ: 'meeting',
            offen: false,
            kopf: [{ t: 'Meeting' }, { t: 'Telefoninterview', stark: true }],
            zeit: '24. Sep. 2026 08:00'
          }
        ]
      }
    ]
  },

  /* Aktivitäten-Feed Unternehmen (Institution) */
  feedUnternehmen: {
    typ: 'feed',
    sbId: 'feed',
    gruppen: [
      {
        titel: 'September 2023',
        eintraege: [
          {
            typ: 'notiz',
            klasse: 'hs-activity--pinned',
            kopf: [{ t: 'Note by' }, { t: 'Daniel Hassemer', stark: true }],
            zeit: '22. Sep. 2023 15:44',
            koerper: ['Wichtige Informationen bezüglich Deals:'],
            fuss: [{ text: 'Angepinnt' }]
          }
        ]
      },
      {
        titel: 'Januar 2024',
        eintraege: [
          {
            typ: 'notiz',
            kopf: [{ t: 'Note by' }, { t: 'Daniel Hassemer', stark: true }],
            zeit: '31. Jan. 2024 09:02',
            koerper: ['Tel. mit der Institution: Bedarf für zwei weitere Einsätze ab März, Entscheid nach der Budgetrunde.']
          }
        ]
      },
      {
        titel: 'Dezember 2023',
        eintraege: [
          {
            typ: 'incoming',
            kopf: [{ t: 'Incoming email – AW: [EXTERN] Einsatzplanung from' },
                   { t: 'Beatrice Beispiel', stark: true }],
            zeit: '19. Dez. 2023 09:57',
            koerper: ['Guten Tag', 'Herzlichen Dank, dann ist es wie besprochen. Wir melden uns nach der internen Klärung.']
          },
          {
            typ: 'email',
            kopf: [{ t: 'Email – AW: [EXTERN] Einsatzplanung from' }, { t: 'Daniel Hassemer', stark: true }],
            zeit: '19. Dez. 2023 09:00',
            statusPunkt: 'gruen',
            koerper: ['Guten Tag Frau Beispiel', 'Herzlichen Dank für die zusätzliche Planung. Die Unterlagen sind im Anhang.'],
            fuss: [{ punkt: 'gruen', label: 'Opens', wert: '11' }, { label: 'Clicks', wert: '0' }]
          },
          {
            typ: 'email',
            offen: false,
            kopf: [{ t: 'Email – AW: [EXTERN] Einsatzplanung from' }, { t: 'Beatrice Beispiel', stark: true }],
            zeit: '19. Dez. 2023 08:58'
          }
        ]
      }
    ]
  }
};

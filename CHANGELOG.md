# Changelog — Gestione Spese

## v7.2.6 — Correzione installazione PWA
- Corretto il pulsante **Installa Gestione Spese** nelle Impostazioni.
- Su iPhone e iPad il pulsante mostra una guida passo passo per aggiungere l'app alla schermata Home.
- Su browser compatibili mantiene l'installazione nativa tramite `beforeinstallprompt`.
- Aggiunta una procedura di fallback quando il browser non espone il comando di installazione.

## v7.2.5 — PWA installabile e aggiornamenti affidabili
- Manifest PWA rifinito con identificativo, modalità standalone e metadati dedicati.
- Aggiunta installazione guidata dalle Impostazioni.
- Il pulsante `+` mobile apre una scelta tra Spesa, Entrata e Ricorrente.
- Service Worker aggiornato con cache versionata e strategia più affidabile per rilevare gli aggiornamenti pubblicati.
- Mantenuto il funzionamento offline dei file statici.
- Aggiornati i riferimenti della versione a 7.2.5.

## v7.2.4 — Ottimizzazione comandi mobile
- Rimossi dal layout mobile i pulsanti rapidi Spesa, Entrata e Ricorrente.
- Mantenuti i comandi rapidi nella versione desktop.
- Il pulsante centrale `+` della navigazione mobile diventa il punto unico per aggiungere entrate, spese e ricorrenze.
- Ridotto lo spazio occupato dai comandi nella parte superiore della Home su smartphone e tablet.

## v7.2.3 — Correzione menu mobile
- Corretto il menu inferiore su smartphone e tablet.
- Navigazione mobile resa indipendente dall'inizializzazione delle altre funzioni dell'app.
- Corretto il passaggio tra Home, Analisi, Movimenti e Altro.
- Corretto il pulsante centrale `+` per aggiungere una spesa.
- La sezione selezionata viene aperta dall'inizio senza mantenere il dashboard fisso.
- Aggiornato il Service Worker alla v7.2.3.

## v7.2.2 — Correzione navigazione mobile
- Corretto il menu inferiore su smartphone e tablet.
- La navigazione mobile ora cambia correttamente sezione usando lo stesso sistema della versione desktop.
- Corretto il problema per cui le sezioni nascoste non potevano essere raggiunte tramite `scrollIntoView`.
- La barra di navigazione mantiene correttamente lo stato attivo.
- La nuova sezione viene aperta dall'inizio senza mantenere il dashboard fisso durante lo scorrimento.

## v7.2.1 — Ottimizzazione mobile
- Nuova disposizione dei comandi rapidi.
- Corrette sovrapposizioni e problemi di layout.
- Navigazione mobile migliorata.
- Supporto Safe Area per iPhone e iPad.
- Grafici e card adattati agli schermi piccoli.
- Migliorata la tipografia mobile.

## v7.2.0 — Smartphone, tablet e PWA
- Interfaccia responsive per smartphone e tablet.
- Navigazione mobile con barra inferiore.
- Pulsante rapido per aggiungere una transazione.
- Supporto PWA installabile su dispositivi compatibili.
- Service Worker per uso più affidabile con connettività intermittente.
- Icone PWA dedicate.
- Versione Windows Electron mantenuta.

## v7.1.0 — Backup automatici e sicurezza dei dati
- Backup automatico all'avvio.
- Conservazione degli ultimi 15 backup.
- Ripristino completo dei dati.
- Gestione backup dalle Impostazioni.
- Apertura della cartella dei backup.
- Icona personalizzata dell'app.

## v7.0.0 — Finanza personale avanzata
- Dashboard **Oggi** con saldo, entrate, spese e prossimo movimento.
- **Previsione di fine mese** basata sui dati locali.
- **Patrimonio netto** con disponibilità, risparmi e debiti.
- **Gestione abbonamenti** con costo mensile e annuale.
- **Gestione debiti e finanziamenti** con residuo, rata e progresso.
- **Archivio ricevute/documenti** con immagini salvate localmente.
- **Report mensile stampabile/PDF**.
- Analisi e statistiche mantenute dalla v6.
- Nessun server: dati locali nel browser.

## v6.0.0 — Gestione finanziaria completa
- Aggiunti **conti e portafogli** con saldo separato.
- Aggiunti **obiettivi di risparmio** con progresso e scadenza.
- Aggiunta **analisi finanziaria avanzata** con confronti mensili, medie e tasso di risparmio.
- Aggiunto **calendario finanziario**.
- Aggiunti **avvisi intelligenti** per budget, mesi negativi e ricorrenze imminenti.
- Aggiunte **categorie personalizzabili** per entrate e spese.
- Ricorrenze estese a frequenza **settimanale, mensile e annuale**.
- Aggiunto **PIN locale** e blocco automatico dell'app.
- Mantenuti import/export JSON e backup automatici locali.
- Migliorata la dashboard con indicatori, grafici e insight.
- Tutti i dati restano nel browser: nessun server e nessun account.

## v5.3.1 — Pulizia interfaccia
- Rimossa definitivamente la vecchia scritta/link blu flottante in basso a destra.
- Rifiniture del tema chiaro e della tipografia.

## v5.3.0 — Rifinitura tema chiaro
- Rimossa la scritta **Changelog** flottante in basso a destra.
- Migliorata la palette della modalità chiara con colori più morbidi e coerenti.
- Migliorato il font con **Inter** e titoli in **Plus Jakarta Sans**.
- Migliorati contrasto, gerarchia tipografica, ombre e pulsanti.
- Versione aggiornata a **v5.3.0**.

## v5.2.0 — Changelog integrato e branding
- Changelog integrato direttamente nella GUI, senza nuove finestre.
- Logo SVG unico nella testata e favicon dedicata alla scheda del browser.
- Corretta la duplicazione del logo.
- Versione corrente aggiornata a v5.2.0.
- Migliorata la forma e la posizione dei pulsanti principali.

## v5.1.0 — Correzioni interfaccia
- Corretto il **doppio logo** nella testata.
- Corretto il **Changelog sovrapposto**: ora è un normale footer, senza elementi flottanti.
- Corretta la **modalità scura** con palette dedicata per sfondo, pannelli, testi, input, pulsanti, card e modali.
- Migliorato il contrasto in modalità scura.

## v5.0.0 — Restyling grafico
- Nuova identità visiva con palette indaco, verde, corallo e ambra.
- Aggiunto un **logo dedicato** in formato SVG, completamente locale.
- Dashboard con card più leggibili e gerarchia visiva migliorata.
- Sidebar, pulsanti, modali, input e transazioni ridisegnati.
- Aggiunti effetti hover e micro-interazioni leggere.
- Migliorato il contrasto visivo tra entrate, spese, saldo e budget.
- Sfondo e pannelli aggiornati con un look più moderno senza dipendenze esterne.
- Layout mobile mantenuto e rifinito.

## v4.0.0 — Miglioramenti e ricorrenze
- Aggiunto il supporto alle **spese ricorrenti** oltre alle entrate ricorrenti.
- Aggiunto il pulsante rapido **+ Entrata** nella barra superiore.
- Aggiunto il **filtro per mese** nella sezione Transazioni.
- I filtri possono essere combinati con ricerca, tipo e categoria.
- Migliorata la gestione delle ricorrenze e della generazione automatica delle transazioni.
- Aggiunta la migrazione automatica dei dati delle versioni precedenti.
- Mantenuti i **backup automatici locali**.
- Mantenute le funzioni di **importazione/esportazione JSON**.

## v3.0.0 — Backup e compatibilità
- Introdotto il sistema di dati versionato.
- Aggiunta la migrazione automatica dei dati.
- Aggiunti fino a 5 backup automatici locali.
- Aggiunto il ripristino dell'ultimo backup.
- Migliorata la compatibilità tra aggiornamenti dell'app.

## v2.0.0 — Entrate ricorrenti
- Aggiunte le **entrate ricorrenti mensili**.
- Possibilità di impostare descrizione, importo, giorno, categoria, metodo e data iniziale.
- Generazione automatica delle entrate maturate.
- Possibilità di modificare ed eliminare le ricorrenze.

## v1.0.0 — Prima versione
- Dashboard con saldo, entrate e spese.
- Inserimento delle transazioni.
- Modifica ed eliminazione delle transazioni.
- Categorie e metodi di pagamento.
- Budget mensili.
- Grafici e riepiloghi.
- Salvataggio locale tramite Local Storage.

---

### Note sugli aggiornamenti
I dati vengono salvati localmente nel browser. Prima di aggiornare a una nuova versione è consigliabile usare **Esporta dati** per creare una copia JSON esterna.

Le versioni successive dovrebbero mantenere la compatibilità con i dati delle versioni precedenti tramite il sistema di migrazione interno.

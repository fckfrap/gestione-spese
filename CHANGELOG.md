# Changelog — Gestione Spese

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

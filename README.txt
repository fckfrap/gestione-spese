GESTIONE SPESE v7.3.0

WINDOWS
npm install
npm start
npm run build
Installer: viene generato da npm run build usando la versione definita in package.json.

SMARTPHONE / TABLET
La cartella contiene manifest.json e service-worker.js. La PWA usa una cache versionata e rileva gli aggiornamenti pubblicati.
Per installare la PWA i file devono essere pubblicati su un sito HTTPS.
Android: Chrome > menu > Installa app.
iPhone/iPad: Safari > Condividi > Aggiungi alla schermata Home.

La sincronizzazione automatica tra dispositivi non è ancora attiva.


SINCRONIZZAZIONE CLOUD v7.3.0
Prima dell'uso cloud, aprire supabase-client.js e inserire la publishable/anon key del progetto Supabase. NON inserire mai la service_role key.
L'account permette di sincronizzare conti, transazioni, ricorrenze, budget, obiettivi, abbonamenti, debiti, categorie e storico patrimonio. Il PIN resta locale sul dispositivo.
Le ricevute con immagini restano locali nella prima fase e verranno migrate successivamente su Supabase Storage.

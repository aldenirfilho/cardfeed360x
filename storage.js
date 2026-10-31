/** Images and catalogue live in this browser's IndexedDB; nothing is uploaded. */
const DATABASE = 'cardfeed360x';
const VERSION = 1;
let databasePromise;

export function openDB() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Este navegador não oferece armazenamento local de imagens.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('cards')) {
        const cards = database.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('hash', 'hash', { unique: false });
      }
      if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => { database.close(); databasePromise = undefined; };
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir seu catálogo local.'));
    request.onblocked = () => reject(new Error('Feche outras abas do CardFeed360X e tente novamente.'));
  }).catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}

function completeTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('A alteração não foi salva. Seu catálogo anterior foi preservado.'));
    transaction.onerror = () => {}; // Abort reports the final transaction failure.
  });
}

export async function getCards() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const request = database.transaction('cards', 'readonly').objectStore('cards').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível ler seu catálogo.'));
  });
}

/** All records are committed together. Does not delete records omitted from this batch. */
export async function saveCards(cards) {
  if (!Array.isArray(cards)) throw new Error('Lote de figurinhas inválido.');
  for (const card of cards) {
    if (!card || typeof card.id !== 'string' || !card.id || /^demo(?:[-_:]|$)/i.test(card.id) || card.demo || !(card.blob instanceof Blob)) throw new Error('Não é possível salvar esta figurinha no catálogo pessoal.');
  }
  const database = await openDB();
  const transaction = database.transaction('cards', 'readwrite');
  const completion = completeTransaction(transaction);
  try {
    const store = transaction.objectStore('cards');
    for (const card of cards) {
      const { url, imageUrl, previewUrl, dataUrl, ...record } = card;
      store.put(record);
    }
  } catch (error) {
    transaction.abort();
    await completion.catch(() => {});
    throw error;
  }
  await completion;
}

export async function deleteCard(id) {
  const database = await openDB();
  const transaction = database.transaction('cards', 'readwrite');
  const completion = completeTransaction(transaction);
  transaction.objectStore('cards').delete(id);
  await completion;
}

export async function clearCards() {
  const database = await openDB();
  const transaction = database.transaction('cards', 'readwrite');
  const completion = completeTransaction(transaction);
  transaction.objectStore('cards').clear();
  await completion;
}

/** Settings is an object of keys; only the supplied keys are changed. */
export async function saveSettings(settings) {
  const database = await openDB();
  const transaction = database.transaction('settings', 'readwrite');
  const completion = completeTransaction(transaction);
  const store = transaction.objectStore('settings');
  for (const [key, value] of Object.entries(settings)) store.put({ key, value });
  await completion;
}

export async function getSettings() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const request = database.transaction('settings', 'readonly').objectStore('settings').getAll();
    request.onsuccess = () => resolve(Object.fromEntries(request.result.map(({ key, value }) => [key, value])));
    request.onerror = () => reject(request.error || new Error('Não foi possível ler as preferências.'));
  });
}

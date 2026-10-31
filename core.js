/** Browser-local catalogue helpers. Classification suggests filename topics, not diagnoses. */
export const CATEGORIES = Object.freeze([
  { id: 'cardio', label: 'Cardiologia', color: '#df6471', icon: 'heart' },
  { id: 'pneumo', label: 'Pneumologia', color: '#459bb0', icon: 'lungs' },
  { id: 'neuro', label: 'Neurologia', color: '#a080c8', icon: 'brain' },
  { id: 'renal', label: 'Nefrologia', color: '#df9d61', icon: 'kidney' },
  { id: 'infecto', label: 'Infectologia', color: '#5caa89', icon: 'virus' },
  { id: 'pocus', label: 'POCUS', color: '#5c86ca', icon: 'scan' },
  { id: 'intensiva', label: 'Medicina intensiva', color: '#ba8c55', icon: 'activity' },
  { id: 'outros', label: 'A classificar', color: '#87959a', icon: 'folder' },
]);

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
export const IMAGE_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const categoryIds = new Set(CATEGORIES.map(c => c.id));
const extensions = /\.(png|jpe?g|webp|gif)$/i;

export function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const rules = [
  ['pocus', /\b(pocus|ultrassom|ultrassonografia|ecografia|e-fast|efast|ecocardiograma|ecocardiografia)\b/, ['ultrassom']],
  ['cardio', /\b(cardio\w*|coracao|cardiac\w*|ecg|eletrocardiograma|arritmia\w*|coronaria\w*|infarto|miocardio|hemodinamica)\b/, ['cardiologia']],
  ['pneumo', /\b(pneumo\w*|pulmao|pulmoes|pulmonar|respiratori\w*|ventilacao|ventilador|dpoc|asma|sdra|vni|vmi)\b/, ['respiratório']],
  ['neuro', /\b(neuro\w*|cerebro|cerebral|avc|convuls\w*|encefalo\w*|glasgow|meninge\w*|nervoso)\b/, ['neurologia']],
  ['renal', /\b(renal|renais|nefro\w*|rim|rins|dialise|hemodialise|glomerulo\w*|ureia|creatinina|hipercalemia|hipocalemia)\b/, ['nefrologia']],
  ['infecto', /\b(infecto\w*|sepse|sepsis|bacteria\w*|virus|viral|antibiotico\w*|antimicrobiano\w*|infeccao\w*|microbio\w*|fungo\w*)\b/, ['infectologia']],
  ['intensiva', /\b(intensiv\w*|uti|temi|reanimacao|ressuscitacao|sedacao|analgesia|choque|vasopressor\w*|critico\w*|politrauma|via aerea)\b/, ['terapia intensiva']],
];

export function classifyFilename(filename = '') {
  const title = String(filename).replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240) || 'Nova figurinha';
  const text = normalize(title);
  const match = rules.find(([, pattern]) => pattern.test(text));
  return { title, category: match?.[0] || 'outros', tags: match?.[2] ? [...match[2]] : [], reviewed: false, classification: 'filename' };
}

export function supportedImage(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return false;
  const mime = String(file.type || '').toLowerCase();
  return IMAGE_TYPES.includes(mime) || (!mime && extensions.test(String(file.name || '')));
}

export async function sha256(blob) {
  const bytes = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function matchesCard(card, { query = '', category = 'all', view = 'all', collection = '' } = {}) {
  if (category && category !== 'all' && card.category !== category) return false;
  if ((view === 'favorites' || view === 'favoritos') && !card.favorite) return false;
  if ((view === 'review' || view === 'pending') && card.reviewed) return false;
  if (collection && collection !== 'all' && card.collection !== collection) return false;
  const haystack = normalize([card.title, card.description, card.filename, card.source, card.collection, CATEGORIES.find(c => c.id === card.category)?.label, ...(card.tags || [])].filter(Boolean).join(' '));
  return normalize(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}

function textField(value, field, limit, fallback = '') {
  if (value == null) return fallback;
  if (typeof value !== 'string' || value.length > limit) throw new Error(`Campo inválido no backup: ${field}.`);
  return value;
}

function safeCardMetadata(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw new Error('Figurinha inválida no backup.');
  const id = textField(card.id, 'id', 120);
  if (!/^[a-zA-Z0-9_:-]+$/.test(id) || /^demo(?:[-_:]|$)/i.test(id)) throw new Error('Identificador inválido ou reservado no backup.');
  if (!categoryIds.has(card.category)) throw new Error('Categoria desconhecida no backup.');
  if (!Array.isArray(card.tags) || card.tags.length > 50 || card.tags.some(tag => typeof tag !== 'string' || tag.length > 120)) throw new Error('Marcadores inválidos no backup.');
  if (typeof card.favorite !== 'boolean' || typeof card.reviewed !== 'boolean') throw new Error('Estado de revisão inválido no backup.');
  if (typeof card.createdAt !== 'string' || !Number.isFinite(Date.parse(card.createdAt))) throw new Error('Data inválida no backup.');
  if (card.hash != null && card.hash !== '' && !/^[a-f0-9]{64}$/i.test(card.hash)) throw new Error('Hash inválido no backup.');
  const mime = textField(card.mime, 'mime', 40);
  if (!IMAGE_TYPES.includes(mime)) throw new Error('Formato de imagem não permitido no backup.');
  const dimensions = {};
  for (const key of ['width', 'height']) {
    const value = card[key] ?? 0;
    if (!Number.isInteger(value) || value < 0 || value > 100000) throw new Error('Dimensões inválidas no backup.');
    dimensions[key] = value;
  }
  return {
    id, title: textField(card.title, 'title', 240, 'Nova figurinha'), category: card.category,
    tags: [...card.tags], description: textField(card.description, 'description', 10000),
    source: textField(card.source, 'source', 2000), collection: textField(card.collection, 'collection', 120),
    favorite: card.favorite, reviewed: card.reviewed, createdAt: new Date(card.createdAt).toISOString(),
    filename: textField(card.filename, 'filename', 500), mime, hash: card.hash || '',
    ...dimensions, classification: textField(card.classification, 'classification', 120, 'manual'),
  };
}

function validateDataUrl(dataUrl, mime) {
  if (typeof dataUrl !== 'string') throw new Error('Imagem ausente no backup.');
  const prefix = `data:${mime};base64,`;
  if (!dataUrl.startsWith(prefix)) throw new Error('Formato da imagem diverge do catálogo.');
  if (dataUrl.length > prefix.length + Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('Uma imagem excede o limite de 20 MB.');
  const body = dataUrl.slice(prefix.length);
  if (!body || body.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body)) throw new Error('Imagem codificada incorretamente no backup.');
  const size = body.length / 4 * 3 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0);
  if (size <= 0 || size > MAX_IMAGE_BYTES) throw new Error('Uma imagem excede o limite de 20 MB.');
  return { body, size };
}

/** Returns a validated, sanitized backup; throws a readable error on invalid input. */
export function validateBackup(data) {
  if (!data || data.app !== 'cardfeed360x' || data.version !== 1 || !Array.isArray(data.cards)) throw new Error('Este arquivo não é um backup CardFeed360X versão 1.');
  if (data.cards.length > 5000) throw new Error('O backup excede o limite de 5.000 figurinhas.');
  const ids = new Set();
  let total = 0;
  const cards = data.cards.map(card => {
    const metadata = safeCardMetadata(card);
    if (ids.has(metadata.id)) throw new Error('O backup contém identificadores repetidos.');
    ids.add(metadata.id);
    total += validateDataUrl(card.dataUrl, metadata.mime).size;
    if (total > MAX_BACKUP_BYTES) throw new Error('O backup excede o limite de 500 MB de imagens.');
    return { ...metadata, dataUrl: card.dataUrl };
  });
  return { app: 'cardfeed360x', version: 1, exportedAt: textField(data.exportedAt, 'exportedAt', 100), cards };
}

function isImageSignature(bytes, mime) {
  if (mime === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.subarray(0, 6)));
  if (mime === 'image/webp') return String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  return false;
}

/** Detect the actual image encoding independently of a filename or browser MIME. */
export async function detectImageMime(blob) {
  if (!(blob instanceof Blob) || !blob.size) return null;
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return IMAGE_TYPES.find(mime => isImageSignature(bytes, mime)) || null;
}

export async function serializeCards(cards) {
  const serialized = [];
  for (const card of cards) {
    if (card.demo) continue;
    const metadata = safeCardMetadata(card);
    if (!(card.blob instanceof Blob) || !card.blob.size || card.blob.size > MAX_IMAGE_BYTES) throw new Error('Uma figurinha não possui uma imagem válida para exportação.');
    const bytes = new Uint8Array(await card.blob.arrayBuffer());
    if (!isImageSignature(bytes, metadata.mime)) throw new Error('Uma figurinha contém um arquivo de imagem inválido.');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    serialized.push({ ...metadata, dataUrl: `data:${metadata.mime};base64,${btoa(binary)}` });
  }
  return validateBackup({ app: 'cardfeed360x', version: 1, exportedAt: new Date().toISOString(), cards: serialized });
}

export async function deserializeBackup(data) {
  const validated = validateBackup(data);
  const cards = [];
  for (const card of validated.cards) {
    const { dataUrl, ...metadata } = card;
    const { body } = validateDataUrl(dataUrl, metadata.mime);
    const binary = atob(body);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    if (!isImageSignature(bytes, metadata.mime)) throw new Error('O backup contém um arquivo que não é uma imagem permitida.');
    const blob = new Blob([bytes], { type: metadata.mime });
    const hash = await sha256(blob);
    if (metadata.hash && metadata.hash.toLowerCase() !== hash) throw new Error('Uma imagem não corresponde ao hash salvo no backup.');
    cards.push({ ...metadata, hash, blob });
  }
  return cards;
}

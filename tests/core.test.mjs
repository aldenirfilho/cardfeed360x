import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, classifyFilename, supportedImage, detectImageMime, matchesCard, sha256, validateBackup, serializeCards, deserializeBackup, MAX_IMAGE_BYTES } from '../core.js';

const png = new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])], { type: 'image/png' });
const fixture = (overrides = {}) => ({
  id: 'card-123', title: 'Ventilação', category: 'pneumo', tags: ['UTI'], description: '', source: '', collection: 'TEMI',
  favorite: true, reviewed: false, createdAt: '2026-10-30T12:00:00.000Z', filename: 'ventilacao.png', mime: 'image/png', hash: '',
  width: 0, height: 0, classification: 'filename', blob: png, ...overrides,
});

test('filename suggestions understand accents, word boundaries and conservative fallback', () => {
  assert.equal(normalize('  Coração  '), 'coracao');
  assert.equal(classifyFilename('01_ECG-arritmias.PNG').category, 'cardio');
  assert.equal(classifyFilename('ventilação_mecânica.jpeg').category, 'pneumo');
  assert.equal(classifyFilename('POCUS-coracao.webp').category, 'pocus');
  assert.equal(classifyFilename('IMG_2342.jpg').category, 'outros');
  assert.equal(classifyFilename('rima-poema.jpg').category, 'outros');
  assert.equal(classifyFilename('ECG.png').reviewed, false);
});

test('upload filter rejects dangerous formats, empty and oversized images', () => {
  assert.equal(supportedImage({ name: 'card.png', size: 5, type: 'image/png' }), true);
  assert.equal(supportedImage({ name: 'card.webp', size: 5, type: '' }), true);
  assert.equal(supportedImage({ name: 'card.svg', size: 5, type: 'image/svg+xml' }), false);
  assert.equal(supportedImage({ name: 'card.png', size: 0, type: 'image/png' }), false);
  assert.equal(supportedImage({ name: 'card.png', size: MAX_IMAGE_BYTES + 1, type: 'image/png' }), false);
});

test('encoding detection uses file bytes, including a JPEG renamed as PNG', async () => {
  const renamedJPEG = new File([Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70])], 'ECG.png', { type: 'image/png' });
  assert.equal(await detectImageMime(renamedJPEG), 'image/jpeg');
  assert.equal(await detectImageMime(png), 'image/png');
  assert.equal(await detectImageMime(new Blob(['GIF89a12345'])), 'image/gif');
  assert.equal(await detectImageMime(new Blob(['RIFF1234WEBP'])), 'image/webp');
  assert.equal(await detectImageMime(new Blob(['<svg></svg>'], { type: 'image/png' })), null);
  assert.equal(await detectImageMime(new Blob()), null);
});

test('combined search, category, favorite, review and collection filters', () => {
  const card = fixture();
  assert.equal(matchesCard(card, { query: 'ventilacao uti', category: 'pneumo', view: 'favorites', collection: 'TEMI' }), true);
  assert.equal(matchesCard(card, { query: 'cardiologia' }), false);
  assert.equal(matchesCard(card, { category: 'cardio' }), false);
  assert.equal(matchesCard({ ...card, reviewed: true }, { view: 'review' }), false);
});

test('full-image backup round trips without exporting blob URLs or arbitrary properties', async () => {
  const card = fixture({ hash: await sha256(png), imageUrl: 'blob:ephemeral', unexpected: '<script>' });
  const backup = await serializeCards([card]);
  assert.equal(backup.cards[0].imageUrl, undefined);
  assert.equal(backup.cards[0].unexpected, undefined);
  assert.match(backup.cards[0].dataUrl, /^data:image\/png;base64,/);
  const restored = await deserializeBackup(backup);
  assert.deepEqual(new Uint8Array(await restored[0].blob.arrayBuffer()), new Uint8Array(await png.arrayBuffer()));
  assert.equal(restored[0].hash, card.hash);
  assert.equal(restored[0].dataUrl, undefined);
});

test('backup validation rejects wrong app, reserved IDs, duplicates, invalid MIME and invalid states', async () => {
  const backup = await serializeCards([fixture()]);
  assert.throws(() => validateBackup({ ...backup, app: 'other' }));
  for (const edit of [{ id: 'demo-heart' }, { mime: 'image/svg+xml' }, { reviewed: 'yes' }, { tags: ['x'.repeat(121)] }, { category: 'diagnosis' }, { dataUrl: 'data:text/html;base64,AAAA' }]) {
    assert.throws(() => validateBackup({ ...backup, cards: [{ ...backup.cards[0], ...edit }] }));
  }
  assert.throws(() => validateBackup({ ...backup, cards: [backup.cards[0], backup.cards[0]] }));
});

test('restore rejects spoofed image signatures and tampered content hashes', async () => {
  const backup = await serializeCards([fixture()]);
  await assert.rejects(() => deserializeBackup({ ...backup, cards: [{ ...backup.cards[0], dataUrl: 'data:image/png;base64,PHNjcmlwdD4=' }] }), /não é uma imagem/);
  await assert.rejects(() => deserializeBackup({ ...backup, cards: [{ ...backup.cards[0], hash: '0'.repeat(64) }] }), /hash/);
});

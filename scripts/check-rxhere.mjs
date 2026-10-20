// Asserts the RxHere rules: webhook signature, DEA check digit, payload refusals and shape.
// Usage: JITI_ALIAS='{"@/":"<repo>/src/"}' npx jiti scripts/check-rxhere.mjs
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildPrescriptionPayload, parseWebhook, signatureValid, validDea, isCatalogId } from '../src/lib/rxhere-rules.ts';

const body = JSON.stringify({ event: 'order.shipped', order_id: 'abc', order_number: 'X-1', tracking_number: '1Z', tracking_carrier: 'ups', occurred_at: '2026-10-19T18:22:03.005Z' });
const sig = 'sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex');
assert.equal(signatureValid(body, sig, 's3cret'), true);
assert.equal(signatureValid(body + ' ', sig, 's3cret'), false);
assert.equal(signatureValid(body, sig, 'other'), false);
assert.equal(signatureValid(body, 'sha256=zz', 's3cret'), false);
assert.equal(signatureValid(body, null, 's3cret'), false);
const bare = 'sha256=' + createHmac('sha256', 'abc123').update(body).digest('hex');
assert.equal(signatureValid(body, bare, 'whsec_abc123'), true); // keyed without the prefix
const full = 'sha256=' + createHmac('sha256', 'whsec_abc123').update(body).digest('hex');
assert.equal(signatureValid(body, full, 'whsec_abc123'), true); // keyed with it
assert.deepEqual(parseWebhook(JSON.parse(body)), { reference: 'abc', event: 'SHIPPED', occurredAt: '2026-10-19T18:22:03.005Z', trackingNumber: '1Z', carrier: 'ups', reason: null });
assert.equal(parseWebhook({ event: 'order.unknown', order_id: 'a', occurred_at: '2026-10-19T00:00:00Z' }), null);

assert.equal(validDea('FE0258637'), true);
assert.equal(validDea('AS1234563'), true); // the guide's example
assert.equal(validDea('FE0258638'), false);
assert.equal(isCatalogId('AA-NAD-02'), false);

const base = {
  orderNumber: '100421', patientId: 'u1', cadence: 'monthly', lineQty: 1, sig: 'Take 1 daily',
  item: { sku: '0f1f2c9e-2f30-4a1b-8b1c-6f4e9a0c1d22', name: 'Enclomiphene', strength: '12.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 1 },
  patient: { firstName: 'Jane', lastName: 'Doe', dob: '1985-04-12', answers: { sex: 'f', allergies_any: 'no' }, phone: '+1 (201) 555-0100', email: 'j@x.com' },
  address: { line1: '1 Main St', city: 'Newark', state: 'nj', zip: '07102' },
  prescriber: { name: 'Bader Elder, DO', npi: '1619538881', dea: 'FE0258637', licenses: { NJ: '25MB11925900', MI: '5151014122' } },
};
const ok = buildPrescriptionPayload(base);
assert.equal(ok.ok, true);
assert.equal(ok.payload.patient.address.state, 'NJ');
assert.equal(ok.payload.patient.phone, '2015550100');
assert.equal(ok.payload.prescriptions[0].order_quantity, 30);
assert.equal(ok.payload.prescriber.licenses.length, 2);
assert.equal(ok.payload.external_order_id, '100421');
assert.equal(buildPrescriptionPayload({ ...base, item: { ...base.item, sku: 'AA-NAD-02' } }).error, 'sku_missing');
assert.equal(buildPrescriptionPayload({ ...base, address: { line1: '1 Main St' } }).error, 'no_address');
assert.equal(buildPrescriptionPayload({ ...base, prescriber: { ...base.prescriber, licenses: {} } }).error, 'no_license');
assert.equal(buildPrescriptionPayload({ ...base, prescriber: { ...base.prescriber, dea: 'BAD' } }).payload.prescriber.dea_number, undefined);
assert.equal(buildPrescriptionPayload({ ...base, cadence: 'quarterly' }).payload.prescriptions[0].days_supply, 90);
console.log('rxhere rules: all checks passed');

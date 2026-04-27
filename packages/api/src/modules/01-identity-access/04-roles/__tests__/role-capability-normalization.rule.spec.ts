import { normalizeCapabilityKeys } from '../domain/rules/role-capability-normalization.rule';

describe('normalizeCapabilityKeys', () => {
  it('normalizes, deduplicates, trims and sorts capability keys', () => {
    expect(
      normalizeCapabilityKeys([' orders.read ', 'orders.write', 'ORDERS.READ']),
    ).toEqual(['orders.read', 'orders.write']);
  });
});

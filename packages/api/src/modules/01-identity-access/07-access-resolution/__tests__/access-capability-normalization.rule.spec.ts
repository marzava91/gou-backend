import {
  buildCapabilityKeyFromResourceAction,
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/access-capability-normalization.rule';

describe('access capability normalization rules', () => {
  it('normalizes capability key', () => {
    expect(normalizeCapabilityKey(' Orders.Read ')).toBe('orders.read');
  });

  it('normalizes resource and action keys', () => {
    expect(normalizeResourceKey(' Orders ')).toBe('orders');
    expect(normalizeActionKey(' Write ')).toBe('write');
  });

  it('builds derived capability from resource and action', () => {
    expect(
      buildCapabilityKeyFromResourceAction({
        resourceKey: 'orders',
        actionKey: 'write',
      }),
    ).toBe('orders.write');
  });
});
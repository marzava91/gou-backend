import {
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/grant-capability-normalization.rule';

describe('grant normalization rules', () => {
  it('normalizes capability key', () => {
    expect(normalizeCapabilityKey(' Orders.Read ')).toBe('orders.read');
  });

  it('normalizes resource and action keys', () => {
    expect(normalizeResourceKey(' Orders ')).toBe('orders');
    expect(normalizeActionKey(' Write ')).toBe('write');
  });

  it('trims aggressively and lowercases capability key', () => {
    expect(normalizeCapabilityKey('   INVENTORY.Adjust   ')).toBe(
      'inventory.adjust',
    );
  });

  it('trims aggressively and lowercases resource/action keys', () => {
    expect(normalizeResourceKey('   Products   ')).toBe('products');
    expect(normalizeActionKey('   DELETE   ')).toBe('delete');
  });

  it('does not alter inner punctuation, only trim/lowercase', () => {
    expect(normalizeCapabilityKey(' Orders.Items.Read ')).toBe(
      'orders.items.read',
    );
  });
});

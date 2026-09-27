/**
 * Phase 0 Test Runner Specification for Dirty Dozen Payloads
 * Verifies that all 12 adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof',
    operation: 'create',
    path: '/users/user_123',
    auth: { uid: 'user_123', email_verified: false },
    payload: { ownerId: 'user_123', fullName: 'Spoofer', balance: 1000 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on User Create',
    operation: 'create',
    path: '/users/user_123',
    auth: { uid: 'user_123', email_verified: true },
    payload: { ownerId: 'user_999', fullName: 'Spoofer', balance: 1000 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Tenant PII Read',
    operation: 'get',
    path: '/users/user_123',
    auth: { uid: 'attacker_456', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on User Update',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email_verified: true },
    payload: { balance: 50000, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Negative Balance Injection',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email_verified: true },
    payload: { balance: -99999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'PIN Format Bypass',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email_verified: true },
    payload: { pin: '999999_bad' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning Attack',
    operation: 'create',
    path: '/users/user_123/transactions/bad$id!@#',
    auth: { uid: 'user_123', email_verified: true },
    payload: { ownerId: 'user_123', amount: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Subcollection Write',
    operation: 'create',
    path: '/users/non_existent_user/transactions/tx_1',
    auth: { uid: 'non_existent_user', email_verified: true },
    payload: { ownerId: 'non_existent_user', amount: 500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Ledger Tampering',
    operation: 'update',
    path: '/users/user_123/transactions/tx_1',
    auth: { uid: 'user_123', email_verified: true },
    payload: { amount: 999999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/users/user_123/transactions/tx_2',
    auth: { uid: 'user_123', email_verified: true },
    payload: { ownerId: 'user_123', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Notification Update',
    operation: 'update',
    path: '/users/user_123/notifications/notif_1',
    auth: { uid: 'user_123', email_verified: true },
    payload: { isRead: 'yes_string_instead_of_boolean' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized List Scraping',
    operation: 'list',
    path: '/users/user_123/transactions',
    auth: { uid: 'attacker_456', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];

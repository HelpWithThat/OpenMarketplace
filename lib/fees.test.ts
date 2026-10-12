/**
 * Fee Calculator Tests
 * 
 * Tests the examples from the product plan section 5:
 * 
 * Example 1: $200 labor + $30 expenses
 * - 80/20 split: buyer pays $232 + $30 = $262, worker gets $192 + $30 = $222
 * - 70/30 split: buyer pays $228 + $30 = $258, worker gets $188 + $30 = $218
 * 
 * Example 2: Without expenses
 * - 80/20: buyer pays $232, worker gets $192
 * - 70/30: buyer pays $228, worker gets $188
 */

import { calculateFees, FeeSettings } from './fees'

// Test helper
function assertClose(actual: number, expected: number, message: string) {
  const diff = Math.abs(actual - expected)
  if (diff > 0.01) {
    throw new Error(`${message}: expected ${expected}, got ${actual} (diff: ${diff})`)
  }
}

// Test 1: $200 labor + $30 expenses with 80/20 split
console.log('Test 1: $200 labor + $30 expenses with 80/20 split')
const test1 = calculateFees(200, 30, {
  feeRate: 0.20,
  feeSplitBuyer: 0.80,
  feeSplitWorker: 0.20,
})

assertClose(test1.laborValue, 200, 'Labor value')
assertClose(test1.platformFee, 40, 'Platform fee (20% of $200)')
assertClose(test1.buyerFee, 32, 'Buyer fee (80% of $40)')
assertClose(test1.workerFee, 8, 'Worker fee (20% of $40)')
assertClose(test1.expensesTotal, 30, 'Expenses total')
assertClose(test1.buyerPays, 262, 'Buyer pays ($200 + $32 + $30)')
assertClose(test1.workerGets, 222, 'Worker gets ($200 - $8 + $30)')
assertClose(test1.platformKeeps, 40, 'Platform keeps')
console.log('✓ Test 1 passed')

// Test 2: $200 labor + $30 expenses with 70/30 split
console.log('\nTest 2: $200 labor + $30 expenses with 70/30 split')
const test2 = calculateFees(200, 30, {
  feeRate: 0.20,
  feeSplitBuyer: 0.70,
  feeSplitWorker: 0.30,
})

assertClose(test2.laborValue, 200, 'Labor value')
assertClose(test2.platformFee, 40, 'Platform fee (20% of $200)')
assertClose(test2.buyerFee, 28, 'Buyer fee (70% of $40)')
assertClose(test2.workerFee, 12, 'Worker fee (30% of $40)')
assertClose(test2.expensesTotal, 30, 'Expenses total')
assertClose(test2.buyerPays, 258, 'Buyer pays ($200 + $28 + $30)')
assertClose(test2.workerGets, 218, 'Worker gets ($200 - $12 + $30)')
assertClose(test2.platformKeeps, 40, 'Platform keeps')
console.log('✓ Test 2 passed')

// Test 3: $200 labor without expenses, 80/20 split
console.log('\nTest 3: $200 labor without expenses, 80/20 split')
const test3 = calculateFees(200, 0, {
  feeRate: 0.20,
  feeSplitBuyer: 0.80,
  feeSplitWorker: 0.20,
})

assertClose(test3.laborValue, 200, 'Labor value')
assertClose(test3.buyerPays, 232, 'Buyer pays ($200 + $32)')
assertClose(test3.workerGets, 192, 'Worker gets ($200 - $8)')
console.log('✓ Test 3 passed')

// Test 4: $200 labor without expenses, 70/30 split
console.log('\nTest 4: $200 labor without expenses, 70/30 split')
const test4 = calculateFees(200, 0, {
  feeRate: 0.20,
  feeSplitBuyer: 0.70,
  feeSplitWorker: 0.30,
})

assertClose(test4.laborValue, 200, 'Labor value')
assertClose(test4.buyerPays, 228, 'Buyer pays ($200 + $28)')
assertClose(test4.workerGets, 188, 'Worker gets ($200 - $12)')
console.log('✓ Test 4 passed')

// Test 5: Edge cases
console.log('\nTest 5: Edge cases')
const test5a = calculateFees(0, 0)
assertClose(test5a.buyerPays, 0, 'Zero labor, zero expenses')
assertClose(test5a.workerGets, 0, 'Zero labor, zero expenses')

const test5b = calculateFees(100, 0)
assertClose(test5b.platformFee, 20, 'Platform fee on $100')

const test5c = calculateFees(0, 50) // Only expenses, no labor
assertClose(test5c.platformFee, 0, 'No fee on expenses-only')
assertClose(test5c.buyerPays, 50, 'Buyer pays only expenses')
assertClose(test5c.workerGets, 50, 'Worker gets only expenses')
console.log('✓ Test 5 passed (edge cases)')

// Test 6: Validation
console.log('\nTest 6: Validation')
try {
  calculateFees(-1, 0)
  throw new Error('Should have thrown on negative labor')
} catch (e: any) {
  if (e.message.includes('cannot be negative')) {
    console.log('✓ Test 6a passed (negative labor validation)')
  } else {
    throw e
  }
}

try {
  calculateFees(100, -1)
  throw new Error('Should have thrown on negative expenses')
} catch (e: any) {
  if (e.message.includes('cannot be negative')) {
    console.log('✓ Test 6b passed (negative expenses validation)')
  } else {
    throw e
  }
}

console.log('\n✅ All tests passed!')
console.log('\nExamples from product plan verified:')
console.log('$200 labor + $30 expenses:')
console.log('  80/20: buyer $262, worker $222 ✓')
console.log('  70/30: buyer $258, worker $218 ✓')
console.log('$200 labor without expenses:')
console.log('  80/20: buyer $232, worker $192 ✓')
console.log('  70/30: buyer $228, worker $188 ✓')

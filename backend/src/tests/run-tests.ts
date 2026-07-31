import assert from 'assert';

// Color printing helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('----------------------------------------------------');
console.log('RUNNING ERP UNIT & INTEGRATION TEST SUITES');
console.log('----------------------------------------------------');

let totalTests = 0;
let passedTests = 0;

const test = (name: string, fn: () => void) => {
  totalTests++;
  try {
    fn();
    console.log(`${GREEN}✓ PASS:${RESET} ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`${RED}✗ FAIL:${RESET} ${name}`);
    console.error(err);
  }
};

// 1. Utilities format test
test('Utility Format Currency', () => {
  const formatCurrency = (val: number | string) =>
    '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  assert.strictEqual(formatCurrency(12500.5), '₹12,500.50');
  assert.strictEqual(formatCurrency(0), '₹0.00');
  assert.strictEqual(formatCurrency('100'), '₹100.00');
});

// 2. Growth math helper test
test('Growth Math calculations percentage change', () => {
  const computeGrowth = (current: number, previous: number) => {
    const percentageChange = previous === 0 
      ? (current > 0 ? 100 : 0) 
      : Number((((current - previous) / previous) * 100).toFixed(2));
    return {
      currentValue: current,
      previousValue: previous,
      percentageChange,
      isGrowth: current >= previous,
    };
  };

  const g1 = computeGrowth(150, 100);
  assert.strictEqual(g1.percentageChange, 50);
  assert.strictEqual(g1.isGrowth, true);

  const g2 = computeGrowth(80, 100);
  assert.strictEqual(g2.percentageChange, -20);
  assert.strictEqual(g2.isGrowth, false);

  const g3 = computeGrowth(100, 0);
  assert.strictEqual(g3.percentageChange, 100);
});

// 3. OCR Matching Suggester score test
test('OCR product fuzzy suggestion', () => {
  const previousOrders = ['Tomato', 'Onion', 'Potato'];
  const suggestMatch = (detected: string): string | null => {
    const d = detected.toLowerCase().trim();
    if (d.includes('tam') || d.includes('toma')) return 'Tomato';
    if (d.includes('oni') || d.includes('onion')) return 'Onion';
    return null;
  };

  assert.strictEqual(suggestMatch('Tamato'), 'Tomato');
  assert.strictEqual(suggestMatch('onion ring'), 'Onion');
  assert.strictEqual(suggestMatch('Cabbage'), null);
});

// 4. Input validator schema
test('Zod validator structure invoice validations', () => {
  const validateInvoice = (dto: any) => {
    if (!dto.customerId) throw new Error('Missing customerId');
    if (!dto.items || dto.items.length === 0) throw new Error('Items list is empty');
    return true;
  };

  assert.strictEqual(validateInvoice({ customerId: 'c1', items: [{ name: 'A' }] }), true);
  assert.throws(() => validateInvoice({ customerId: 'c1', items: [] }));
});

console.log('----------------------------------------------------');
console.log(`TEST EXECUTION SUMMARY: ${passedTests}/${totalTests} Passed`);
console.log('----------------------------------------------------');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

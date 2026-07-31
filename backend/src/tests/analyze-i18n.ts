import fs from 'fs';
import path from 'path';

// Load localization files
const enPath = path.resolve(process.cwd(), '../frontend/src/i18n/en.json');
const knPath = path.resolve(process.cwd(), '../frontend/src/i18n/kn.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const knData = JSON.parse(fs.readFileSync(knPath, 'utf8'));

// Flatten keys helper
const getFlattenKeys = (obj: any, prefix = ''): string[] => {
  let keys: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null) {
      keys = keys.concat(getFlattenKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

const enKeys = getFlattenKeys(enData);
const knKeys = getFlattenKeys(knData);

// Find missing keys
const missingKn = enKeys.filter(k => !knKeys.includes(k));
const missingEn = knKeys.filter(k => !enKeys.includes(k));

// Scan frontend files for translation references
const frontendSrc = path.resolve(process.cwd(), '../frontend/src');
const scannedFiles: string[] = [];
const tReferences = new Set<string>();
const filesWithoutI18n: string[] = [];

const scanDirectory = (dir: string) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        scanDirectory(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      scannedFiles.push(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check if imports useTranslation
      if (file.endsWith('.tsx') && !content.includes('useTranslation') && !content.includes('LanguageSwitcher')) {
        filesWithoutI18n.push(path.relative(frontendSrc, fullPath));
      }

      // Regex matching t('...') or t("...") or t(`...`)
      const matches = content.matchAll(/t\(['"`]([^'"`]+)['"`]/g);
      for (const match of matches) {
        tReferences.add(match[1]);
      }
    }
  }
};

scanDirectory(frontendSrc);

const totalKeys = Array.from(new Set([...enKeys, ...knKeys])).length;
const unusedKeys = enKeys.filter(k => !tReferences.has(k) && !k.startsWith('appName') && !k.startsWith('appSubtitle'));

const markdownReport = `
# Localization Coverage Report - Raju ERP

Generated on: ${new Date().toLocaleString()}

## Key Metrics
- **Total Unique Translation Keys**: ${totalKeys}
- **English Keys Defined**: ${enKeys.length}
- **Kannada Keys Defined**: ${knKeys.length}
- **Translation Coverage**: ${((knKeys.length / totalKeys) * 100).toFixed(2)}%

## Missing Translation Keys
### Missing in Kannada (Define in kn.json)
${missingKn.length === 0 ? '- None' : missingKn.map(k => `- \`${k}\``).join('\n')}

### Missing in English (Define in en.json)
${missingEn.length === 0 ? '- None' : missingEn.map(k => `- \`${k}\``).join('\n')}

## Unused Keys (Defined in JSON but not called in code)
${unusedKeys.length === 0 ? '- None' : unusedKeys.map(k => `- \`${k}\``).join('\n')}

## Pages Not Using the Translation System (Missing useTranslation Hook)
${filesWithoutI18n.length === 0 ? '- None (100% components localization hooks coverage!)' : filesWithoutI18n.map(f => `- \`${f}\``).join('\n')}
`;

const reportPath = path.resolve(process.cwd(), '../frontend/i18n_report.md');
fs.writeFileSync(reportPath, markdownReport, 'utf8');

console.log('----------------------------------------------------');
console.log('I18N LOCALIZATION REPORT GENERATED');
console.log('----------------------------------------------------');
console.log(`Total Keys: ${totalKeys}`);
console.log(`Missing Kannada Keys: ${missingKn.length}`);
console.log(`Missing English Keys: ${missingEn.length}`);
console.log(`Unlocalized Page Files: ${filesWithoutI18n.length}`);
console.log(`Report written to: ${reportPath}`);
console.log('----------------------------------------------------');

if (missingKn.length === 0 && missingEn.length === 0 && filesWithoutI18n.length === 0) {
  process.exit(0);
} else {
  process.exit(1);
}

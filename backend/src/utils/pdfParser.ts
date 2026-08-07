import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function parsePdfContent(fileBuffer: Buffer): Promise<{ productName: string; quantity: number; unitType: string }[]> {
  const extractedItems: { productName: string; quantity: number; unitType: string }[] = [];
  try {
    const data = await pdf(fileBuffer);
    const text = data.text || '';
    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Replace tabs or multiple spaces with a single space for clean regex matching
      const cleanLine = line.replace(/\s+/g, ' ');

      // Ignore header/title/table meta lines
      if (/fruits?\s*&\s*vegetables?/i.test(cleanLine)) continue;
      if (/^\s*item\s+quantity\s*$/i.test(cleanLine)) continue;
      if (/^\s*item\s*$/i.test(cleanLine) || /^\s*quantity\s*$/i.test(cleanLine)) continue;

      // Match item name followed by quantity and unit (optional)
      // Example: "Tomato 20" or "Onion 10 Kg" or "Leafy Green 5 Bundle"
      const match = cleanLine.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|grams|pcs|piece|pieces|dozen|box|crate|bag|bundle|packet|tray)?$/i);
      if (match) {
        let name = match[1].trim();
        // Remove trailing colons, dashes, or spaces from the product name
        name = name.replace(/[-:]\s*$/, '').trim();
        
        const qty = parseFloat(match[2]);
        const unit = match[3] ? match[3].trim() : 'Kg';

        extractedItems.push({
          productName: name,
          quantity: qty,
          unitType: unit,
        });
      }
    }
  } catch (error) {
    console.error('Error parsing PDF content using pdf-parse:', error);
  }
  return extractedItems;
}

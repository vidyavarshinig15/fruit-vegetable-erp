import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function parsePdfContent(fileBuffer: Buffer): Promise<{ productName: string; quantity: number; unitType: string }[]> {
  const extractedItems: { productName: string; quantity: number; unitType: string }[] = [];
  const parser = new pdf.PDFParse({ data: fileBuffer });
  try {
    const textResult = await parser.getText();
    const text = textResult.text || '';
    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Replace tabs or multiple spaces with a single space for clean regex matching
      const cleanLine = line.replace(/\s+/g, ' ');

      // Ignore header/title/info/summary meta lines
      if (/fruits?\s*&\s*vegetables?/i.test(cleanLine)) continue;
      if (/^\s*item\s+quantity\s*$/i.test(cleanLine)) continue;
      if (/^\s*item\s*$/i.test(cleanLine) || /^\s*quantity\s*$/i.test(cleanLine)) continue;
      if (/\b(phone|mobile|mob|tel|date|bill|invoice|tax|gst|total|balance|address|shop|account|email|page|signature)\b/i.test(cleanLine)) continue;

      // Match optional serial number, product name, quantity, optional unit, and optional trailing columns (price, total)
      // Examples: "1 Tomato 20 Kg 35.00 700.00" or "Tomato 20" or "Onion 10 Kg"
      const match = cleanLine.match(/^(?:\d+\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|grams|pcs|piece|pieces|dozen|box|crate|bag|bundle|packet|tray)?(?:\s+.*)?$/i);
      if (match) {
        let name = match[1].trim();
        // Remove trailing colons, dashes, or spaces from the product name
        name = name.replace(/[-:]\s*$/, '').trim();
        
        // Skip if the name is just a number or too short
        if (/^\d+$/.test(name) || name.length < 2) continue;

        const qty = parseFloat(match[2]);
        // Skip phone number lookalikes or extremely large numbers parsed as quantities
        if (qty > 10000) continue;

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
  } finally {
    try {
      await parser.destroy();
    } catch (e) {}
  }
  return extractedItems;
}

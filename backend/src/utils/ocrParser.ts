export function parseTextOrderLines(text: string): { productName: string; quantity: number; unitType: string }[] {
  const extractedItems: { productName: string; quantity: number; unitType: string }[] = [];
  const lines = text.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Clean multiple whitespace characters
    const cleanLine = line.replace(/\s+/g, ' ');

    // Skip metadata lines
    if (/\b(phone|mobile|mob|tel|date|bill|invoice|tax|gst|total|balance|address|shop|account|email|page|signature)\b/i.test(cleanLine)) continue;

    // Match product name, quantity, and optional unit. Support dots/dashes/colons separating name and quantity (e.g. "Palak. 10")
    const match = cleanLine.match(/^(?:\d+\s+)?(.+?)(?:\s*[\.\-:=]\s*|\s+)(\d+(?:\.\d+)?)\s*(kg|g|grams|pcs|piece|pieces|dozen|box|crate|bag|bundle|packet|tray|no)?(?:\s+.*)?$/i);
    if (match) {
      let name = match[1].trim();
      name = name.replace(/[-:]\s*$/, '').trim();
      
      // Ignore if name is purely numeric or too short
      if (/^\d+$/.test(name) || name.length < 2) continue;

      const qty = parseFloat(match[2]);
      if (qty > 10000 || qty <= 0) continue;

      const unit = match[3] ? match[3].trim() : 'Kg';

      extractedItems.push({
        productName: name,
        quantity: qty,
        unitType: unit,
      });
    }
  }
  return extractedItems;
}

export async function parseImageOcr(fileBuffer: Buffer): Promise<{ productName: string; quantity: number; unitType: string }[]> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(fileBuffer);
    await worker.terminate();
    const text = ret.data.text || '';
    return parseTextOrderLines(text);
  } catch (error) {
    console.error('Error during image OCR processing:', error);
    return [];
  }
}

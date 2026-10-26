import { createCanvas } from '@napi-rs/canvas';

// A real, deterministic PDF: selectable text on page 1 and a scanned image on page 2.
export function makePdf(pageCount = 2, { chinese = false } = {}) {
  const canvas = createCanvas(500, 300);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 500, 300);
  ctx.fillStyle = '#17664a'; ctx.fillRect(20, 20, 460, 65);
  ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.fillText('Scanned rubric', 40, 62);
  ctx.fillStyle = '#222'; ctx.font = '20px sans-serif'; ctx.fillText('4 = Clear and concise', 40, 140);
  ctx.fillText('2 = Repeated wording', 40, 190);
  const jpeg = canvas.toBuffer('image/jpeg', 92);
  const objects = [];
  const add = value => { objects.push(Buffer.isBuffer(value) ? value : Buffer.from(value)); return objects.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(`<< /Type /Pages /Count ${pageCount} /Kids [${Array.from({ length: pageCount }, (_, i) => `${5 + i * 2} 0 R`).join(' ')}] >>`);
  add(chinese
    ? '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /DW 1000 /FontDescriptor << /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [-25 -254 1000 880] /ItalicAngle 0 /Ascent 752 /Descent -271 /CapHeight 737 /StemV 58 >> >>] >>'
    : '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 500 /Height 300 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]));
  for (let i = 1; i <= pageCount; i++) {
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> /XObject << /Scan 4 0 R >> >> /Contents ${objects.length + 2} 0 R >>`);
    const text = chinese ? `<${Buffer.from('语言精炼评审规则：表达清晰、直接', 'utf16le').swap16().toString('hex')}>` : `(Rule page ${i}: Preserve meaning.)`;
    const content = i === 2 ? 'q 500 0 0 300 50 400 cm /Scan Do Q' : `BT /F1 24 Tf 50 720 Td ${text} Tj ET`;
    add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  const parts = [Buffer.from('%PDF-1.7\n')], offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
    parts.push(part); length += part.length;
  });
  parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(parts);
}

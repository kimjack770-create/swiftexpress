// ========================================================
// SWIFT EXPRESS LOGISTICS - TRACKING NUMBER GENERATOR
// Automatically generates unique, formatted tracking codes
// Example format: SEL-20260723-9A4B12
// ========================================================

export function generateTrackingNumber(prefix = 'SEL') {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `${prefix}-${dateStr}-${randomHex}`;
}

export function generateInvoiceNumber() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `INV-${new Date().getFullYear()}-${randomNum}`;
}

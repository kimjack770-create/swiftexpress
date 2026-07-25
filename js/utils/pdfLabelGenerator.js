// ========================================================
// SWIFT EXPRESS LOGISTICS - PRINT & LABEL GENERATOR
// Renders printable 4x6" shipping label and commercial invoices
// ========================================================

export function generatePrintableShippingLabel(shipment) {
  const container = document.createElement('div');
  container.id = 'printableArea';

  container.innerHTML = `
    <div class="shipping-label-card">
      <div class="label-header">
        <div class="label-brand">
          <i class="fas fa-shipping-fast" style="color: #0057B8;"></i> SWIFT EXPRESS
        </div>
        <div class="label-service-badge">${shipment.service_type || 'EXPRESS'}</div>
      </div>

      <div class="label-route-box">
        <div class="label-route-section">
          <div class="label-title">FROM (SHIPPER):</div>
          <div class="label-address">
            <strong>${shipment.sender_name}</strong><br>
            ${shipment.sender_address}<br>
            ${shipment.sender_city}, ${shipment.sender_country}<br>
            TEL: ${shipment.sender_phone}
          </div>
        </div>

        <div class="label-route-section">
          <div class="label-title">SHIP TO (RECIPIENT):</div>
          <div class="label-address">
            <strong>${shipment.receiver_name}</strong><br>
            ${shipment.receiver_address}<br>
            ${shipment.receiver_city}, ${shipment.receiver_country}<br>
            TEL: ${shipment.receiver_phone}
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.75rem;">
        <div>WEIGHT: ${shipment.weight_kg} KG</div>
        <div>DIM: ${shipment.dimensions || 'N/A'}</div>
        <div>PKG: ${shipment.package_type || 'PARCEL'}</div>
      </div>

      <div class="label-codes-row">
        <div>
          <div class="label-title">QR VERIFICATION</div>
          <div id="qrcodeCanvas"></div>
        </div>
        <div style="text-align: right;">
          <div class="label-title">DELIVERY ROUTE</div>
          <div style="font-size: 1.5rem; font-weight: 900;">${shipment.origin.slice(0, 3).toUpperCase()} &#10140; ${shipment.destination.slice(0, 3).toUpperCase()}</div>
        </div>
      </div>

      <div class="barcode-wrapper">
        <svg id="barcodeSvg"></svg>
        <div class="label-tracking-num">${shipment.tracking_number}</div>
      </div>
    </div>
  `;

  // Append temporary modal container for printing
  const printModal = document.createElement('div');
  printModal.className = 'modal-overlay active';
  printModal.style.zIndex = '99999';

  const modalBox = document.createElement('div');
  modalBox.className = 'modal-box';
  modalBox.style.maxWidth = '500px';

  modalBox.appendChild(container);

  const btnRow = document.createElement('div');
  btnRow.className = 'no-print flex-between';
  btnRow.style.marginTop = '1.5rem';
  btnRow.innerHTML = `
    <button class="btn btn-outline" id="closePrintBtn">Close</button>
    <button class="btn btn-primary" id="doPrintBtn"><i class="fas fa-print"></i> Print Label</button>
  `;

  modalBox.appendChild(btnRow);
  printModal.appendChild(modalBox);
  document.body.appendChild(printModal);

  // Generate QR code if library is available
  if (window.QRCode) {
    new window.QRCode(modalBox.querySelector('#qrcodeCanvas'), {
      text: `https://swiftexpress.com/tracking.html?tracking=${shipment.tracking_number}`,
      width: 80,
      height: 80
    });
  }

  // Generate Barcode if library is available
  if (window.JsBarcode) {
    window.JsBarcode(modalBox.querySelector('#barcodeSvg'), shipment.tracking_number, {
      format: "CODE128",
      lineColor: "#000",
      width: 2,
      height: 60,
      displayValue: false
    });
  }

  modalBox.querySelector('#closePrintBtn').onclick = () => printModal.remove();
  modalBox.querySelector('#doPrintBtn').onclick = () => window.print();
}

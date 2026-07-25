// ========================================================
// SWIFT EXPRESS LOGISTICS - FORMATTERS & HELPERS
// ========================================================

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount || 0);
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

export function getStatusBadge(status) {
  switch (status) {
    case 'Delivered':
    case 'Paid':
    case 'Completed':
    case 'Approved':
      return `<span class="badge badge-success"><i class="fas fa-check-circle"></i> ${status}</span>`;
    case 'In Transit':
    case 'Out for Delivery':
    case 'On Duty':
      return `<span class="badge badge-info"><i class="fas fa-truck"></i> ${status}</span>`;
    case 'Pending':
    case 'Shipment Created':
    case 'Pickup Scheduled':
    case 'Unpaid':
      return `<span class="badge badge-warning"><i class="fas fa-clock"></i> ${status}</span>`;
    case 'Cancelled':
    case 'Returned':
    case 'Failed':
    case 'Rejected':
      return `<span class="badge badge-danger"><i class="fas fa-times-circle"></i> ${status}</span>`;
    default:
      return `<span class="badge badge-primary">${status}</span>`;
  }
}

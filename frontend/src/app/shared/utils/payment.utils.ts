const PAYMENT_METHOD_LABELS: Record<string, string> = {
  tpay: 'Tpay',
  voucher: 'Voucher',
  cash: 'Gotówka (oznaczony przez organizatora)',
};

export function paymentMethodLabel(method: string | null, fallback = ''): string {
  return method ? (PAYMENT_METHOD_LABELS[method] ?? method) : fallback;
}

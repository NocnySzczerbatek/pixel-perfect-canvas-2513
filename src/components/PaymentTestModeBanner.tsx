const token = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];

export function PaymentTestModeBanner() {
  if (!token) return <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">Płatności produkcyjne nie są jeszcze aktywne.</div>;
  if (token.startsWith("pk_test_")) return <div className="w-full border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-foreground">Tryb testowy — żadne prawdziwe pieniądze nie zostaną pobrane.</div>;
  return null;
}
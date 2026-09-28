export function formatRelativeDate(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatArea(sqm?: number): string | undefined {
  return sqm == null ? undefined : `${sqm} m²`;
}

export function formatEGP(amount: number): string {
  return `EGP ${Math.round(amount).toLocaleString('en-US')}`;
}

/** "living and dining" → "Living and dining" */
export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

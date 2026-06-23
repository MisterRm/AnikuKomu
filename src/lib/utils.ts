export function formatCount(num: number): string {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? `${formatted.slice(0, -2)}J` : `${formatted}J`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1);
    return formatted.endsWith('.0') ? `${formatted.slice(0, -2)}K` : `${formatted}K`;
  }
  return num.toString();
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return 'Baru saja';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m yang lalu`;
    if (diffHr < 24) return `${diffHr}j yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays}h yang lalu`;

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return 'Beberapa waktu lalu';
  }
}

export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}

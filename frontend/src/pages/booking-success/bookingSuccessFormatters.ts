const SESSION_DURATION_MINUTES = 150;

export function formatDate(dateString: string) {
  if (!dateString) return '-';
  const date = new Date(`${dateString}T00:00:00+07:00`);
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeString: string | null) {
  if (!timeString) return '-';
  return timeString.substring(0, 5);
}

export function parseTimeToMinutes(timeString: string): number | null {
  const parts = timeString.split(':');
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(minutesTotal: number) {
  const safe = ((minutesTotal % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getSessionRange(timeString: string | null) {
  if (!timeString) return null;
  const startMinutes = parseTimeToMinutes(timeString);
  if (startMinutes == null) return null;
  const endMinutes = startMinutes + SESSION_DURATION_MINUTES;
  return `${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)}`;
}

export function getDayPartLabel(timeString: string | null) {
  if (!timeString) return null;
  const startMinutes = parseTimeToMinutes(timeString);
  if (startMinutes == null) return null;
  const hour = Math.floor(startMinutes / 60);
  if (hour >= 5 && hour < 11) return 'PAGI';
  if (hour >= 11 && hour < 15) return 'SIANG';
  if (hour >= 15 && hour < 19) return 'SORE';
  return 'MALAM';
}

export function formatQueueCode(timeString: string | null, queueNumber: number | null) {
  if (!timeString || queueNumber == null) return null;
  const label = getDayPartLabel(timeString);
  if (!label) return null;
  return `${label}-${String(queueNumber).padStart(3, '0')}`;
}

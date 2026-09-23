// All "what day is it" logic lives here so the whole app agrees on one timezone.
// Dates are plain 'YYYY-MM-DD' strings; arithmetic is done in UTC so it never
// drifts with the server's own timezone.
const TZ = process.env.APP_TIMEZONE || 'Africa/Nairobi';

function todayStr(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

function currentHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', hourCycle: 'h23'
  }).format(now));
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 0 = Sunday ... 6 = Saturday
function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function dayType(dateStr) {
  const w = dayOfWeek(dateStr);
  if (w === 6) return 'saturday';
  if (w === 0) return 'sunday';
  return 'weekday';
}

function isWeekend(dateStr) {
  return dayType(dateStr) !== 'weekday';
}

// Monday of the week containing dateStr
function weekStart(dateStr) {
  return addDays(dateStr, -((dayOfWeek(dateStr) + 6) % 7));
}

function toDateStr(value) {
  if (!value) return '';
  return todayStr(new Date(value));
}

module.exports = { TZ, todayStr, currentHour, addDays, dayOfWeek, dayType, isWeekend, weekStart, toDateStr };

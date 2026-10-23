(() => {
// Project amounts are entered in pesos; thresholds are inclusive as stated below.
const limits = Object.freeze([
  Object.freeze({ label: 'Below ₱50 million', days: 15 }),
  Object.freeze({ label: '₱50 million–₱100 million', days: 30 }),
  Object.freeze({ label: 'Above ₱100 million–₱150 million', days: 45 }),
  Object.freeze({ label: 'Above ₱150 million–₱200 million', days: 60 }),
  Object.freeze({ label: 'Above ₱200 million', days: 90 })
]);
function calendarDays(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Enter a project amount greater than zero and no more than ₱9,007,199,254,740,991.');
  }
  const index = amount < 50e6 ? 0 : amount <= 100e6 ? 1 : amount <= 150e6 ? 2 : amount <= 200e6 ? 3 : 4;
  return { ...limits[index], index };
}

const dayMs = 86400000;
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    throw new RangeError('Enter a complete, valid date.');
  }
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new RangeError('Enter a complete, valid date.');
  }
  return time;
}
function elapsedDays(ntp, issued) {
  const start = dateValue(ntp), end = dateValue(issued);
  if (end < start) throw new RangeError('The document date cannot be before the signed NTP date.');
  return (end - start) / dayMs;
}
function deadline(ntp, days) {
  if (!Number.isInteger(days) || days < 0) throw new RangeError('Enter a valid calendar day limit.');
  return new Date(dateValue(ntp) + days * dayMs).toISOString();
}
globalThis.CalendarDays = Object.freeze({ limits, calculate: calendarDays, elapsedDays, deadline });
})();

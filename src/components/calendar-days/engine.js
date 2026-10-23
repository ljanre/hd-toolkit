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

globalThis.CalendarDays = Object.freeze({ limits, calculate: calendarDays });
})();

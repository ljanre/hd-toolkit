(() => {
const { calculate: calendarDays } = CalendarDays;
const amount = document.getElementById('amount');
const days = document.getElementById('days');
const note = document.getElementById('result-note');
const error = document.getElementById('amount-error');
const rows = [...document.querySelectorAll('#limits tr')];
function update() {
  days.textContent = '—';
  note.textContent = 'Enter a project amount to see its limit.';
  error.hidden = true;
  error.textContent = '';
  amount.removeAttribute('aria-invalid');
  rows.forEach(row => row.classList.remove('selected'));
  if (amount.value === '' && !amount.validity.badInput) return;
  try {
    const result = calendarDays(amount.valueAsNumber);
    days.textContent = String(result.days);
    note.textContent = result.label;
    rows[result.index].classList.add('selected');
  } catch (cause) {
    error.textContent = cause.message;
    error.hidden = false;
    amount.setAttribute('aria-invalid', 'true');
    note.textContent = 'Enter a valid project amount to see its limit.';
  }
}
amount.addEventListener('input', update);
document.getElementById('clear').addEventListener('click', () => { amount.value = ''; update(); amount.focus(); });
update();

})();

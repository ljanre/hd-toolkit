(() => {
const { calculate, elapsedDays, deadline } = CalendarDays;
const get = id => document.getElementById(id);
const amount = get('amount'), ntp = get('ntp-date'), issued = get('document-date'), type = get('document-type');
const days = get('days'), note = get('result-note'), error = get('amount-error'), dateError = get('date-error');
const elapsed = get('elapsed'), elapsedNote = get('elapsed-note'), due = get('due-date'), check = get('limit-check'), progress = get('day-progress');
const rows = [...document.querySelectorAll('#limits tr')];
const dateFormat = new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' });
function update() {
  days.textContent = '—';
  note.textContent = 'Enter a project amount to see its limit.';
  error.hidden = dateError.hidden = true;
  error.textContent = dateError.textContent = '';
  [amount, ntp, issued].forEach(input => input.removeAttribute('aria-invalid'));
  rows.forEach(row => row.classList.remove('selected'));
  get('document-date-label').textContent = type.value === 'certificate' ? 'Certificate of No Changes issued date' : 'As-Staked Plan signed date';
  elapsed.textContent = due.textContent = '—';
  elapsedNote.textContent = 'Select both dates to count elapsed calendar days.';
  check.textContent = 'Enter an amount and both dates.';
  check.dataset.state = '';
  progress.hidden = true;
  progress.value = 0;
  let limit, count, invalidDateField;
  if (amount.value !== '' || amount.validity.badInput) {
    try {
      limit = calculate(amount.valueAsNumber);
      days.textContent = String(limit.days);
      note.textContent = limit.label;
      rows[limit.index].classList.add('selected');
    } catch (cause) {
      error.textContent = cause.message;
      error.hidden = false;
      amount.setAttribute('aria-invalid', 'true');
      note.textContent = 'Enter a valid project amount to see its limit.';
    }
  }
  try {
    if (ntp.validity.badInput || (ntp.value && !ntp.validity.valid)) {
      invalidDateField = ntp;
      throw new RangeError('Enter a complete, valid NTP signed date.');
    }
    if (issued.validity.badInput || (issued.value && !issued.validity.valid)) {
      invalidDateField = issued;
      throw new RangeError('Enter a complete, valid document date.');
    }
    if (ntp.value && limit) due.textContent = dateFormat.format(new Date(deadline(ntp.value, limit.days)));
    if (ntp.value && issued.value) {
      count = elapsedDays(ntp.value, issued.value);
      elapsed.textContent = String(count);
      elapsedNote.textContent = type.value === 'certificate' ? 'NTP signed → Certificate of No Changes issued' : 'NTP signed → As-Staked Plan signed';
    }
  } catch (cause) {
    dateError.textContent = cause.message;
    dateError.hidden = false;
    (invalidDateField || issued).setAttribute('aria-invalid', 'true');
    elapsedNote.textContent = 'Check the entered dates.';
  }
  if (limit && count !== undefined) {
    const remaining = limit.days - count;
    check.dataset.state = remaining < 0 ? 'over' : 'within';
    check.textContent = remaining < 0 ? `Over the limit by ${-remaining} day${remaining === -1 ? '' : 's'}.` : remaining === 0 ? 'At the calendar day limit.' : `Within the limit · ${remaining} day${remaining === 1 ? '' : 's'} remaining.`;
    progress.max = limit.days;
    progress.value = Math.min(count, limit.days);
    progress.hidden = false;
  }
}
[amount, ntp, issued, type].forEach(input => {
  input.addEventListener('input', update);
  input.addEventListener('change', update);
});
get('clear').addEventListener('click', () => {
  amount.value = ntp.value = issued.value = '';
  type.value = 'plan';
  update();
  amount.focus();
});
update();
})();

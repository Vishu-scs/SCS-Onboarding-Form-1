// date should be in ISO Format
function formatDateTime(date) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const yyyy = now.getFullYear();

  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

export {formatDateTime}

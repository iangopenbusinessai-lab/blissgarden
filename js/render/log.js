window.RenderLog = (() => {
  function renderLog(msg) {
    const inner = document.getElementById('log-inner');
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = msg;
    inner.appendChild(line);
    while (inner.children.length > 60) inner.removeChild(inner.firstChild);
    inner.scrollTop = inner.scrollHeight;
  }
  return { renderLog };
})();

var logEntries = [];
function log(msg) {
  logEntries.push(msg);
  if (logEntries.length > 60) logEntries.shift();
  RenderLog.renderLog(msg);
}
function showBanner(text) {
  const existing = document.querySelector('.world-banner');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'world-banner';
  el.textContent = text;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 4200);
}

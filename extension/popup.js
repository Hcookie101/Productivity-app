function fmt(secs) {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function key(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function render() {
  const { orbitDaily } = await chrome.storage.local.get("orbitDaily");
  const today = (orbitDaily && orbitDaily.daily && orbitDaily.daily[key()]) || {};
  const rows = Object.entries(today).sort((a, b) => b[1] - a[1]);
  const list = document.getElementById("list");
  const total = document.getElementById("total");

  if (rows.length === 0) {
    list.innerHTML = '<div class="empty">Nothing tracked yet today.</div>';
    total.textContent = "0m";
    return;
  }

  list.innerHTML = rows
    .slice(0, 8)
    .map(([domain, secs]) => `<div class="row"><span>${domain}</span><span>${fmt(secs)}</span></div>`)
    .join("");
  total.textContent = fmt(rows.reduce((a, [, s]) => a + s, 0));
}

render();
setInterval(render, 10_000);
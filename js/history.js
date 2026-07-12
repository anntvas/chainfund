const c = campaign();
campaignName.textContent = c.title;
rounds.innerHTML = c.dividendHistory.length ? c.dividendHistory.map(r => `<button class="tr cols-3" style="width:100%;color:inherit;background:none;border-left:0;border-right:0;border-top:0;text-align:left" onclick="show(${r.id})"><div class="mono muted">#${r.id}</div><div>${r.date}</div><div class="right mono green">${r.total} ETH</div></button>`).join('') : '<div class="tr muted">Выплат пока нет</div>';

function show(id) {
   const r = c.dividendHistory.find(x => x.id === id);
   detail.className = 'card';
   detail.innerHTML = `<div class="between"><h2 class="card-title">РАУНД #${r.id}</h2><span class="mono green">${r.total} ETH</span></div>${r.breakdown.map(b=>`<div class="between" style="padding:12px 0;border-bottom:1px solid var(--border)"><div><div>${b.name}</div><div class="mono small" style="color:var(--accent)">${b.share}%</div></div><div class="mono green">${b.received} ETH</div></div>`).join('')}`
}
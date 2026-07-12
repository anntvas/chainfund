const u = user();
if (!u) {
   location.href = 'auth.html'
}
wallet.textContent = u.address;
const mine = campaigns().filter(c => c.owner === u.address);
stats.innerHTML = [
   ['Кампаний', mine.length],
   ['Активных', mine.filter(c => c.status === 'active').length],
   ['Собрано ETH', mine.reduce((s, c) => s + c.raised, 0).toFixed(1)],
   ['Вкладчиков', mine.reduce((s, c) => s + c.contributions.length, 0)]
].map(x => `<div class="card"><div class="label">${x[0]}</div><div class="stat-value">${x[1]}</div></div>`).join('');
my.innerHTML = mine.length ? mine.map(c => `<article class="card"><div class="between"><h3 class="card-title">${c.title}</h3>${status(c)}</div><div class="progress"><span style="width:${pct(c)}%"></span></div><div class="between mt mono small"><span class="green">${c.raised} ETH</span><span class="muted">из ${c.goal}</span></div><div class="between mt"><a class="btn" href="campaign.html?id=${c.id}">Подробнее</a>${c.status==='completed'?`<a class="btn btn-primary" href="dividends.html?id=${c.id}">Дивиденды</a>`:''}</div></article>`).join('') : '<div class="card center muted">У вас пока нет кампаний</div>';
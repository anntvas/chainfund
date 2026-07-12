const c = campaign();
subtitle.textContent = c.title;
summary.innerHTML = [
   ['Собрано', c.raised + ' ETH'],
   ['Цель', c.goal + ' ETH'],
   ['Вкладчиков', c.contributions.length]
].map(x => `<div class="card"><div class="label">${x[0]}</div><div class="stat-value">${x[1]}</div></div>`).join('');

function preview() {
   const total = Number(amount.value || 0);
   rows.innerHTML = c.contributions.map(x => {
      const sh = c.raised ? x.amount / c.raised * 100 : 0;
      return `<div class="tr cols-4"><div class="mono muted small">${x.address}</div><div class="right mono">${x.amount} ETH</div><div class="right mono" style="color:var(--accent)">${sh.toFixed(1)}%</div><div class="right mono green">${(total*sh/100).toFixed(2)} ETH</div></div>`
   }).join('')
}

function distribute() {
   const total = Number(amount.value);
   if (!total) return alert('Введите сумму');
   const all = campaigns(),
      i = all.findIndex(x => x.id === c.id);
   all[i].dividendHistory.push({
      id: all[i].dividendHistory.length + 1,
      date: new Date().toLocaleDateString('ru-RU'),
      total,
      breakdown: c.contributions.map(x => ({
         name: x.address,
         share: +(x.amount / c.raised * 100).toFixed(1),
         received: +(total * x.amount / c.raised).toFixed(2)
      }))
   });
   saveCampaigns(all);
   alert('Дивиденды распределены');
   location.href = 'history.html?id=' + c.id
}
preview();
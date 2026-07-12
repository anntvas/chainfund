let c = campaign();
head.innerHTML = `${status(c)}<h1 class="page-title">${c.title.toUpperCase()}</h1><p class="lead">${c.description}</p>`;
goal.textContent = c.goal + ' ETH';
raised.textContent = c.raised + ' ETH';
days.textContent = c.daysLeft ? c.daysLeft + ' дн.' : '—';
bar.style.width = pct(c) + '%';
percent.textContent = pct(c) + '% собрано';
contributors.textContent = c.contributions.length + ' вкладчиков';
owner.textContent = c.owner;
contribs.innerHTML = c.contributions.map(x => `<div class="tr cols-3"><div class="mono muted small">${x.address}</div><div class="right mono green">${x.amount} ETH</div><div class="right mono muted small">${x.time}</div></div>`).join('');

function renderForm() {
   if (!user()) contributeArea.innerHTML = '<div class="notice muted">Войдите в аккаунт, чтобы сделать взнос</div>';
   else if (c.status === 'completed') contributeArea.innerHTML = '<div class="center"><h3 class="green">✓ Цель достигнута</h3><p class="muted">Сбор средств завершён</p></div>';
   else contributeArea.innerHTML = '<div class="field"><label class="label">Сумма</label><input id="amount" class="input mono" type="number" min="0.01" step="0.01" placeholder="0.0"></div><button class="btn btn-primary" style="width:100%" onclick="contribute()">Внести через MetaMask</button><p class="small muted center">Откроется окно MetaMask</p>'
}

function contribute() {
   const a = Number(amount.value);
   if (!a) return alert('Введите сумму');
   const all = campaigns(),
      i = all.findIndex(x => x.id === c.id),
      accepted = Math.min(a, c.goal - c.raised);
   all[i].raised = +(c.raised + accepted).toFixed(2);
   all[i].contributions.push({
      address: user().address,
      amount: accepted,
      time: new Date().toLocaleTimeString('ru-RU', {
         hour: '2-digit',
         minute: '2-digit'
      })
   });
   if (all[i].raised >= all[i].goal) {
      all[i].status = 'completed';
      all[i].daysLeft = 0
   }
   saveCampaigns(all);
   alert('Транзакция подтверждена');
   location.reload()
}
renderForm();
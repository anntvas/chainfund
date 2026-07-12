const list = campaigns();
document.getElementById('popular').innerHTML = list.slice(0, 2).map(card).join('');
document.getElementById('all').innerHTML = list.map(c => `<a class="tr cols-4" href="campaign.html?id=${c.id}"><div>${c.title}</div><div class="right mono green">${c.raised} ETH</div><div class="right mono muted">${c.goal} ETH</div><div class="right">${status(c)}</div></a>`).join('');
if (user()) document.getElementById('createBtn').innerHTML = '<a class="btn btn-primary" href="create.html">+ Создать кампанию</a>';
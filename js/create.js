if (!user()) {
   alert('Сначала войдите');
   location.href = 'auth.html'
}
createForm.onsubmit = e => {
   e.preventDefault();
   const d = Math.max(0, Math.ceil((new Date(endDate.value) - Date.now()) / 86400000));
   const all = campaigns();
   all.unshift({
      id: Date.now(),
      title: title.value,
      description: description.value,
      goal: Number(goal.value),
      raised: 0,
      daysLeft: d,
      owner: user().address,
      status: 'active',
      contributions: [],
      dividendHistory: []
   });
   saveCampaigns(all);
   alert('Кампания создана');
   location.href = 'dashboard.html'
};
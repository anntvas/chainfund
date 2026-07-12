document.getElementById('authForm').onsubmit = e => {
   e.preventDefault();
   localStorage.setItem('user', JSON.stringify({
      address: '0xA8F2...D631',
      username: username.value || 'user',
      firstName: firstName.value,
      lastName: lastName.value
   }));
   location.href = 'index.html'
};
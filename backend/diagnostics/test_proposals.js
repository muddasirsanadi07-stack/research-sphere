fetch('http://localhost:5005/api/proposals')
    .then(res => res.text())
    .then(text => console.log('Response:', text))
    .catch(err => console.error('Fetch error:', err));

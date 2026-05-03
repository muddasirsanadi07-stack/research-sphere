fetch('http://localhost:5005/api/entrepreneurship')
    .then(res => res.text())
    .then(text => {
        try {
            const data = JSON.parse(text);
            console.log('Parsed JSON successfully. Array length:', Array.isArray(data) ? data.length : 'Not an array');
            console.log('First item:', data[0]);
        } catch(e) {
            console.log('Response is not valid JSON:', text);
        }
    })
    .catch(err => console.error('Fetch error:', err));

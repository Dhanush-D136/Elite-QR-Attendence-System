const http = require('http');

const data = JSON.stringify({
  email: 'vel',
  password: 'vel'
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', body);
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  }
);

req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});

req.write(data);
req.end();

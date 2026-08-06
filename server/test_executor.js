const http = require('http');

const data = JSON.stringify({ email: 'admin@company.com', password: 'admin1234' });
const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};

const req = http.request(loginOptions, res => {
  let cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
  if (!cookie) return console.error('No cookie received from login');

  const payload = JSON.stringify({
    intent: 'CREATE_DEPARTMENT',
    parameters: {
      department_name: 'Test Dept ' + Date.now(),
      department_code: 'TD-' + Date.now().toString().slice(-4),
      department_head: 'Admin',
      description: 'Test Dept Description'
    }
  });

  const getOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/chat/execute',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, 'Cookie': cookie }
  };
  
  const req2 = http.request(getOptions, res2 => {
    let body = '';
    res2.on('data', d => body += d);
    res2.on('end', () => {
      console.log('Execute Status:', res2.statusCode);
      console.log('Response:', body);
    });
  });
  req2.write(payload);
  req2.end();
});
req.write(data);
req.end();

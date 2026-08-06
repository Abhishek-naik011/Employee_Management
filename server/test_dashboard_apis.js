const http = require('http');

['/api/employees', '/api/departments', '/api/projects', '/api/roles'].forEach(path => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n=== ${path} ===`);
      console.log('Status Code:', res.statusCode);
      try {
        console.log('Response:', JSON.parse(data));
      } catch (e) {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', e => console.error(`Error fetching ${path}:`, e));
  req.end();
});

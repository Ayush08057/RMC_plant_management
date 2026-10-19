import http from 'node:http';

const server = http.createServer((req, res) => {
  const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
  const target = `http://${host}:3000${req.url || '/'}`;
  res.writeHead(307, { Location: target });
  res.end(`Redirecting to ${target}`);
});

server.listen(5173, '0.0.0.0', () => {
  console.log('Port forwarder active: http://localhost:5173 -> http://localhost:3000');
});

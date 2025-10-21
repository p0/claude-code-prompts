#!/usr/bin/env tsx

import http from 'http';

let capturedData: any = null;

const server = http.createServer((req, res) => {
  console.log(`\nReceived ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));

  // Match /v1/messages with or without query parameters
  const url = req.url || '';
  const isMessagesEndpoint = req.method === 'POST' && url.startsWith('/v1/messages');

  if (isMessagesEndpoint) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nCaptured request body (first 500 chars):');
        console.log(JSON.stringify(data, null, 2).substring(0, 500));

        capturedData = data;

        // Send back a minimal valid response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'msg_intercepted',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Intercepted' }],
          model: data.model,
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 }
        }));

        console.log('\nResponse sent successfully');
      } catch (error) {
        console.error('Error parsing request:', error);
        res.writeHead(500);
        res.end();
      }
    });
  } else {
    console.log('Not the endpoint we are looking for');
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000);
console.log('Interceptor listening on port 3000');
console.log('Press Ctrl+C to exit\n');

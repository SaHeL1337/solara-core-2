const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/protected-endpoint', ClerkExpressRequireAuth(), (req, res) => {
  res.json({ message: 'You are authorized' });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});

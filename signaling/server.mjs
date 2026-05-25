/**
 * y-webrtc signaling server
 * Peers use this to discover each other; after that WebRTC is direct P2P.
 * Deploy on Render (free tier) — it supports persistent WebSocket connections.
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT          = process.env.PORT || 4444;
const PING_INTERVAL = 30_000; // 30 s keep-alive

// topicName → Set<WebSocket>
const topics = new Map();

function send(conn, msg) {
  if (conn.readyState === 1 /* OPEN */) {
    try { conn.send(JSON.stringify(msg)); } catch { conn.close(); }
  }
}

const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Archi-Flow signaling server OK');
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (conn) => {
  const subscribed = new Set();
  let closed        = false;
  let pongReceived  = true;

  const ping = setInterval(() => {
    if (!pongReceived) { conn.close(); clearInterval(ping); return; }
    pongReceived = false;
    try { conn.ping(); } catch { conn.close(); }
  }, PING_INTERVAL);

  conn.on('pong', () => { pongReceived = true; });

  conn.on('close', () => {
    closed = true;
    clearInterval(ping);
    for (const topic of subscribed) {
      const subs = topics.get(topic);
      if (subs) { subs.delete(conn); if (!subs.size) topics.delete(topic); }
    }
    subscribed.clear();
  });

  conn.on('message', (raw) => {
    if (closed) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg?.type) return;

    switch (msg.type) {
      case 'subscribe':
        for (const t of msg.topics || []) {
          if (typeof t !== 'string') continue;
          if (!topics.has(t)) topics.set(t, new Set());
          topics.get(t).add(conn);
          subscribed.add(t);
        }
        break;

      case 'unsubscribe':
        for (const t of msg.topics || []) {
          topics.get(t)?.delete(conn);
          subscribed.delete(t);
        }
        break;

      case 'publish':
        if (msg.topic) {
          for (const peer of topics.get(msg.topic) || []) {
            send(peer, msg);
          }
        }
        break;

      case 'ping':
        send(conn, { type: 'pong' });
        break;
    }
  });
});

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

httpServer.listen(PORT, () => {
  console.log(`Signaling server listening on :${PORT}`);
});

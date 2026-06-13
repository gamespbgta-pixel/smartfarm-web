const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// สั่งให้ดึงไฟล์ HTML, CSS, JS จากโฟลเดอร์ public มาแสดงผล
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    
    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        // ส่งข้อมูลต่อกระจายไปยังทุกเครื่องที่เชื่อมต่อ
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

server.listen(port, () => {
    console.log(`เซิร์ฟเวอร์ระบบฟาร์มอัจฉริยะกำลังรันบนพอร์ต ${port}`);
});
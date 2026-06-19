const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ให้เซิร์ฟเวอร์ดึงไฟล์ในโฟลเดอร์ public มาแสดงผล
app.use(express.static(path.join(__dirname, 'public')));

// ส่งไฟล์ index.html (หน้า Login) เป็นหน้าแรกสุด
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    
    ws.on('message', (message) => {
        const msgString = message.toString('utf8');
        console.log(`Received: ${msgString}`);
        
        // กระจายข้อมูลไปยังเครื่องอื่น (บอร์ด ESP32 และหน้าเว็บ Dashboard)
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
                client.send(msgString);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(port, () => {
    console.log(`เซิร์ฟเวอร์ระบบฟาร์มอัจฉริยะกำลังรันบนพอร์ต ${port}`);
});

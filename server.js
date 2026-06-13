const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// สำคัญที่สุด: บรรทัดนี้จะสั่งให้เซิร์ฟเวอร์วิ่งไปดึงไฟล์ในโฟลเดอร์ public มาแสดงผล
app.use(express.static(path.join(__dirname, 'public')));

// ดักจับหน้าแรกสุด ถ้าคนเข้าเว็บมา ให้ส่งไฟล์ index.html (หน้า Login) ไปแสดงผล
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    
    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        // กระจายข้อมูลไปยังทุกเครื่องที่เชื่อมต่ออยู่ (เช่น บอร์ด ESP32 และหน้าเว็บ Dashboard)
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
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// ตั้งค่า Supabase (ใช้ Service Role Key เพื่อสิทธิ์ในการเขียนข้อมูล)
const supabase = createClient(
  '', 
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'
);

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        const msgString = message.toString('utf8');
        let data;
        
        try {
            data = JSON.parse(msgString);
        } catch (e) { return; }

        // 1. ถ้าเป็นข้อมูลอุณหภูมิ ให้บันทึกลง Supabase
        if (data.type === 'temperature') {
            await supabase.from('temperature_logs').insert([{ 
                value: data.value, 
                created_at: new Date().toISOString() 
            }]);
        }

        // 2. กระจายข้อมูล (Broadcast) ให้ทุกเครื่องที่เชื่อมต่ออยู่
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msgString);
            }
        });
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

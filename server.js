```js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// ==================================================
// Supabase
// ==================================================

// ตั้งค่าใน Render > Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[ERROR] ไม่พบ SUPABASE_URL หรือ SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(
    https://zweosffxlaghnrvimdwx.supabase.co,
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZW9zZmZ4bGFnaG5ydmltZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDU0MDgsImV4cCI6MjA5NzUyMTQwOH0.7mlHv9Vl5mo0RLRFUfDB1D75L3OaHKoqpBNh0xfG2JE
);

// ==================================================
// Express
// ==================================================

app.use(express.static(path.join(__dirname, 'public')));

// ==================================================
// HTTP Server
// ==================================================

const server = http.createServer(app);

// ==================================================
// WebSocket Server
// ==================================================

const wss = new WebSocket.Server({
    server
});


// ==================================================
// WebSocket Connection
// ==================================================

wss.on('connection', (ws) => {

    console.log('[WebSocket] Client connected');

    // ------------------------------------------------
    // Message
    // ------------------------------------------------

    ws.on('message', async (message) => {

        const msgString = message.toString('utf8');

        let data;

        // ------------------------------------------------
        // JSON
        // ------------------------------------------------

        try {
            data = JSON.parse(msgString);
        } catch (error) {

            console.log('[WebSocket] Invalid JSON');

            return;
        }


        console.log('[WebSocket] Receive:', data);


        // ==================================================
        // 1. BROADCAST ทันที
        // ==================================================
        //
        // สำคัญ:
        // ส่งข้อมูลให้ Web / ESP32 ก่อน
        // ไม่รอ Supabase
        //
        // ช่วยลดความหน่วงในการควบคุม Relay
        // ==================================================

        wss.clients.forEach((client) => {

            if (client.readyState === WebSocket.OPEN) {

                client.send(msgString);
            }

        });


        // ==================================================
        // 2. SENSOR DATA
        // ==================================================

        if (data.type === 'sensor') {

            const temperature = data.temperature;
            const foodLevel = data.food_level;
            const waterLevel = data.water_level;


            console.log(
                `[SENSOR] Temp=${temperature}°C | Food=${foodLevel}% | Water=${waterLevel}%`
            );


            // ------------------------------------------------
            // บันทึกลง Supabase
            // ------------------------------------------------

            try {

                const { error } = await supabase
                    .from('sensor_logs')
                    .insert([
                        {
                            temperature: temperature,
                            food_level: foodLevel,
                            water_level: waterLevel,
                            created_at: new Date().toISOString()
                        }
                    ]);


                if (error) {

                    console.error(
                        '[Supabase] Insert Error:',
                        error.message
                    );

                } else {

                    console.log('[Supabase] Sensor saved');

                }

            } catch (error) {

                console.error(
                    '[Supabase] Error:',
                    error.message
                );

            }

        }


        // ==================================================
        // 3. TEMPERATURE แบบเก่า
        // ==================================================
        //
        // รองรับกรณี Client เดิมส่ง:
        //
        // {
        //   "type": "temperature",
        //   "value": 30.5
        // }
        //
        // ==================================================

        else if (data.type === 'temperature') {

            try {

                const { error } = await supabase
                    .from('temperature_logs')
                    .insert([
                        {
                            value: data.value,
                            created_at: new Date().toISOString()
                        }
                    ]);


                if (error) {

                    console.error(
                        '[Supabase] Temperature Error:',
                        error.message
                    );

                } else {

                    console.log(
                        '[Supabase] Temperature saved'
                    );

                }

            } catch (error) {

                console.error(
                    '[Supabase] Error:',
                    error.message
                );

            }

        }


        // ==================================================
        // 4. ESP32 ONLINE
        // ==================================================

        else if (data.type === 'esp32_online') {

            console.log('[ESP32] Online');

        }


        // ==================================================
        // 5. STATUS
        // ==================================================

        else if (data.type === 'status') {

            console.log('[STATUS] Relay status received');

        }


        // ==================================================
        // 6. MODE STATUS
        // ==================================================

        else if (data.type === 'mode_status') {

            console.log(
                '[MODE]',
                data.mode
            );

        }


        // ==================================================
        // 7. PING
        // ==================================================

        else if (data.type === 'ping') {

            console.log('[WebSocket] Ping');

        }

    });


    // ------------------------------------------------
    // Client Disconnect
    // ------------------------------------------------

    ws.on('close', () => {

        console.log('[WebSocket] Client disconnected');

    });


    // ------------------------------------------------
    // Error
    // ------------------------------------------------

    ws.on('error', (error) => {

        console.error(
            '[WebSocket] Error:',
            error.message
        );

    });

});


// ==================================================
// WebSocket Server Error
// ==================================================

wss.on('error', (error) => {

    console.error(
        '[WebSocket Server] Error:',
        error.message
    );

});


// ==================================================
// Start Server
// ==================================================

server.listen(port, () => {

    console.log(
        `[Server] Running on port ${port}`
    );

});
```

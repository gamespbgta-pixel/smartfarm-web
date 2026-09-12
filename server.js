const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// ==================================================
// SUPABASE
// ==================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[ERROR] ไม่พบ SUPABASE_URL หรือ SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==================================================
// EXPRESS
// ==================================================

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

// ==================================================
// HTTP SERVER
// ==================================================

const server = http.createServer(app);

// ==================================================
// WEBSOCKET SERVER
// ==================================================

const wss = new WebSocket.Server({
    server
});

// ==================================================
// WEBSOCKET CONNECTION
// ==================================================

wss.on('connection', (ws) => {

    console.log('[WebSocket] Client connected');

    // ==================================================
    // MESSAGE
    // ==================================================

    ws.on('message', (message) => {

        const msgString =
            message.toString('utf8');

        let data;

        // ==================================================
        // JSON PARSE
        // ==================================================

        try {

            data = JSON.parse(msgString);

        } catch (error) {

            console.error(
                '[WebSocket] Invalid JSON'
            );

            return;
        }

        console.log(
            '[WebSocket] Receive:',
            data
        );

        // ==================================================
        // BROADCAST ทันที
        // ==================================================
        //
        // สำคัญมากสำหรับ Relay
        //
        // ไม่รอ Supabase
        // ไม่ใช้ await
        //
        // ส่งคำสั่งให้ Client ทันที
        // ==================================================

        wss.clients.forEach((client) => {

            if (
                client.readyState ===
                WebSocket.OPEN
            ) {

                try {

                    client.send(msgString);

                } catch (error) {

                    console.error(
                        '[WebSocket] Send Error:',
                        error.message
                    );

                }

            }

        });

        // ==================================================
        // CONTROL
        // ==================================================
        //
        // Relay:
        // ส่งออกไปทันทีด้านบนแล้ว
        //
        // ไม่ต้องทำ Supabase ตรงนี้
        // เพราะ History ถูกบันทึกจาก control.html
        //
        // ==================================================

        if (data.type === 'control') {

            console.log(
                '[CONTROL] Device:',
                data.device,
                '| Status:',
                data.status
            );

            return;
        }

        // ==================================================
        // SENSOR
        // ==================================================

        if (data.type === 'sensor') {

            const temperature =
                data.temperature;

            const foodLevel =
                data.food_level;

            const waterLevel =
                data.water_level;

            console.log(
                `[SENSOR] Temp=${temperature}°C | Food=${foodLevel}% | Water=${waterLevel}%`
            );

            // ==================================================
            // SAVE SENSOR
            // ==================================================
            //
            // ทำงานเบื้องหลัง
            // ไม่ขวาง WebSocket
            //
            // ==================================================

            supabase
                .from('sensor_logs')
                .insert([
                    {
                        temperature:
                            temperature,

                        food_level:
                            foodLevel,

                        water_level:
                            waterLevel,

                        created_at:
                            new Date().toISOString()
                    }
                ])
                .then(({ error }) => {

                    if (error) {

                        console.error(
                            '[Supabase] Sensor Insert Error:',
                            error.message
                        );

                    } else {

                        console.log(
                            '[Supabase] Sensor saved'
                        );

                    }

                })
                .catch((error) => {

                    console.error(
                        '[Supabase] Sensor Error:',
                        error.message
                    );

                });

            return;
        }

        // ==================================================
        // TEMPERATURE แบบเก่า
        // ==================================================

        if (data.type === 'temperature') {

            console.log(
                '[TEMPERATURE]',
                data.value
            );

            // ==================================================
            // SAVE TEMPERATURE
            // ==================================================
            //
            // ทำงานเบื้องหลัง
            // ==================================================

            supabase
                .from('temperature_logs')
                .insert([
                    {
                        value:
                            data.value,

                        created_at:
                            new Date().toISOString()
                    }
                ])
                .then(({ error }) => {

                    if (error) {

                        console.error(
                            '[Supabase] Temperature Insert Error:',
                            error.message
                        );

                    } else {

                        console.log(
                            '[Supabase] Temperature saved'
                        );

                    }

                })
                .catch((error) => {

                    console.error(
                        '[Supabase] Temperature Error:',
                        error.message
                    );

                });

            return;
        }

        // ==================================================
        // ESP32 ONLINE
        // ==================================================

        if (data.type === 'esp32_online') {

            console.log(
                '[ESP32] Online'
            );

            return;
        }

        // ==================================================
        // STATUS
        // ==================================================

        if (data.type === 'status') {

            console.log(
                '[STATUS] Relay status received'
            );

            return;
        }

        // ==================================================
        // MODE STATUS
        // ==================================================

        if (data.type === 'mode_status') {

            console.log(
                '[MODE]',
                data.mode
            );

            return;
        }

        // ==================================================
        // PING
        // ==================================================

        if (data.type === 'ping') {

            console.log(
                '[WebSocket] Ping'
            );

            return;
        }

    });

    // ==================================================
    // CLIENT DISCONNECT
    // ==================================================

    ws.on('close', () => {

        console.log(
            '[WebSocket] Client disconnected'
        );

    });

    // ==================================================
    // CLIENT ERROR
    // ==================================================

    ws.on('error', (error) => {

        console.error(
            '[WebSocket] Error:',
            error.message
        );

    });

});

// ==================================================
// WEBSOCKET SERVER ERROR
// ==================================================

wss.on('error', (error) => {

    console.error(
        '[WebSocket Server] Error:',
        error.message
    );

});

// ==================================================
// START SERVER
// ==================================================

server.listen(port, () => {

    console.log(
        `[Server] Running on port ${port}`
    );

});

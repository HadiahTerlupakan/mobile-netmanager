const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
    path: "/api/socket",
    auth: {
        userId: "test-mitra-123",
        userRole: "MITRA"
    },
    transports: ["websocket", "polling"],
    reconnection: false
});

socket.on("connect", () => {
    console.log("Connected successfully with socket id:", socket.id);
    socket.disconnect();
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

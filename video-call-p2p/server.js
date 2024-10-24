import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server);
const allusers = {};

// Get the directory path of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Exposing public directory to outside world
app.use(express.static(join(__dirname, 'public')));

// Handle incoming HTTP request
app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(join(__dirname, "/app/index.html"));
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log(`Someone connected to socket server with socket id: ${socket.id}`);

    socket.on("join-user", (username) => {
        console.log(`${username} joined the socket connection`);
        allusers[username] = { username, id: socket.id };

        // Inform everyone that a user has joined
        io.emit("joined", allusers);
    });

    socket.on("offer", ({ from, to, offer }) => {
        if (allusers[to]) {
            console.log({ from, to, offer });
            io.to(allusers[to].id).emit("offer", { from, to, offer });
        } else {
            console.log(`User ${to} not found.`);
        }
    });

    socket.on("answer", ({ from, to, answer }) => {
        if (allusers[from]) {
            io.to(allusers[from].id).emit("answer", { from, to, answer });
        }
    });

    socket.on("end-call", ({ from, to }) => {
        if (allusers[to]) {
            io.to(allusers[to].id).emit("end-call", { from, to });
        }
    });

    socket.on("call-ended", (caller) => {
        const [from, to] = caller;
        if (allusers[from] && allusers[to]) {
            io.to(allusers[from].id).emit("call-ended", caller);
            io.to(allusers[to].id).emit("call-ended", caller);
        }
    });

    socket.on("icecandidate", (candidate) => {
        console.log({ candidate });
        // Broadcast to other peers
        socket.broadcast.emit("icecandidate", candidate);
    });
});

server.listen(9000, () => {
    console.log(`Server is listening on port 9000`);
});

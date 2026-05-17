const helmet = require('helmet')
const rateLimit = require('express-rate-limit') // use "node": "14.x" in glitch
const cookieParser = require("cookie-parser")
const path = require("path")

const express = require("express");
const app = express()

const http = require("http")
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server)

require('dotenv').config()
const dev = process.env.NODE_ENV === 'development'

/* routes */
const api = require('./routes/api')(io)

/* middleware */
const secureHttps = require("./middleware/secureHttps")
const removeLastSlash = require("./middleware/removeLastSlash")


app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://cdn.socket.io"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://unpkg.com/"],
            mediaSrc: ["'self'", "blob:", "data:", "https://firebasestorage.googleapis.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            
            // Fix for Error 1: Allow images from self, data URIs, blobs, and your external image host
            imgSrc: ["'self'", "data:", "blob:", "https://unpkg.com/"], 
            
            // Fix for Error 2: Explicitly define connection sources, including 'blob:'
            connectSrc: ["'self'", "https://cdn.socket.io", "blob:"] 
        },
    }
}));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: (dev) ? 99999999 : 200,
    message: 'Too many requests from this IP, please try again later',
    handler: (req, res) => res.sendStatus(429)
}))

app.set("trust proxy", true)
app.use(secureHttps(dev))
app.use(cookieParser())
app.use(removeLastSlash)

app.use(express.static(path.join(__dirname, "static")))


app.get("/", (req, res) => {
    res.send("Ciao! Questo è il server di Pitagora.")
})

io.on("connection", (socket) => {
    socket.on("join-session", sessionId => {
        if (sessionId)
            socket.join(sessionId)
    })
    //socket.on("disconnect", () => {})
})

app.use("/", api)


app.get(/(.*)/, (req, res) => {
    res.status(404).send("Pagina non trovata :'(")
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.sendStatus(500)
})

const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log(`server in ascolto alla porta ${port}...`)
})
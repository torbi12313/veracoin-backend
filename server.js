const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = "veracoin_secret";

// 🔴 ACA DESPUES VAMOS A PONER TU MONGODB
mongoose.connect(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    balance: { type: Number, default: 10000 },
    lastYield: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// Registro
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ message: "Usuario creado" });
});

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "No existe" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Incorrecto" });

    const token = jwt.sign({ id: user._id }, SECRET);
    res.json({ token });
});

// Middleware
function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "No autorizado" });

    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
}

// Balance
app.get("/balance", auth, async (req, res) => {
    const user = await User.findById(req.userId);
    res.json({ balance: user.balance });
});

// Rendimiento diario 2%
app.post("/yield", auth, async (req, res) => {
    const user = await User.findById(req.userId);

    const now = new Date();
    const diff = (now - user.lastYield) / (1000 * 60 * 60 * 24);

    if (diff >= 1) {
        const gain = user.balance * 0.02;
        user.balance += gain;
        user.lastYield = now;
        await user.save();
        res.json({ gain });
    } else {
        res.json({ message: "Ya aplicado hoy" });
    }
});

app.get("/", (req,res)=>{
    res.send("VERACOIN BACKEND ACTIVO");
});

app.listen(process.env.PORT || 3000, () =>
    console.log("Servidor corriendo")
);

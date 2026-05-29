import express from "express"

const app = express()
app.use(express.json())



app.post("/api/reset", ()=>{})
app.post("/api/user", ()=>{})
app.post("/api/orders", ()=>{})
app.post("/api/mark-price", ()=>{})
app.post("/api/funding", ()=>{})

app.get("/api/orderbook/:symbol", ()=>{})
app.get("/api/users/:userId/balance", ()=>{})
app.get("/api/users/:userId/positions", ()=>{})
app.get("/api/insurance-fund/:symbol", ()=>{})


app.listen(3000, ()=>{
    console.log("listening to port 3000")
})
import express from "express";
import { LinkList } from "js-sdsl";

const app = express();
app.use(express.json());

type Orders = {
  userId: string;
  symbol: string;
  side: "long" | "short";
  type: "limit" | "market";
  price: number;
  quantity: number;
  leverage: number;
  postOnly: boolean;
  clientOrderId: string;
};
type singleOrder = {
  asks: Map<number, Orders[]>;
  bids: Map<number, Orders[]>;
  asksSortedArray: number[];
  bidsSortedArray: number[];
};
type OrderBook = {
  [marketIt: string]: singleOrder;
};

type Fills = {
  price: number;
  quantity: number;
  makerOrderId: string;
  makerUserId: string;
  takerUserId: string;
};

const User: any = [];
const OrderBook: OrderBook = {
  "BTC-PERP": {
    asks: new Map<number, Orders[]>(),
    bids: new Map<number, Orders[]>(),
    asksSortedArray: [],
    bidsSortedArray: [],
  },
};
const Fills: Fills[] = [];

function validateAndAddOrderToUser(order: Orders) {
  const requiredMargin = (order.price * order.quantity) / order.leverage;

  for (let user of User) {
    if (user.userId === order.userId) {
      if (user.balance.available < requiredMargin) {
        user.balance.available -= requiredMargin;
        user.balance.lockedBalance += requiredMargin;
        user.orders.push(order);
        return true;
      }
    }
  }

  return false;
}

app.post("/api/reset", (req, res) => {
    console.log("hit reset")
    
    res.status(200).json({ "ok": true })
});
app.post("/api/users", (req, res) => {
  const { userId, initialBalance } = req.body;
  const user = {
    userId: userId,
    balance: {
      available: initialBalance,
      lockedBalance: 0,
    },
    positions: [],
    orders: [],
  };
  User.push(user);
  console.log("user Hit and created", user)
  res.status(200).json({ "userId": userId });
});
app.post("/api/orders", (req, res) => {
  const {
    userId,
    symbol,
    side,
    type,
    price,
    quantity,
    leverage,
    postOnly,
    clientOrderId,
  } = req.body;

  let remainingQty = quantity;

  const order: Orders = {
    userId: userId,
    symbol: symbol,
    side: side,
    type: type,
    price: price,
    quantity: quantity,
    leverage: leverage,
    postOnly: postOnly,
    clientOrderId: clientOrderId,
  };

  console.log("Order Incomming ====> ", order)

  const validation = validateAndAddOrderToUser(order);

  if (!validation) {
    res.status(200).json({ message: "order is invalid" });
  }

  const book = OrderBook[symbol];
  if (!book) {
    throw new Error("book for this MarketIt does not exists");
  }
  if (type === "limit") {
    if (side === "long") {
      const bookSide = book.asks;
      while (remainingQty > 0) {
        for (let askPrice of book.asksSortedArray) {
          if (askPrice <= price) {
            const list = bookSide.get(askPrice);
            if (!list) {
              throw new Error("");
            }
            for (let singleOrder of list) {
              const tradeQty = Math.min(singleOrder?.quantity, remainingQty);
              singleOrder.quantity -= tradeQty;
              remainingQty -= tradeQty;
              const fillObject = {
                price: price,
                quantity: tradeQty,
                makerOrderId: clientOrderId,
                makerUserId: singleOrder.userId,
                takerUserId: userId,
              };
              Fills.push(fillObject);

              if (singleOrder.quantity === 0) {
                list.filter((item) => item !== singleOrder);
                for (let user of User) {
                  if (user.userId === singleOrder.userId) {
                    user.positions.push(fillObject);
                  }
                }
              }
              if (remainingQty === 0) {
                for (let user of User) {
                  if (user.userId === userId) {
                    user.positions.push(fillObject);
                  }
                  let responseFill: Fills[] = [];
                  for (let fill of Fills) {
                    if (fill.makerOrderId === clientOrderId) {
                      responseFill.push(fill);
                    }
                  }
                  res.status(200).json({
                    orderId: clientOrderId,
                    status: "filled",
                    reason: "optional reason",
                    fills: responseFill,
                    remainingQuantity: 0,
                    cancelledQuantity: 0,
                    margin: {
                      locked: 525,
                      used: 525,
                      released: 0,
                    },
                  });
                }
              }
            }
          } else {
            book.bidsSortedArray.push(price);
            book.bidsSortedArray.sort((a, b) => b - a);
            const newOrderArray = [];
            newOrderArray.push(order);
            book.bids.set(price, newOrderArray);
          }
        }
      }
    } else {
    }
  } else {
    if (side === "long") {
      const bookSide = book.asks;
      while(remainingQty > 0) {
        for (let askPrice of book.asksSortedArray) {
        const list = bookSide.get(askPrice);
        if (!list) {
          throw new Error("");
        }
        for (let singleOrder of list) {
          const tradeQty = Math.min(singleOrder?.quantity, remainingQty);
          singleOrder.quantity -= tradeQty;
          remainingQty -= tradeQty;
          const fillObject = {
            price: price,
            quantity: tradeQty,
            makerOrderId: clientOrderId,
            makerUserId: singleOrder.userId,
            takerUserId: userId,
          };
          Fills.push(fillObject);

          if (singleOrder.quantity === 0) {
            list.filter((item) => item !== singleOrder);
            for (let user of User) {
              if (user.userId === singleOrder.userId) {
                user.positions.push(fillObject);
              }
            }
          }
          if (remainingQty === 0) {
            for (let user of User) {
              if (user.userId === userId) {
                user.positions.push(fillObject);
              }
              let responseFill: Fills[] = [];
              for (let fill of Fills) {
                if (fill.makerOrderId === clientOrderId) {
                  responseFill.push(fill);
                }
              }
              res.status(200).json({
                orderId: clientOrderId,
                status: "filled",
                reason: "optional reason",
                fills: responseFill,
                remainingQuantity: 0,
                cancelledQuantity: 0,
                margin: {
                  locked: 525,
                  used: 525,
                  released: 0,
                },
              });
            }
          }
        }
      }
      }
    } else {
    }
  }
});
app.post("/api/mark-price", (req, res) => {});
app.post("/api/funding", (req, res) => {});

app.get("/api/orderbook/:symbol", (req, res) => {
    const {symbol} = req.params
    const book = OrderBook[symbol]
    res.status(200).json(book)
});

app.get("/api/users/:userId/balance", (req, res) => {
    const {userId} = req.params
    for(let user of User){
        if(user.userId === userId){
            res.status(200).json({user})
        }
    }
});
app.get("/api/users/:userId/positions", (req, res) => {
    const {userId} = req.params
    for(let user of User){
        if(user.userId === userId){
            const position = user.position
            res.status(200).json({position})
        }
    }
});
app.get("/api/insurance-fund/:symbol", (req, res) => {});

app.listen(3000, () => {
  console.log("listening to port 3000");
});

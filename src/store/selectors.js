import { createSelector } from "reselect";
import { get, groupBy, reject, minBy, maxBy } from "lodash";
import { ethers } from "ethers";
import moment from "moment";

const events = state => get(state, "exchange.events")
const tokens = state => get(state, "tokens.contracts")
const account = state => get(state, "provider.account")
const allOrders = state => get(state, "exchange.allOrders.data", [])
const cancelledOrders = state => get(state, "exchange.cancelledOrders.data", [])
const filledOrders = state => get(state, "exchange.filledOrders.data", [])

const openOrders = state => {
  const all = allOrders(state)
  const filled = filledOrders(state)
  const cancelled = cancelledOrders(state)

  const openOrders = reject(all, (order) => {
    const orderFilled = filled.some((o) => o._id.toString() === order._id.toString())
    const orderCancelled = cancelled.some((o) => o._id.toString() === order._id.toString())
    return (orderFilled || orderCancelled)
  })

  return openOrders
}

const decorateOrder = (order, tokens) => {
  let token0Amount, token1Amount

  // Reminder: MT should be considered token0, mETH/mDAI should be considered token1
  if (order._tokenGive === tokens[0].address) {
    token0Amount = order._amountGive // The amount of MT we're giving
    token1Amount = order._amountGet // The amount of mETH/mDAI we want
  } else {
    token0Amount = order._amountGet // The amount of MT we want
    token1Amount = order._amountGive // The amount of mETH/mDAI we're giving
  }

  // Calculate token price and round it to 5 decimal places
  const precision = 100000
  let tokenPrice = token1Amount / token0Amount
  tokenPrice = Math.round(tokenPrice * precision) / precision

  return ({
    ...order,
    _token0Amount: ethers.utils.formatUnits(token0Amount, 18),
    _token1Amount: ethers.utils.formatUnits(token1Amount, 18),
    _tokenPrice: tokenPrice,
    _formattedTimestamp: moment.unix(order._timestamp).format()
  })
}

export const orderBookSelector = createSelector(openOrders, tokens, (orders, tokens) => {

  if (!tokens[0] || !tokens[1]) { return }

  // Filter orders by selected tokens
  orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
  orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

  // Decorate orders
  orders = decorateOrderBookOrders(orders, tokens)

  // Group orders by order type
  orders = groupBy(orders, "_orderType")

  // Fetch buy orders
  const buyOrders = get(orders, "buy", [])

  // Sort buy orders by token price (from highest price to lowest price)
  orders = {
    ...orders,
    buyOrders: buyOrders.sort((a, b) => b._tokenPrice - a._tokenPrice)
  }
  
  // Fetch sell orders
  const sellOrders = get(orders, "sell", [])

  // Sort sell orders by token price (from highest price to lowest price)
  orders = {
    ...orders,
    sellOrders: sellOrders.sort((a, b) => b._tokenPrice - a._tokenPrice)
  }

  return orders 
})

const decorateOrderBookOrders = (orders, tokens) => {
  return (
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateOrderBookOrder(order, tokens)
      return order
    })
  )
}

const GREEN = "#25CE8F"
const RED = "#F45353"

const decorateOrderBookOrder = (order, tokens) => {
  const orderType = order._tokenGive === tokens[1].address ? "buy" : "sell"

  return ({
    ...order,
    _orderType: orderType,
    _orderTypeClass: orderType === "buy" ? GREEN : RED,
    _orderFillAction: orderType === "buy" ? "sell" : "buy"
  })
}

export const priceChartSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders by selected tokens
    orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
    orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

    // Sort orders by date ascending
    orders = orders.sort((a, b) => a._timestamp - b._timestamp)

    // Decorate orders
    orders = orders.map((o) => decorateOrder(o, tokens))

    // Get last two orders for final price & price change
    let secondLastOrder, lastOrder
    [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)

    // Get last order price
    const lastPrice = get(lastOrder, "_tokenPrice", 0)

    // Get second last order price
    const secondLastPrice = get(secondLastOrder, "_tokenPrice", 0)

    return ({
      lastPrice,
      lastPriceChange: lastPrice >= secondLastPrice ? "+" : "-",
      series: [{
        data: buildGraphData(orders)
      }]
    })

  }
)

const buildGraphData = (orders) => {
  // Group by timestamp
  orders = groupBy(orders, (o) => moment.unix(o._timestamp).startOf("hour").format())

  const hours = Object.keys(orders)

  const graphData = hours.map((hour) => {
    // Fetch all orders from current hour
    const group = orders[hour]

    // Calculate price values: open, high, low, close
    const open = group[0]
    const high = maxBy(group, "_tokenPrice")
    const low = minBy(group, "_tokenPrice")
    const close = group[group.length - 1]

    return ({
      x: new Date(hour),
      y: [open._tokenPrice, high._tokenPrice, low._tokenPrice, close._tokenPrice]
    })
  })

  return graphData
}

export const filledOrderSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders by selected tokens
    orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
    orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

    // Step 1: Sort orders by time ascending
    orders = orders.sort((a, b) => a._timestamp - b._timestamp)
    // Step 2: Apply order colors (decorate orders)
    // Step 3: Sort orders by time descending for UI

    // Decorate orders
    orders = decorateFilledOrders(orders, tokens)

    // Sort orders by time descending for display
    orders = orders.sort((a, b) => b._timestamp - a._timestamp)

    return orders
  }
)

const decorateFilledOrders = (orders, tokens) => {
  // Track previous order to compare history
  let previousOrder = orders[0]

  return (
    orders.map((order) => {
      // Decorate each individual order
      order = decorateOrder(order, tokens)
      order = decorateFilledOrder(order, previousOrder)
      previousOrder = order // Update the previous order once it's decorated
      return order
    })
  )
}

const decorateFilledOrder = (order, previousOrder) => {
  return ({
    ...order,
    _tokenPriceClass: tokenPriceClass(order._tokenPrice, order._id, previousOrder)
  })
}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
  // Show green price if only one order exists
  if (previousOrder._id === orderId) {
    return GREEN
  }
  
  // Show green price if order price is higher than previous order
  // Show red price if order price is lower than previous order
  if (previousOrder._tokenPrice <= tokenPrice) {
    return GREEN
  } else {
    return RED
  }
}

export const myOpenOrdersSelector = createSelector(
  account,
  tokens,
  openOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders created by current account 
    orders = orders.filter((o) => o._user === account)

    // Filter orders by selected tokens
    orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
    orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

    // Decorate orders
    orders = decorateMyOpenOrders(orders, tokens)

    // Sort orders by date descending
    orders = orders.sort((a, b) => b._timestamp - a._timestamp)

    return orders
  }
)

const decorateMyOpenOrders = (orders, tokens) => {
  return (
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateMyOpenOrder(order, tokens)
      return order
    })
  )
}

const decorateMyOpenOrder = (order, tokens) => {
  let orderType = order._tokenGive === tokens[1].address ? "buy" : "sell"

  return ({
    ...order,
    _orderType: orderType,
    _orderTypeClass: orderType === "buy" ? GREEN : RED
  })
}

export const myFilledOrdersSelector = createSelector(
  account,
  tokens,
  filledOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1]) { return }

    orders = orders.filter((o) => o._user === account || o._creator === account)

    // Filter orders by selected tokens
    orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
    orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

    // Sort by time descending
    orders = orders.sort((a, b) => b._timestamp - a._timestamp)

    // Decorate orders
    orders = decorateMyFilledOrders(orders, account, tokens)

    return orders
  }
)

const decorateMyFilledOrders = (orders, account, tokens) => {
  return (
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateMyFilledOrder(order, account, tokens)
      return order
    })
  )
}

const decorateMyFilledOrder = (order, account, tokens) => {
  const myOrder = order._creator === account

  let orderType

  if (myOrder) {
    orderType = order._tokenGive === tokens[1].address ? "buy" : "sell"
  } else {
    orderType = order._tokenGive === tokens[1].address ? "sell" : "buy"
  }
  return ({
    ...order,
    _orderType: orderType,
    _orderClass: orderType === "buy" ? GREEN : RED,
    _orderSign: orderType === "buy" ? "+" : "-"
  })
}

export const myEventsSelector = createSelector(
  account,
  events,
  (account, events) => {
    events = events.filter((e) => e.args._user === account)
    return events
  }
)
import { useRef, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { myOpenOrdersSelector, myFilledOrdersSelector } from "../store/selectors"
import Banner from "./Banner"
import { cancelOrder } from "../store/interactions"

const Transactions = () => {
  const [showMyOrders, setShowMyOrders] = useState(true)

  const provider = useSelector(state => state.provider.connection)
  const exchange = useSelector(state => state.exchange.contract)
  const symbols = useSelector(state => state.tokens.symbols)
  const myOpenOrders = useSelector(myOpenOrdersSelector)
  const myFilledOrders = useSelector(myFilledOrdersSelector)

  const dispatch = useDispatch()

  const tradeRef = useRef(null)
  const orderRef = useRef(null)

  const tabHandler = (e) => {
    if(e.target.className !== orderRef.current.className) {
      e.target.className = "tab tab--active"
      orderRef.current.className = "tab"
      setShowMyOrders(false)
    } else {
      e.target.className = "tab tab--active"
      tradeRef.current.className = "tab"
      setShowMyOrders(true)
    }
  }

  const cancelHandler = (order) => {
    cancelOrder(provider, exchange, order, dispatch)
  }

  return (
    <div className="component exchange__transactions">
      {showMyOrders ? (
        <div>
          <div className="component__header flex-between">
            <h2>My Orders</h2>

            <div className="tabs">
              <button onClick={tabHandler} ref={orderRef} className="tab tab--active">Orders</button>
              <button onClick={tabHandler} ref={tradeRef} className="tab">Trades</button>
            </div>
          </div>

          {!myOpenOrders || myOpenOrders.length === 0 ? (
            <Banner text="No open orders" />
          ):(
            <table>
              <thead>
                <tr>
                  <th>{symbols && symbols[0]}</th>
                  <th>{symbols && symbols[1]}/{symbols && symbols[0]}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {myOpenOrders && myOpenOrders.map((order, index) => {
                  return (
                    <tr key={index}>
                      <td style={{ color: `${order._orderTypeClass}`}}>{order._token0Amount}</td>
                      <td>{order._tokenPrice}</td>
                      <td><button className="button--sm" onClick={() => cancelHandler(order)}>Cancel</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

        </div>
      ) : (
        <div>
          <div className="component__header flex-between">
            <h2>My Transactions</h2>
            
            <div className="tabs">
              <button onClick={tabHandler} ref={orderRef} className="tab tab--active">Orders</button>
              <button onClick={tabHandler} ref={tradeRef} className="tab">Trades</button>
            </div> 
          </div>

          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>{symbols && symbols[0]}</th>
                <th>{symbols && symbols[1]}/{symbols && symbols[0]}</th> 
              </tr>
            </thead>
            <tbody>
              {myFilledOrders && myFilledOrders.map((order, index) => {
                return (
                  <tr key={index}>
                    <td>{order._formattedTimestamp}</td>
                    <td style={{ color: `${order._orderClass}`}}>{order._orderSign}{order._token0Amount}</td>
                    <td>{order._tokenPrice}</td> 
                  </tr>
                )
              })}
            </tbody>
          </table>

        </div>
      )}

    </div>
  )
}

export default Transactions
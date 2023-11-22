import { useSelector } from "react-redux"
import { filledOrderSelector } from "../store/selectors"
import Banner from "./Banner"

const Trades = () => {

  const filledOrders = useSelector(filledOrderSelector)
  const symbols = useSelector(state => state.tokens.symbols)

  return (
    <div className="component exchange__trades">
      <div className="component__header flex-between">
        <h2>Trades</h2>
      </div>
      
      {!filledOrders || filledOrders.length === 0 ? (
        <Banner text="No Trades" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>{symbols && symbols[0]}</th>
              <th>{symbols && symbols[1]}/{symbols && symbols[0]}</th>
            </tr>
          </thead>
          <tbody>
            {filledOrders && filledOrders.map((order, index) => {
              return (
                <tr key={index}>
                  <td>{order._formattedTimestamp}</td>
                  <td style={{ color: `${order._tokenPriceClass}`}}>{order._token0Amount}</td>
                  <td>{order._tokenPrice}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Trades
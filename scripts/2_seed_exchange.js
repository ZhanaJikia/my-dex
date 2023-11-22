const config = require("../src/config.json")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 18)
}

async function main() {
  // Fetch accounts from wallet
  const accounts = await ethers.getSigners()

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork()
  console.log("Using chain id:", chainId)

  // Fetch deployed tokens
  const MT = await ethers.getContractAt("Token", config[chainId].MT.address)
  console.log(`MT token fetched from: ${MT.address}\n`)

  const mETH = await ethers.getContractAt("Token", config[chainId].mETH.address)
  console.log(`mETH token fetched from: ${mETH.address}\n`)

  const mDAI = await ethers.getContractAt("Token", config[chainId].mDAI.address)
  console.log(`mDAI token fetched from: ${mDAI.address}\n`)

  // Fetch deployed exchange
  const exchange = await ethers.getContractAt("Exchange", config[chainId].exchange.address)
  console.log(`Exchange fetched from: ${exchange.address}\n`)

  // Give 10,000 mETH to user2 (user1 deployed the contracts and,
  // therefore, has all the tokens in the beginning)
  const amount = tokens(10000)
  const user1 = accounts[0]
  const user2 = accounts[2] // accounts[1] is the feeAccount

  await mETH.connect(user1).transfer(user2.address, amount)
  console.log(`Transferred ${amount} mETH tokens from ${user1.address} to ${user2.address}\n`)

  // user1 approves 10,000 MT
  await MT.connect(user1).approve(exchange.address, amount)
  console.log(`Approved ${amount} MT tokens from ${user1.address}\n`)

  // user1 deposits 10,000 MT
  await exchange.connect(user1).depositToken(MT.address, amount)
  console.log(`Deposited ${amount} MT tokens from ${user1.address}\n`)

  // user2 approves 10,000 mETH
  await mETH.connect(user2).approve(exchange.address, amount)
  console.log(`Approved ${amount} mETH tokens from ${user2.address}\n`)

  // user2 deposits 10,000 mETH
  await exchange.connect(user2).depositToken(mETH.address, amount)
  console.log(`Deposited ${amount} mETH tokens from ${user2.address}\n`)

  /////////////////////////////////////////////////////////////
  // Seed a cancelled order
  //

  let transaction, receipt, orderId

  // user1 makes order to get some mETH back
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), MT.address, tokens(5))
  receipt = await transaction.wait()
  console.log(`Made order from ${user1.address}\n`)

  // user1 decides to cancel order
  orderId = receipt.events[0].args._id
  await exchange.connect(user1).cancelOrder(orderId)
  console.log(`Cancelled order from ${user1.address}\n`)

  /////////////////////////////////////////////////////////////
  // Seed filled orders
  //

  // user1 makes order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), MT.address, tokens(10))
  receipt = await transaction.wait()
  console.log(`Made order from ${user1.address}\n`)

  // user2 fills order
  orderId = receipt.events[0].args._id
  await exchange.connect(user2).fillOrder(orderId)
  console.log(`Filled order from ${user2.address}\n`)

  // user1 makes another order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(50), MT.address, tokens(15))
  receipt = await transaction.wait()
  console.log(`Made order from ${user1.address}\n`)

  // user2 fills another order
  orderId = receipt.events[0].args._id
  await exchange.connect(user2).fillOrder(orderId)
  console.log(`Filled order from ${user2.address}\n`)

  // user1 makes final order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(200), MT.address, tokens(20))
  receipt = await transaction.wait()
  console.log(`Made order from ${user1.address}\n`)

  // user2 fills another order
  orderId = receipt.events[0].args._id
  await exchange.connect(user2).fillOrder(orderId)
  console.log(`Filled order from ${user2.address}\n`)

  /////////////////////////////////////////////////////////////
  // Seed open orders
  //

  // user1 makes 10 orders
  for(let i=1; i<=10; i++) {
    await exchange.connect(user1).makeOrder(mETH.address, tokens(10 * i), MT.address, tokens(10))
    console.log(`Made order from ${user1.address}\n`)
  }

  // user2 makes 10 orders
  for(let i=1; i<=10; i++) {
    await exchange.connect(user2).makeOrder(MT.address, tokens(10 * i), mETH.address, tokens(10))
    console.log(`Made order from ${user2.address}\n`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
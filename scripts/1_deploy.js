const { ethers } = require("hardhat");

async function main() {
  console.log("Preparing deployment...\n")
  
  // Fetch contracts to deploy
  const Token = await ethers.getContractFactory("Token")
  const Exchange = await ethers.getContractFactory("Exchange")

  // Fetch accounts
  const accounts = await ethers.getSigners()

  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`)

  // Deploy the contracts
  const MT = await Token.deploy("My Token", "MT", "1000000")
  console.log(`MT deployed at: ${MT.address}`)

  const mETH = await Token.deploy("Mock ETH", "mETH", "1000000")
  console.log(`mETH deployed at: ${mETH.address}`)

  const mDAI = await Token.deploy("Mock DAI", "mDAI", "1000000")
  console.log(`mDAI deployed at: ${mDAI.address}`)

  const exchange = await Exchange.deploy(accounts[1].address, 10)
  console.log(`Exchange deployed at: ${exchange.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

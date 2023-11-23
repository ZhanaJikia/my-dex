require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const privateKeys = process.env.PRIVATE_KEYS || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/"
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_SEPOLIA_API_KEY}`,
      accounts: privateKeys.split(",")
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_API_KEY}`,
      accounts: privateKeys.split(",")
    }
  },
};


// npx hardhat run --network sepolia scripts/1_deploy.js

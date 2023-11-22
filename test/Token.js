const { ethers } = require("hardhat")
const { expect } = require("chai")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 18)
}

describe("Token", () => {

  let token, accounts, deployer, receiver, decentralizedExchange

  beforeEach(async () => {
    const Token = await ethers.getContractFactory("Token")
    token = await Token.deploy("My Token", "MT", 1000000)

    accounts = await ethers.getSigners()
    deployer = accounts[0]
    receiver = accounts[1]
    decentralizedExchange = accounts[2]
  })

  describe("Deployment", () => {

    const name = "My Token"
    const symbol = "MT"
    const decimals = 18
    const totalSupply = tokens(1000000)

    it("Returns the correct name", async () => {
      expect(await token.name()).to.equal(name)
    })
  
    it("Returns the correct symbol", async () => {
      expect(await token.symbol()).to.equal(symbol)
    })
  
    it("Returns the correct decimals", async () => {
      expect(await token.decimals()).to.equal(decimals)
    })
  
    it("Returns the correct total supply", async () => {
      expect(await token.totalSupply()).to.equal(totalSupply)
    })

    it("Assigns total supply to the deployer", async () => {
      expect(await token.balanceOf(deployer.address)).to.equal(totalSupply)
    })

  })

  describe("Sending Tokens", () => {

    let amount, transaction, receipt

    describe("Successful Transfers", () => {

      beforeEach(async () => {
        amount = tokens(100)
        transaction = await token.connect(deployer).transfer(receiver.address, amount)
        receipt = await transaction.wait()
      })
  
      it("Transfers tokens", async () => {
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
        expect(await token.balanceOf(receiver.address)).to.equal(amount)
      })
  
      it("Emits a Transfer event", async () => {
        const event = receipt.events[0]
        expect(event.event).to.equal("Transfer")
  
        const args = event.args
        expect(args._from).to.equal(deployer.address)
        expect(args._to).to.equal(receiver.address)
        expect(args._value).to.equal(amount)
      })

    })

    describe("Failing Transfers", () => {
      
      it("Rejects transfer if sender doesn't have sufficient funds", async () => {
        // The receiver account has no tokens. Thus, trying to send 10 should be reverted.
        const invalidAmount = tokens(10)
        await expect(token.connect(receiver).transfer(deployer.address, invalidAmount)).to.be.revertedWith("Insufficient funds")
      })

      it("Rejects transfer if receiver is the zero address", async () => {
        const amount = tokens(10)
        await expect(token.connect(deployer).transfer("0x0000000000000000000000000000000000000000", amount)).to.be.revertedWith("Transferring to zero address is not permitted")
      })

    })

    
  
  })

  describe("Approvals", () => {

    let amount, transaction, receipt

    beforeEach(async () => {
      amount = tokens(100)
      transaction = await token.connect(deployer).approve(decentralizedExchange.address, amount)
      receipt = await transaction.wait()
    })

    describe("Successful Approvals", () => {
  
      it("Allocates an allowance for delegated token spending", async () => {
        expect(await token.allowance(deployer.address, decentralizedExchange.address)).to.equal(amount)
      })
  
      it("Emits an Approval event", async () => {
        const event = receipt.events[0]
        expect(event.event).to.equal("Approval")
  
        const args = event.args
        expect(args._owner).to.equal(deployer.address)
        expect(args._spender).to.equal(decentralizedExchange.address)
        expect(args._value).to.equal(amount)
      })

    })

    describe("Failing Approvals", () => {

      it("Rejects approval if spender is the zero address", async () => {
        await expect(token.connect(deployer).approve("0x0000000000000000000000000000000000000000", amount)).to.be.revertedWith("Approval of zero address is not permitted")
      })

    })

  })

  describe("Delegated Token Transfers", () => {

    let amount, transaction, receipt

    beforeEach(async () => {
      amount = tokens(100)
      await token.connect(deployer).approve(decentralizedExchange.address, amount)
    })

    describe("Successful Delegated Token Transfers", () => {

      beforeEach(async () => {
        transaction = await token.connect(decentralizedExchange).transferFrom(deployer.address, receiver.address, amount)
        receipt = await transaction.wait()
      })
  
      it("Transfers tokens", async () => {
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
        expect(await token.balanceOf(receiver.address)).to.equal(amount)
      })
  
      it("Emits a Transfer event", async () => {
        const event = receipt.events[0]
        expect(event.event).to.equal("Transfer")
  
        const args = event.args
        expect(args._from).to.equal(deployer.address)
        expect(args._to).to.equal(receiver.address)
        expect(args._value).to.equal(amount)
      })

      it("Resets the allowance", async () => {
        expect(await token.allowance(deployer.address, decentralizedExchange.address)).to.equal(0)
      })

    })

    describe("Failing Delegated Token Transfers", () => {

      it("Rejects transfer if 'from' address doesn't have sufficient funds", async () => {
        const invalidAmount = tokens(1000001)
        await token.connect(deployer).approve(decentralizedExchange.address, invalidAmount)
        await expect(token.connect(decentralizedExchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.revertedWith("Insufficient funds")
      })

      it("Rejects transfer if receiver is the zero address", async () => {
        await expect(token.connect(decentralizedExchange).transferFrom(deployer.address, "0x0000000000000000000000000000000000000000", amount)).to.be.revertedWith("Transferring to zero address is not permitted")
      })

      it("Rejects transfer if sender doesn't have sufficient allowance", async () => {
        const invalidAmount = tokens(1000)
        await expect(token.connect(decentralizedExchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.revertedWith("Insufficient allowance")
      })

    })
  
  })

})
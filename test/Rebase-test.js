// import { BN, fromWei, toWei } from 'web3-utils'
// import ether from './helpers/ether'
// import EVMRevert from './helpers/EVMRevert'
// import { duration } from './helpers/duration'
// const BigNumber = BN
// const timeMachine = require('ganache-time-traveler')
//
// require('chai')
//   .use(require('chai-as-promised'))
//   .use(require('chai-bignumber')(BigNumber))
//   .should()
//
//
// const Rebase = artifacts.require('./Rebase.sol')
//
//
// const initialSupply = toWei(String(100))
//
// let rebase
//
// contract('Rebase', function([userOne, userTwo, userThree]) {
//
//   async function deployContracts(){
//     rebase = await Rebase.new()
//     await rebase.initialize(userOne, 'REBASE', 'RB')
//   }
//
//   beforeEach(async function() {
//     await deployContracts()
//   })
//
//   describe('INIT', function() {
//     it('Correct init name and symbol', async function() {
//       assert.equal(await rebase.name(), 'REBASE')
//       assert.equal(await rebase.symbol(), 'RB')
//     })
//
//     it('Correct init supply', async function() {
//       assert.equal(Number(await rebase.totalSupply()), initialSupply)
//     })
//   })
//
//
//   describe('Rebase', function() {
//     it('Not Owner can NOT rebase', async function() {
//       await rebase.rebase("1000000000000000000", { from:userTwo })
//       .should.be.rejectedWith(EVMRevert)
//     })
//
//     it('Owner can rebase negative', async function() {
//       const balanceBefore =  await rebase.balanceOf(userOne)
//       await rebase.rebase("-1000000000000000000", { from:userOne })
//       const balanceAfter =  await rebase.balanceOf(userOne)
//
//       // should burn
//       assert.isTrue(Number(balanceBefore) > Number(balanceAfter))
//     })
//
//     it('Owner can rebase positive', async function() {
//       const balanceBefore =  await rebase.balanceOf(userOne)
//       await rebase.rebase("1000000000000000000", { from:userOne })
//       const balanceAfter =  await rebase.balanceOf(userOne)
//
//       // should mint
//       assert.isTrue(Number(balanceBefore) < Number(balanceAfter))
//     })
//   })
//   //END
// })

/* globals artifacts */
const Rebase = artifacts.require('./Rebase.sol')


module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(Rebase)
}

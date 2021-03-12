import { BN, fromWei, toWei } from 'web3-utils'
import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
const BigNumber = BN
const timeMachine = require('ganache-time-traveler')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const StakingRewards = artifacts.require('./StakingRewards.sol');
const Rebase = artifacts.require('./Rebase.sol')
const MockUniswapV2PairLiquidity = artifacts.require('./MockUniswapV2PairLiquidity');

const rewardDuration = 4838400;

contract('StakingRewards', function ([ownerAddress, userAddress, userAddress1, userAddress2]) {
  
  beforeEach(async function () {
    this.rewards = await Rebase.new()
    await this.rewards.initialize(ownerAddress, 'REBASE', 'RB')
    this.univ2 = await MockUniswapV2PairLiquidity.new({ from: ownerAddress, gas: 8000000 });
    this.stakingRewards = await StakingRewards.new(ownerAddress, this.rewards.address, this.univ2.address, { from: ownerAddress, gas: 8000000 });
  });

  describe('Staking', function () {
    describe('Call Start', function () {
      it('initaial Values', async function () {
        expect(await this.stakingRewards.rewardsDistribution()).to.be.equal(ownerAddress);
        assert.equal(Number(await this.stakingRewards.rewardRate()), Number(0))
        assert.equal(Number(await this.stakingRewards.rewardsDuration()), Number(rewardDuration))
      });

      it('from RewardsDistribution', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 500, { from: ownerAddress });
        await this.stakingRewards.start({ from: userAddress }).should.be.rejectedWith("Caller is not RewardsDistribution contract");
      });

      it('from non RewardsDistribution', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 500, { from: ownerAddress });
        expect(await this.stakingRewards.rewardsDistribution()).to.be.equal(ownerAddress);
      });

      it('when 0 reward Token on staking contrat', async function () {
        await this.stakingRewards.start({ from: ownerAddress }).should.be.rejectedWith("Invalid balance");
      });

      it('when reward Token present on staking contrat', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        assert.equal(Number(await this.stakingRewards.rewardRate()), Number(10333)); // 50000000000/rewardDuration
      });
    });

    describe('rewardPerToken', function () {
      it('should return 0', async function () {
        assert.equal(Number(await this.stakingRewards.rewardPerToken()), Number(0));
      });

      it('should be > 0', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });
        expect(await this.stakingRewards.rewardPerToken() > 0).to.be.equal(true);
      });

      it('should increase on positive rebase', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        const initialRewardPerToken = await this.stakingRewards.rewardPerToken();
        await this.rewards.rebase("1000000000000000000", { from:ownerAddress })

        const postRewardPerToken = await this.stakingRewards.rewardPerToken();

        expect(postRewardPerToken > initialRewardPerToken).to.be.equal(true);
      });

      it('should decrease on negative rebase', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        const initialRewardPerToken = await this.stakingRewards.rewardPerToken();
        await this.rewards.rebase("-1000000000000000000", { from:ownerAddress })
        const postRewardPerToken = await this.stakingRewards.rewardPerToken();

        expect(postRewardPerToken < initialRewardPerToken).to.be.equal(true);
      });
    });

    describe('earned', function () {
      it('should be 0 when not staking', async function () {
        assert.equal(Number(await this.stakingRewards.earned(userAddress)), Number(0));
      });

      it('rewardRate should increase if new rewards come before DURATION ends', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        const initialRate = await this.stakingRewards.rewardRate();

        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        const afterRate = await this.stakingRewards.rewardRate();

        expect(initialRate < afterRate).to.be.equal(true);
      });

      it('should be > 0 when staking', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        await timeMachine.advanceTimeAndBlock(duration.seconds(3600))
        expect(await this.stakingRewards.earned(ownerAddress) > 0).to.be.equal(true);
      });

      it('Earned reward decrease on negative rebase', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        await timeMachine.advanceTimeAndBlock(duration.seconds(3600))

        const initialRewards = await this.stakingRewards.earned(ownerAddress);
        await this.rewards.rebase("-1000000000000000000", { from:ownerAddress })
        const postRewards = await this.stakingRewards.earned(ownerAddress);

        expect(initialRewards > postRewards).to.be.equal(true);
      });

      it('Earned reward increase on positive rebase', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        await timeMachine.advanceTimeAndBlock(duration.seconds(3600))

        const initialRewards = await this.stakingRewards.earned(ownerAddress);
        await this.rewards.rebase("1000000000000000000", { from:ownerAddress })
        const postRewards = await this.stakingRewards.earned(ownerAddress);

        expect(initialRewards < postRewards).to.be.equal(true);
      });
    });

    describe('stake', function () {
      it('cannot stake 0', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        await this.stakingRewards.stake('0').should.be.rejectedWith("Cannot stake 0");
      });

      it('staking increases reward balance(Single-User)', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });

        const initialStakeBal = await this.stakingRewards.balanceOf(ownerAddress);

        await this.stakingRewards.stake(500, { from: ownerAddress });

        const postStakeBal = await this.stakingRewards.balanceOf(ownerAddress);

        expect(postStakeBal > initialStakeBal).to.be.equal(true);
      });

      it('staking increases reward balance(Multiple-Users)', async function () {
        await this.rewards.transfer(userAddress1, 50000000000, { from: ownerAddress });
        await this.rewards.transfer(userAddress2, 50000000000, { from: ownerAddress });
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });

        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.faucet(userAddress1, 1000);
        this.univ2.faucet(userAddress2, 1000);

        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        this.univ2.approve(this.stakingRewards.address, 1000, { from: userAddress1 });
        this.univ2.approve(this.stakingRewards.address, 1000, { from: userAddress2 });

        const initialStakeBalUesr1 = await this.stakingRewards.balanceOf(ownerAddress);
        const initialStakeBalUesr2 = await this.stakingRewards.balanceOf(userAddress1);
        const initialStakeBalUesr3 = await this.stakingRewards.balanceOf(userAddress2);

        await this.stakingRewards.stake(500, { from: ownerAddress });
        await this.stakingRewards.stake(400, { from: userAddress1 });
        await this.stakingRewards.stake(300, { from: userAddress2 });

        const postStakeBalUser1 = await this.stakingRewards.balanceOf(ownerAddress);
        const postStakeBalUser2 = await this.stakingRewards.balanceOf(userAddress1);
        const postStakeBalUser3 = await this.stakingRewards.balanceOf(userAddress2);

        expect(postStakeBalUser1 > initialStakeBalUesr1).to.be.equal(true);
        expect(postStakeBalUser2 > initialStakeBalUesr2).to.be.equal(true);
        expect(postStakeBalUser3 > initialStakeBalUesr3).to.be.equal(true);
      });
    });

    describe('withdraw', function () {
      it('cannot withdraw if nothing staked', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        await this.stakingRewards.withdraw('100').should.be.rejectedWith("SafeMath: subtraction overflow");
      });

      it('decreases staking balance', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        await this.stakingRewards.withdraw(500, { from: ownerAddress });

        const postStakeBal = await this.stakingRewards.balanceOf(ownerAddress);
        expect(postStakeBal == 0).to.be.equal(true);
      });
    });

    describe('exit', function () {
      it('should retrieve all earned and increase rewards bal', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        await this.stakingRewards.withdraw('100').should.be.rejectedWith("SafeMath: subtraction overflow");
      });

      it('decreases staking balance', async function () {
        await this.rewards.transfer(this.stakingRewards.address, 50000000000, { from: ownerAddress });
        await this.stakingRewards.start({ from: ownerAddress });
        this.univ2.faucet(ownerAddress, 1000);
        this.univ2.approve(this.stakingRewards.address, 1000, { from: ownerAddress });
        await this.stakingRewards.stake(500, { from: ownerAddress });

        await timeMachine.advanceTimeAndBlock(duration.seconds(4838399))
        const initialRewardBal = await this.rewards.balanceOf(ownerAddress);
        const initialEarnedBal = await this.stakingRewards.earned(ownerAddress);
        await this.stakingRewards.exit({ from: ownerAddress });
        const postRewardBal = await this.rewards.balanceOf(ownerAddress);
        const postEarnedBal = await this.stakingRewards.earned(ownerAddress);

        expect(postEarnedBal < initialEarnedBal).to.be.equal(true);
        expect(postRewardBal > initialRewardBal).to.be.equal(true);
        expect(postEarnedBal == 0).to.be.equal(true);
      });
    });
  });
});
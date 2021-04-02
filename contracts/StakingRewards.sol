pragma solidity ^0.5.16;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Inheritance
import "./RewardsDistributionRecipient.sol";


// https://docs.synthetix.io/contracts/source/contracts/stakingrewards
contract StakingRewards is RewardsDistributionRecipient, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public rewardsToken;
    IERC20 public stakingToken;
    uint256 public periodFinish = 0;
    uint256 public periodStart = 0;
    uint256 public rewardRate = 0;
    uint256 public rewardsDuration = 8 weeks;

    uint256 private _remainingAmount;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _lastRewardPaidTime;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) public {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        rewardsDistribution = _rewardsDistribution;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return 0;
        }
        uint256 syncRewardRate = syncRewardRateValue();
        return syncRewardRate.mul(1e18).div(_totalSupply);
    }

    function lastRewardPaidTime(address account) public view returns (uint256) {
        if (periodStart == 0) {
            return 0;
        }
        return Math.max(_lastRewardPaidTime[account], periodStart);
    }

    function earned(address account) public view returns (uint256) {
        uint256 _lastPaidTime = lastRewardPaidTime(account);
        if (_lastPaidTime == 0) {
            return 0;
        }
        return _balances[account].mul(lastTimeRewardApplicable().sub(_lastPaidTime)).mul(rewardPerToken()).div(1e18);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount) external nonReentrant syncRewardRate {
        require(amount > 0, "Cannot stake 0");
        _getReward();
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant syncRewardRate {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant syncRewardRate {
        _getReward();
    }

    function _getReward() private {
        uint256 reward = earned(msg.sender);
        _lastRewardPaidTime[msg.sender] = block.timestamp;
        if (reward > 0) {
            rewardsToken.safeTransfer(msg.sender, reward);
            _remainingAmount = _remainingAmount.sub(reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external syncRewardRate {
        withdraw(_balances[msg.sender]);
        _getReward();
    }

    function syncRewardRateValue() public view returns (uint256) {
      uint balance = rewardsToken.balanceOf(address(this));

      return rewardRate.mul(balance).div(_remainingAmount);
    }

    modifier syncRewardRate() {
      uint balance = rewardsToken.balanceOf(address(this));
      require(balance > 0, "Invalid balance");

      rewardRate = rewardRate.mul(balance).div(_remainingAmount);
      _remainingAmount = balance;
      _;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function start() external onlyRewardsDistribution {
      uint balance = rewardsToken.balanceOf(address(this));
      require(balance > 0, "Invalid balance");
      rewardRate = balance.div(rewardsDuration);

      periodStart = block.timestamp;
      periodFinish = block.timestamp.add(rewardsDuration);
      _remainingAmount = balance;
      emit Started();
    }

    event Started();
    event Synced();
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
}

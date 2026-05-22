// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// LYNK Escrow Contract
// Holds funds between buyer and seller with a clear, readable lifecycle.
// Designed for hackathon clarity and backend integration via events.
contract LynkEscrow {
	// --- State ---
	address public buyer;
	address public seller;
	uint256 public amount;
	bool public released;
	bool public disputed;
	uint256 public createdAt;

	// --- Events ---
	event FundsDeposited(address indexed buyer, uint256 amount);
	event FundsReleased(address indexed seller, uint256 amount);
	event BuyerRefunded(address indexed buyer, uint256 amount);
	event DisputeOpened(address indexed opener);

	// --- Modifiers ---
	modifier onlyBuyer() {
		require(msg.sender == buyer, "Only buyer");
		_;
	}

	modifier onlySeller() {
		require(msg.sender == seller, "Only seller");
		_;
	}

	constructor(address _buyer, address _seller, uint256 _amount) {
		require(_buyer != address(0), "Invalid buyer");
		require(_seller != address(0), "Invalid seller");
		require(_amount > 0, "Amount must be > 0");
		buyer = _buyer;
		seller = _seller;
		amount = _amount;
		released = false;
		disputed = false;
		createdAt = block.timestamp;
	}

	// Buyer deposits the exact escrow amount once.
	function deposit() external payable onlyBuyer {
		require(msg.value == amount, "Deposit must equal escrow amount");
		require(address(this).balance == amount, "Already funded");
		emit FundsDeposited(buyer, msg.value);
	}

	// Buyer releases funds to seller.
	function releaseFunds() external onlyBuyer {
		require(!released, "Already released");
		require(!disputed, "Escrow in dispute");
		require(address(this).balance == amount, "Escrow not funded");
		released = true;
		(bool success, ) = seller.call{ value: amount }("");
		require(success, "Transfer failed");
		emit FundsReleased(seller, amount);
	}

	// Seller refunds buyer.
	function refundBuyer() external onlySeller {
		require(!released, "Already released");
		require(address(this).balance == amount, "Escrow not funded");
		released = true;
		(bool success, ) = buyer.call{ value: amount }("");
		require(success, "Refund failed");
		emit BuyerRefunded(buyer, amount);
	}

	// Buyer or seller can open a dispute.
	function openDispute() external {
		require(msg.sender == buyer || msg.sender == seller, "Unauthorized");
		require(!disputed, "Already disputed");
		disputed = true;
		emit DisputeOpened(msg.sender);
	}

	// Returns the current escrow state for backend polling.
	function getEscrowDetails()
		external
		view
		returns (
			address,
			address,
			uint256,
			bool,
			bool,
			uint256
		)
	{
		return (buyer, seller, amount, released, disputed, createdAt);
	}
}

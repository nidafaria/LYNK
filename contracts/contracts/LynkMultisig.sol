// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// LYNK 2-of-3 Multisig Escrow
// No single party can take funds. Needs 2 signatures.
contract LynkMultisig {
    // --- State ---
    address public buyer;
    address public seller;
    address public protocol;
    uint256 public amount;
    bool public released;
    bool public disputed;
    string public disputeRuling; // "BUYER", "SELLER", "SPLIT"
    
    // 2-of-3 signature tracking
    mapping(address => bool) public signedRelease;
    uint8 public signatureCount;
    
    // --- Events ---
    event Funded(address indexed buyer, uint256 amount);
    event Signed(address indexed signer);
    event Released(address indexed to, uint256 amount);
    event Disputed(string reason);
    event Ruled(string ruling);
    
    // --- Modifiers ---
    modifier notReleased() {
        require(!released, "Already released");
        _;
    }
    
    modifier onlyParty() {
        require(msg.sender == buyer || msg.sender == seller || msg.sender == protocol, "Not a party");
        _;
    }
    
    // --- Constructor ---
    constructor(address _buyer, address _seller, address _protocol, uint256 _amount) {
        buyer = _buyer;
        seller = _seller;
        protocol = _protocol;
        amount = _amount;
        released = false;
        disputed = false;
        signatureCount = 0;
    }
    
    // --- Buyer funds the escrow ---
    function fund() external payable {
        require(msg.sender == buyer, "Only buyer can fund");
        require(msg.value == amount, "Exact amount required");
        require(address(this).balance == amount, "Already funded");
        emit Funded(buyer, msg.value);
    }
    
    // --- Any party can sign for release ---
    function signRelease() external onlyParty notReleased {
        require(!signedRelease[msg.sender], "Already signed");
        signedRelease[msg.sender] = true;
        signatureCount++;
        emit Signed(msg.sender);
        
        // Auto-execute when 2 signatures collected
        if (signatureCount >= 2) {
            _executeRelease();
        }
    }
    
    // --- Internal release execution ---
    function _executeRelease() internal notReleased {
        released = true;
        
        // Determine who gets funds
        address recipient;
        if (disputed && bytes(disputeRuling).length > 0) {
            if (keccak256(bytes(disputeRuling)) == keccak256(bytes("BUYER"))) {
                recipient = buyer;
            } else if (keccak256(bytes(disputeRuling)) == keccak256(bytes("SELLER"))) {
                recipient = seller;
            } else {
                // SPLIT - 50/50
                uint256 half = amount / 2;
                (bool success1, ) = buyer.call{value: half}("");
                (bool success2, ) = seller.call{value: amount - half}("");
                require(success1 && success2, "Split transfer failed");
                emit Released(buyer, half);
                emit Released(seller, amount - half);
                return;
            }
        } else {
            // Normal case: funds go to seller
            recipient = seller;
        }
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        emit Released(recipient, amount);
    }
    
    // --- Open dispute (any party) ---
    function openDispute(string memory reason) external onlyParty notReleased {
        require(!disputed, "Already disputed");
        disputed = true;
        emit Disputed(reason);
    }
    
    // --- Protocol applies ruling (only protocol key) ---
    function applyRuling(string memory ruling) external {
        require(msg.sender == protocol, "Only protocol");
        require(disputed, "No active dispute");
        require(!released, "Already released");
        disputeRuling = ruling;
        emit Ruled(ruling);
        
        // Auto-execute if both parties already signed?
        // Or wait for protocol signature
        if (!signedRelease[protocol]) {
            signedRelease[protocol] = true;
            signatureCount++;
            emit Signed(protocol);
        }
        
        if (signatureCount >= 2) {
            _executeRelease();
        }
    }
    
    // --- Auto-release after delivery (protocol can force) ---
    function autoRelease() external {
        require(msg.sender == protocol, "Only protocol");
        require(!disputed, "Cannot auto-release during dispute");
        require(!released, "Already released");
        
        if (!signedRelease[protocol]) {
            signedRelease[protocol] = true;
            signatureCount++;
        }
        
        if (signatureCount >= 2) {
            _executeRelease();
        }
    }
    
    // --- View functions ---
    function getStatus() external view returns (
        address, address, address, uint256, bool, bool, uint8, string memory
    ) {
        return (buyer, seller, protocol, amount, released, disputed, signatureCount, disputeRuling);
    }
}
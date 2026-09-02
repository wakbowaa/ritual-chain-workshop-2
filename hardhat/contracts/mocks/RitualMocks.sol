// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockScheduler {
    struct ScheduledCall { address target; bytes data; bool cancelled; }
    uint256 public nextId;
    mapping(uint256 => ScheduledCall) public calls;

    function approveScheduler(address) external {}

    function schedule(
        bytes calldata data,
        uint32,
        uint32,
        uint32,
        uint32,
        uint32,
        uint256,
        uint256,
        uint256,
        address
    ) external returns (uint256 callId) {
        callId = ++nextId;
        calls[callId] = ScheduledCall(msg.sender, data, false);
    }

    function cancel(uint256 callId) external { calls[callId].cancelled = true; }
    function getCallState(uint256 callId) external view returns (uint8) {
        return calls[callId].cancelled ? 3 : 0;
    }

    function trigger(uint256 callId, uint256 executionIndex) external {
        ScheduledCall storage scheduled = calls[callId];
        require(!scheduled.cancelled, "cancelled");
        bytes memory data = scheduled.data;
        assembly { mstore(add(data, 36), executionIndex) }
        (bool ok, bytes memory reason) = scheduled.target.call(data);
        if (!ok) assembly { revert(add(reason, 32), mload(reason)) }
    }
}

contract MockRegistry {
    address public executor = address(0xBEEF);
    bool public found = true;
    function configure(address executor_, bool found_) external {
        executor = executor_;
        found = found_;
    }
    function pickServiceByCapability(uint8, bool, uint256, uint256)
        external view returns (address, bool) { return (executor, found); }
}

contract MockHttpPrecompile {
    uint16 public status = 200;
    bytes public body = bytes('{"price":4200}');
    string public errorMessage;

    function configure(uint16 status_, bytes calldata body_, string calldata error_) external {
        status = status_;
        body = body_;
        errorMessage = error_;
    }

    fallback() external {
        string[] memory empty = new string[](0);
        bytes memory response = abi.encode(status, empty, empty, body, errorMessage);
        bytes memory output = abi.encode(bytes("simulated"), response);
        assembly { return(add(output, 32), mload(output)) }
    }
}

contract MockJqPrecompile {
    uint256 public value = 4200;
    bool public succeeds = true;
    function configure(uint256 value_, bool succeeds_) external {
        value = value_;
        succeeds = succeeds_;
    }
    fallback() external {
        if (!succeeds) revert("jq failed");
        uint256 result = value;
        assembly { mstore(0, result) return(0, 32) }
    }
}

contract MockRitualWallet {
    mapping(address => uint256) public balanceOf;
    function deposit(uint256) external payable { balanceOf[msg.sender] += msg.value; }
    function lockUntil(address) external pure returns (uint256) { return 0; }
}



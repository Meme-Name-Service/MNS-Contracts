// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BaseRegistrarImplementation.sol";
import "./StringUtils.sol";
import "../resolvers/Resolver.sol";
import {IETHRegistrarController, IPriceOracle} from "./IETHRegistrarController.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @dev Registrar with giftcard support
 *
 */
contract MEMERegistrarController is Ownable {
    using StringUtils for *;

    uint public constant MIN_REGISTRATION_DURATION = 365 days;

    bytes4 private constant INTERFACE_META_ID = bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant COMMITMENT_CONTROLLER_ID =
        bytes4(
            keccak256("rentPrice(string,uint256)") ^
                keccak256("available(string)") ^
                keccak256("makeCommitment(string,address,bytes32)") ^
                keccak256("commit(bytes32)") ^
                keccak256("register(string,address,uint256,bytes32)") ^
                keccak256("renew(string,uint256)")
        );

    bytes4 private constant COMMITMENT_WITH_CONFIG_CONTROLLER_ID =
        bytes4(keccak256("registerWithConfig(string,address,uint256,bytes32,address,address)") ^ keccak256("makeCommitmentWithConfig(string,address,bytes32,address,address)"));

    BaseRegistrarImplementation base;
    IPriceOracle prices;
    uint public minCommitmentAge;
    uint public maxCommitmentAge;

    mapping(bytes32 => uint) public commitments;
    mapping(uint256 => string) public tokenIdToName;
    mapping(string => uint256) public nameToTokenId;

    event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint cost, uint expires);
    event NameRenewed(string name, bytes32 indexed label, uint cost, uint expires);
    event NewPriceOracle(address indexed oracle);

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        uint _minCommitmentAge,
        uint _maxCommitmentAge
    ) public {
        require(_maxCommitmentAge > _minCommitmentAge);
        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function rentPrice(string memory name, uint256 duration) public view returns (IPriceOracle.Price memory price) {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function nameExpireTimestamp(string memory name) public view returns (uint) {
        bytes32 label = keccak256(bytes(name));
        return base.nameExpires(uint256(label));
    }

    function valid(string memory name) public pure returns (bool) {
        // check unicode rune count, if rune count is >=3, byte length must be >=3.
        if (name.strlen() < 3) {
            return false;
        }
        bytes memory nb = bytes(name);
        // zero width for /u200b /u200c /u200d and U+FEFF
        for (uint256 i; i < nb.length - 2; i++) {
            if (bytes1(nb[i]) == 0xe2 && bytes1(nb[i + 1]) == 0x80) {
                if (bytes1(nb[i + 2]) == 0x8b || bytes1(nb[i + 2]) == 0x8c || bytes1(nb[i + 2]) == 0x8d) {
                    return false;
                }
            } else if (bytes1(nb[i]) == 0xef) {
                if (bytes1(nb[i + 1]) == 0xbb && bytes1(nb[i + 2]) == 0xbf) return false;
            }
        }
        return true;
    }

    function available(string memory name) public view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address owner,
        bytes32 secret
    ) public pure returns (bytes32) {
        return makeCommitmentWithConfig(name, owner, secret, address(0), address(0));
    }

    function makeCommitmentWithConfig(
        string memory name,
        address owner,
        bytes32 secret,
        address resolver,
        address addr
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        if (resolver == address(0) && addr == address(0)) {
            return keccak256(abi.encodePacked(label, owner, secret));
        }
        require(resolver != address(0));
        return keccak256(abi.encodePacked(label, owner, resolver, addr, secret));
    }

    function commit(bytes32 commitment) public {
        require(commitments[commitment] + maxCommitmentAge < block.timestamp);
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address owner,
        uint duration,
        bytes32 secret
    ) external payable {
        registerWithConfig(name, owner, duration, secret, address(0), address(0));
    }

    function registerWithConfig(
        string memory name,
        address owner,
        uint duration,
        bytes32 secret,
        address resolver,
        address addr
    ) public payable {
        bytes32 commitment = makeCommitmentWithConfig(name, owner, secret, resolver, addr);
        uint cost = _consumeCommitment(name, duration, commitment);

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        uint expires;
        if (resolver != address(0)) {
            // Set this contract as the (temporary) owner, giving it
            // permission to set up the resolver.
            expires = base.register(tokenId, address(this), duration);

            // The nodehash of this label
            bytes32 nodehash = keccak256(abi.encodePacked(base.baseNode(), label));

            // Set the resolver
            base.mns().setResolver(nodehash, resolver);

            // Configure the resolver
            if (addr != address(0)) {
                Resolver(resolver).setAddr(nodehash, addr);
            }

            // Now transfer full ownership to the expeceted owner
            base.reclaim(tokenId, owner);
            base.transferFrom(address(this), owner, tokenId);
        } else {
            require(addr == address(0));
            expires = base.register(tokenId, owner, duration);
        }

        emit NameRegistered(name, label, owner, cost, expires);
        tokenIdToName[tokenId] = name;
        nameToTokenId[name] = tokenId;

        // Refund any extra payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function renew(
        string calldata name,
        uint duration
    ) public payable {
        IPriceOracle.Price memory price = rentPrice(name, duration);
        uint256 cost = (price.base + price.premium);
        require(msg.value >= cost);
        bytes32 label = keccak256(bytes(name));
        uint expires = base.renew(uint256(label), duration);

        // Refund any extra payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRenewed(name, label, cost, expires);
    }

    function setPriceOracle(IPriceOracle _prices) public onlyOwner {
        prices = _prices;
        emit NewPriceOracle(address(prices));
    }

    function setCommitmentAges(uint _minCommitmentAge, uint _maxCommitmentAge) public onlyOwner {
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == INTERFACE_META_ID || interfaceID == COMMITMENT_CONTROLLER_ID || interfaceID == COMMITMENT_WITH_CONFIG_CONTROLLER_ID;
    }

    function _consumeCommitment(
        string memory name,
        uint duration,
        bytes32 commitment
    ) internal returns (uint256) {
        // Require a valid commitment
        require(commitments[commitment] + minCommitmentAge <= block.timestamp);
        // If the commitment is too old, or the name is registered, stop
        require(commitments[commitment] + maxCommitmentAge > block.timestamp);
        require(available(name));
        delete (commitments[commitment]);
        IPriceOracle.Price memory price;
        price = rentPrice(name, duration);
        uint cost = (price.base + price.premium);
        require(duration >= MIN_REGISTRATION_DURATION);
        require(msg.value >= cost);
        return cost;
    }
}
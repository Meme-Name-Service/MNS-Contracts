# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

BSC Testnet Contract

```
MEMERegistrarController = 0x3C77eFb5B392c02a973958F090bE2A4c0e659539
BaseRegistrarImplementation = 0xBebDD36629601a371575a9ff5fc22D8EDc185d85
```

Integration Flow

```

- MakeCommitmentWithConfig
// name: name of register account
// owner: address of register account
// secret: random value
// resolver: public resolver contract to resolver MNS
// addr: address for resolver
function makeCommitmentWithConfig(
  string memory name,
  address owner,
  bytes32 secret,
  address resolver,
  address addr
) returns (bytes32)

- Commit
// commitment: bytes of string from above
function commit(bytes32 commitment)

- Calculate Price
// name: name of register account
// duration: 1 years / 2 years calculate in blocks
function rentPrice(string memory name, uint256 duration) public view returns (IPriceOracle.Price memory price)

- Register

// name: name of register account
// owner: address of register account
// duration: 1 years/2 years calculate in blocks
// bytes32: secret from commitment
// resolver: public resolver contract to resolver MNS
// addr: address for resolver
function registerWithConfig(
  string memory name,
  address owner,
  uint duration,
  bytes32 secret,
  address resolver,
  address addr
)

- Resolver address
// node The ENS node to query.
function addr(
  bytes32 node
) returns address

// For more information please check test/memeregistar/memeRegistrarController.ts

```

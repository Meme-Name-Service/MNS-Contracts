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
MEMERegistrarController = 0xFCA71a9B690a74B184C809AB63BF29abE84be058
BaseRegistrarImplementation = 0x48822dAf51E762AE5e9102a727b50D31348307CC
PublicResolver = 0xeD7C5ada6B9a4aAD6b9Fa8EbfdB0A3e1710D8429
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

// Example contract
it("should permit a registration with resolver and have records", async () => {
    const { otherAccount, controller, resolver, memens } = await loadFixture(
      deployMemeRegistrarController
    )

    const commitment = await controller
      .connect(otherAccount)
      .makeCommitmentWithConfig(
        "newconfigname2",
        otherAccount.address,
        secret,
        await resolver.getAddress(),
        otherAccount.address
      )

    await controller.connect(otherAccount).commit(commitment)
    expect((await controller.commitments(commitment)).toString()).to.equal(
      (await latest()).toString()
    )

    await increase(
      BigNumber.from(+(await controller.minCommitmentAge()).toString() - 1)
    )
    const balanceBefore = await ethers.provider.getBalance(
      await controller.getAddress()
    )
    await controller
      .connect(otherAccount)
      .registerWithConfig(
        "newconfigname2",
        otherAccount.address,
        REGISTRATION_TIME,
        secret,
        await resolver.getAddress(),
        otherAccount.address,
        { value: BUFFERED_REGISTRATION_COST }
      )

    const nodehash = namehash.hash("newconfigname2.meme")
    expect(await memens.resolver(nodehash)).to.equal(
      await resolver.getAddress()
    )
    expect(await resolver["addr(bytes32)"](nodehash)).to.equal(
      otherAccount.address
    )
    expect(
      (await ethers.provider.getBalance(await controller.getAddress())) -
        balanceBefore
    ).to.equal(REGISTRATION_TIME)
    // expect(await resolver.owner(nodehash)).to.equal(otherAccount.address)
  })

```

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"
import { advanceBlockTo, latest, increase } from "../utils"
import { BigNumber } from "@ethersproject/bignumber"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000"
const EMPTY_BYTES =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const ONE_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000001"

const secret =
  "0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"

const DAY = 24 * 60 * 60
const REGISTRATION_TIME = 365 * DAY
const BUFFERED_REGISTRATION_COST = REGISTRATION_TIME + 3 * DAY
const GRACE_PERIOD = 90 * DAY
const NULL_ADDRESS = ZERO_ADDRESS

const toSha3 = (name: string): string => sha3(name) || ""

describe("MemeRegistrarController", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMemeRegistrarController() {
    const [ownerAccount, registrantAccount, otherAccount] =
      await ethers.getSigners()

    const MEMENS = await ethers.getContractFactory("MNSRegistry")
    const BaseRegistrar = await ethers.getContractFactory(
      "BaseRegistrarImplementation"
    )
    const DummyOracle = await ethers.getContractFactory("DummyOracle")
    const StablePriceOracle = await ethers.getContractFactory(
      "StablePriceOracle"
    )
    const MemeRegistrarController = await ethers.getContractFactory(
      "MEMERegistrarController"
    )
    const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar")
    const NameWrapper = await ethers.getContractFactory("NameWrapper")
    const PublicResolver = await ethers.getContractFactory("PublicResolver")

    const memens = await MEMENS.deploy()
    const registrar = await BaseRegistrar.deploy(
      await memens.getAddress(),
      namehash.hash("meme")
    )
    const dummyOracle = await DummyOracle.deploy("100000000")
    const priceOracle = await StablePriceOracle.deploy(
      await dummyOracle.getAddress(),
      [0, 0, 4, 2, 1]
    )
    const controller = await MemeRegistrarController.deploy(
      await registrar.getAddress(),
      await priceOracle.getAddress(),
      600,
      86400
    )
    const reverseRegistrar = await ReverseRegistrar.deploy(
      await memens.getAddress()
    )
    const nameWrapper = await NameWrapper.deploy(
      await memens.getAddress(),
      await registrar.getAddress(),
      ownerAccount.address
    )
    const resolver = await PublicResolver.deploy(
      await memens.getAddress(),
      await nameWrapper.getAddress(),
      await controller.getAddress(),
      await reverseRegistrar.getAddress()
    )

    await memens.setSubnodeOwner(
      EMPTY_BYTES,
      toSha3("reverse"),
      ownerAccount.address
    )
    await memens.setSubnodeOwner(
      namehash.hash("reverse"),
      toSha3("addr"),
      await reverseRegistrar.getAddress()
    )
    await memens.setSubnodeOwner(
      EMPTY_BYTES,
      toSha3("meme"),
      await registrar.getAddress()
    )

    await registrar.addController(controller)
    await nameWrapper.setController(await controller.getAddress(), true)
    await registrar.addController(await nameWrapper.getAddress())
    await reverseRegistrar.setController(await controller.getAddress(), true)

    const registerName = async (
      name: string,
      addr: any,
      txOptions = { value: BUFFERED_REGISTRATION_COST }
    ) => {
      const commitment = await controller
        .connect(addr)
        .makeCommitment(name, addr.address, secret)

      await controller.connect(addr).commit(commitment)
      expect((await controller.commitments(commitment)).toString()).to.equal(
        (await latest()).toString()
      )

      await increase(
        BigNumber.from(+(await controller.minCommitmentAge()).toString() - 1)
      )

      await controller
        .connect(addr)
        .register(name, addr.address, REGISTRATION_TIME, secret, txOptions)
    }

    return {
      controller,
      memens,
      registrar,
      ownerAccount,
      registrantAccount,
      otherAccount,
      registerName,
      resolver,
    }
  }

  it("should report unused names as available", async () => {
    const { controller } = await loadFixture(deployMemeRegistrarController)
    expect(await controller.available("available")).to.equal(true)
  })

  it("should permit new registrations", async () => {
    const { controller, registerName, otherAccount } = await loadFixture(
      deployMemeRegistrarController
    )

    const name = "newname"
    const balanceBefore = await ethers.provider.getBalance(
      await controller.getAddress()
    )
    await registerName(name, otherAccount)

    expect(
      (await ethers.provider.getBalance(await controller.getAddress())) -
        balanceBefore
    ).to.equal(REGISTRATION_TIME)
  })

  it("should revert when not enough ether is transferred", async () => {
    const { otherAccount, registerName } = await loadFixture(
      deployMemeRegistrarController
    )
    await expect(
      registerName("newname", otherAccount, { value: 0 })
    ).to.be.revertedWithoutReason()
  })

  it("should report registered names as unavailable", async () => {
    const { otherAccount, registerName, controller, registrar } =
      await loadFixture(deployMemeRegistrarController)
    const name = "newname"
    await registerName(name, otherAccount)
    expect(await registrar.ownerOf(toSha3(name))).to.equal(otherAccount.address)
    expect(await controller.available(name)).to.equal(false)
  })

  it("should permit a registration with resolver but no records", async () => {
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
        ethers.ZeroAddress
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
        ethers.ZeroAddress,
        { value: BUFFERED_REGISTRATION_COST }
      )

    const nodehash = namehash.hash("newconfigname2.meme")
    expect(await memens.resolver(nodehash)).to.equal(
      await resolver.getAddress()
    )
    expect(await resolver["addr(bytes32)"](nodehash)).to.equal(NULL_ADDRESS)
    expect(
      (await ethers.provider.getBalance(await controller.getAddress())) -
        balanceBefore
    ).to.equal(REGISTRATION_TIME)
  })

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
})

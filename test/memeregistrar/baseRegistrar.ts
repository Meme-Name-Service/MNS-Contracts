import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const ONE_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000001"

describe("BaseRegistrar", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployBaseRegistrar() {
    const [deployer, controller, registrant, other] = await ethers.getSigners()

    const MEMENS = await ethers.getContractFactory("MNSRegistry")
    const BaseRegistrar = await ethers.getContractFactory(
      "BaseRegistrarImplementation"
    )
    const memens = await MEMENS.deploy()
    const registrar = await BaseRegistrar.deploy(
      await memens.getAddress(),
      namehash.hash("meme")
    )

    await registrar.addController(controller)
    await memens.setSubnodeOwner(
      ZERO_HASH,
      sha3("meme"),
      await registrar.getAddress()
    )

    return { memens, registrar, deployer, controller, registrant, other }
  }

  it("should allow new registrations", async () => {
    const { registrar, memens, registrant, controller } = await loadFixture(
      deployBaseRegistrar
    )

    await registrar
      .connect(controller)
      .register(sha3("newname") || "", registrant.address, 86400)

    expect(await memens.owner(namehash.hash("newname.meme"))).to.equal(
      registrant.address
    )
    expect(await registrar.ownerOf(sha3("newname") || ""), registrant.address)
  })

  it("should allow registrations without updating the registry", async () => {
    const { registrar, memens, registrant, controller } = await loadFixture(
      deployBaseRegistrar
    )

    await registrar
      .connect(controller)
      .registerOnly(sha3("silentname") || "", registrant.address, 86400)
    expect(await memens.owner(namehash.hash("silentname.meme"))).to.equal(
      ZERO_ADDRESS
    )
    expect(await registrar.ownerOf(sha3("silentname") || "")).to.equal(
      registrant.address
    )
  })

  it("should only allow the controller to register", async () => {
    const { registrar, memens, registrant, controller, other } =
      await loadFixture(deployBaseRegistrar)

    await expect(registrar.register(sha3("foo") || "", other, 86400)).to.be
      .reverted
  })

  it("should only allow the controller to renew", async () => {
    const { registrar, memens, registrant, controller, other } =
      await loadFixture(deployBaseRegistrar)

    await expect(registrar.connect(other).renew(sha3("newname") || "", 86400))
      .to.be.reverted
  })

  it("should permit the owner to reclaim a name", async () => {
    const { registrar, memens, registrant, controller, other, deployer } =
      await loadFixture(deployBaseRegistrar)

    await registrar
      .connect(controller)
      .register(sha3("newname") || "", registrant.address, 86400)

    await memens.setSubnodeOwner(ZERO_HASH, sha3("meme"), deployer.address)
    await memens.setSubnodeOwner(
      namehash.hash("meme"),
      sha3("newname"),
      ZERO_ADDRESS
    )
    expect(await memens.owner(namehash.hash("newname.meme")), ZERO_ADDRESS)
    await memens.setSubnodeOwner(
      ZERO_HASH,
      sha3("meme"),
      await registrar.getAddress()
    )
    await registrar
      .connect(registrant)
      .reclaim(sha3("newname") || "", registrant.address)
    expect(
      await memens.owner(namehash.hash("newname.meme")),
      registrant.address
    )
  })

  it("should permit the owner to transfer a registration", async () => {
    const { registrar, memens, registrant, controller, other, deployer } =
      await loadFixture(deployBaseRegistrar)

    await registrar
      .connect(controller)
      .register(sha3("newname") || "", registrant.address, 86400)

    await registrar
      .connect(registrant)
      .transferFrom(registrant.address, other.address, sha3("newname") || "")
    expect(await registrar.ownerOf(sha3("newname") || ""), other.address)

    // Transfer does not update ENS without a call to reclaim.
    expect(await memens.owner(namehash.hash("newname.eth")), registrant.address)
    await registrar
      .connect(other)
      .transferFrom(other.address, registrant.address, sha3("newname") || "")
  })

  it("should allow the owner to set a resolver address", async () => {
    const { registrar, memens, registrant, controller, other, deployer } =
      await loadFixture(deployBaseRegistrar)

    await registrar.connect(deployer).setResolver(registrant.address)
    expect(await memens.resolver(namehash.hash("meme")), registrant.address)
  })
})

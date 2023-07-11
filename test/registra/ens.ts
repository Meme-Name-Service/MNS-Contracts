import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"

const bytes0x =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const bytes0x1 =
  "0x0000000000000000000000000000000000000000000000000000000000000001"

describe("MEMENS", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMEMENS() {
    const [deployer, alice, bob] = await ethers.getSigners()

    const MEMENS = await ethers.getContractFactory("MNSRegistry")
    const memens = await MEMENS.deploy()

    return { memens, alice, bob, deployer }
  }

  it("should allow ownership transfers", async () => {
    const { memens, deployer } = await loadFixture(deployMEMENS)

    let addr = "0x0000000000000000000000000000000000001234"

    await memens.connect(deployer).setOwner(bytes0x, addr)

    expect(await memens.owner(bytes0x)).to.equal(addr)
  })

  it("should prohibit transfers by non-owners", async () => {
    const { memens } = await loadFixture(deployMEMENS)

    await expect(
      memens.setOwner(bytes0x1, "0x0000000000000000000000000000000000001234")
    ).to.be.reverted
  })

  it("should allow setting resolvers", async () => {
    let addr = "0x0000000000000000000000000000000000001234"

    const { memens } = await loadFixture(deployMEMENS)

    await memens.setResolver(bytes0x, addr)

    expect(await memens.resolver(bytes0x)).to.equal(addr)
  })

  it("should prevent setting resolvers by non-owners", async () => {
    const { memens } = await loadFixture(deployMEMENS)

    await expect(
      memens.setResolver(bytes0x1, "0x0000000000000000000000000000000000001234")
    ).to.be.reverted
  })

  it("should allow setting the TTL", async () => {
    const { memens } = await loadFixture(deployMEMENS)

    await memens.setTTL(bytes0x, 3600)

    expect((await memens.ttl(bytes0x)).toString()).to.equal("3600")
  })

  it("should prevent setting the TTL by non-owners", async () => {
    const { memens } = await loadFixture(deployMEMENS)

    await expect(memens.setTTL(bytes0x1, 3600)).to.be.reverted
  })

  it("should allow the creation of subnodes", async () => {
    const { memens, alice } = await loadFixture(deployMEMENS)

    await memens.setSubnodeOwner(bytes0x, sha3("meme") || "", alice.address)

    expect(await memens.owner(namehash.hash("meme")), alice.address)
  })

  it("should prohibit subnode creation by non-owners", async () => {
    const { memens, alice } = await loadFixture(deployMEMENS)

    await expect(
      memens
        .connect(alice)
        .setSubnodeOwner(bytes0x, sha3("meme") || "", alice.address)
    ).to.be.reverted
  })
})

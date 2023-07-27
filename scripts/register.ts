import { ethers, deployments } from "hardhat"
import { sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"
import { BigNumber } from "@ethersproject/bignumber"
import {
  MEMERegistrarController__factory,
  MNSRegistry__factory,
  Resolver__factory,
  BaseRegistrarImplementation__factory,
} from "../typechain-types"
import crypto from "crypto"

const DAY = 24 * 60 * 60
const REGISTRATION_TIME = 365 * DAY

function generateRandom32Byte() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  let result = "0x"
  for (let i = 0; i < array.length; i++) {
    result += array[i].toString(16).padStart(2, "0")
  }
  return result
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

async function main() {
  const deployer = (await ethers.getSigners())[2]
  const Controller = await deployments.get("MEMERegistrarController")
  const BaseRegistrarImplementation = await deployments.get(
    "BaseRegistrarImplementation"
  )
  const Memens = await deployments.get("MNSRegistry")
  const Resolver = await deployments.get("PublicResolver")

  const memens = MNSRegistry__factory.connect(Memens.address, deployer)
  const controller = MEMERegistrarController__factory.connect(
    Controller.address,
    deployer
  )
  const resolver = Resolver__factory.connect(Resolver.address, deployer)
  const baseRegistrar = BaseRegistrarImplementation__factory.connect(
    BaseRegistrarImplementation.address,
    deployer
  )

  const registerName = "memename1"

  const secret = generateRandom32Byte()

  const price = (
    await controller.rentPrice(registerName, REGISTRATION_TIME)
  )[0].toString()

  const commitment = await controller.makeCommitmentWithConfig(
    registerName,
    deployer.address,
    secret,
    Resolver.address,
    deployer.address
  )

  const tx = await controller.commit(commitment)

  console.log(`Commitment made tx sent: ${tx.hash}`)

  await delay(5000)

  const bufferPrice = BigNumber.from(price).add(
    BigNumber.from(ethers.parseEther("0.01").toString())
  )

  const buyTx = await controller.registerWithConfig(
    registerName,
    deployer.address,
    REGISTRATION_TIME,
    secret,
    Resolver.address,
    deployer.address,
    { value: price.toString() }
  )

  await buyTx.wait()

  console.log(`Buy tx sent: ${buyTx.hash}`)

  console.log(commitment.toString())

  const nodehash = namehash.hash(`${registerName}.meme`)
  console.log(await memens.resolver(nodehash))
  console.log("Resolver address ", await resolver["addr(bytes32)"](nodehash))

  const tokenId = await controller.nameToTokenId(registerName)
  const name = await controller.tokenIdToName(tokenId)
  const expireDate = await controller.nameExpireTimestamp(name)

  console.log("Token ID ", tokenId.toString())
  console.log("Name ", name.toString())
  console.log("Expire Date ", expireDate.toString())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

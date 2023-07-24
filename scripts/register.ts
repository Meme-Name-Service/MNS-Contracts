import { ethers, deployments } from "hardhat"
import { sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"
import { BigNumber } from "@ethersproject/bignumber"
import { MEMERegistrarController__factory } from "../typechain-types"
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
  const Resolver = await deployments.get("PublicResolver")
  const controller = MEMERegistrarController__factory.connect(
    Controller.address,
    deployer
  )
  const registerName = "memename2"

  const secret = generateRandom32Byte()

  const price = (
    await controller.rentPrice(registerName, REGISTRATION_TIME)
  )[0].toString()

  const commitment = await controller.makeCommitment(
    registerName,
    deployer.address,
    secret
  )

  const tx = await controller.commit(commitment, { gasLimit: 250000 })

  console.log(`Commitment made tx sent: ${tx.hash}`)

  await delay(100000)

  const bufferPrice = BigNumber.from(price).add(
    BigNumber.from(ethers.parseEther("0.01").toString())
  )

  const buyTx = await controller.register(
    registerName,
    deployer.address,
    REGISTRATION_TIME,
    secret,
    { value: price.toString(), gasLimit: 250000 }
  )

  await buyTx.wait()

  console.log(`Buy tx sent: ${buyTx.hash}`)

  console.log(commitment.toString())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

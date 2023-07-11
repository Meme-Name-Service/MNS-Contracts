import { BigNumber, BigNumberish } from "@ethersproject/bignumber"
import { ethers } from "hardhat"

export async function latest(): Promise<BigNumber> {
  const block = await ethers.provider.getBlock("latest")
  return BigNumber.from(block?.timestamp)
}

export async function latestBlockNumber(): Promise<BigNumber> {
  const block = await ethers.provider.getBlock("latest")
  return BigNumber.from(block?.number)
}

export async function advanceBlock() {
  await ethers.provider.send("evm_mine", [])
}

export async function set(timeStamp: BigNumber) {
  await ethers.provider.send("evm_mine", [timeStamp.toNumber()])
}

export async function increase(duration: BigNumber) {
  if (duration.isNegative())
    throw Error(`Cannot increase time by a negative amount (${duration})`)

  await ethers.provider.send("evm_increaseTime", [duration.toNumber()])

  await advanceBlock()
}

export async function advanceBlockTo(block: number) {
  let latestBlock = (await latestBlockNumber()).toNumber()

  if (block <= latestBlock) {
    throw new Error("input block exceeds current block")
  }

  while (block > latestBlock) {
    await advanceBlock()
    latestBlock++
  }
}

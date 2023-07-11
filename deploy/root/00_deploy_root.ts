import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  if (!network.tags.use_root) {
    return true
  }

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  await deploy("Root", {
    from: deployer.address,
    args: [Registry.address],
    log: true,
  })

  const Root = await deployments.get("Root")
  const root = new ethers.Contract(Root.address, Root.abi, deployer)

  const tx1 = await registry.connect(owner).setOwner(ZERO_HASH, Root.address)
  console.log(
    `Setting owner of root node to root contract (tx: ${tx1.hash})...`
  )
  await tx1.wait()

  const rootOwner = await root.owner()

  switch (rootOwner) {
    case deployer.address:
      const tx2 = await root.connect(deployer).transferOwnership(owner.address)
      console.log(
        `Transferring root ownership to final owner (tx: ${tx2.hash})...`
      )
      await tx2.wait()
    case owner.address:
      if (!(await root.controllers(owner))) {
        const tx2 = await root.connect(owner).setController(owner.address, true)
        console.log(
          `Setting final owner as controller on root contract (tx: ${tx2.hash})...`
        )
        await tx2.wait()
      }
      break
    default:
      console.log(
        `WARNING: Root is owned by ${rootOwner}; cannot transfer to owner account`
      )
  }

  return true
}

func.id = "root"
func.tags = ["root", "Root"]
func.dependencies = ["ENSRegistry"]

export default func

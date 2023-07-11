import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("starting")
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  const args = []

  await deploy("MNSRegistry", {
    from: deployer.address,
    args,
    log: true,
  })

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  console.log(
    ` |> hh verify --contract contracts/registry/MNSRegistry.sol:MNSRegistry --network ${
      network.name
    } ${Registry.address} ${args.join(" ")}`
  )

  const rootOwner = await registry.owner(ZERO_HASH)
  switch (rootOwner) {
    case deployer.address:
      const tx = await registry.setOwner(ZERO_HASH, owner, { from: deployer })
      console.log(
        `Setting final owner of root node on registry (tx:${tx.hash})...`
      )
      await tx.wait()
      break
    case owner.address:
      break
    default:
      console.log(
        `WARNING: MNS registry root is owned by ${rootOwner}; cannot transfer to owner`
      )
  }

  return true
}

func.id = "registry"
func.tags = ["registry", "MNSRegistry"]

export default func

import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  const args = [Registry.address]

  const reverseRegistrar = await deploy("ReverseRegistrar", {
    from: deployer.address,
    args,
    log: true,
  })

  const ReverseRegistrar = await deployments.get("ReverseRegistrar")

  console.log(
    ` |> hh verify --contract contracts/registry/ReverseRegistrar.sol:ReverseRegistrar --network ${
      network.name
    } ${Registry.address} ${args.join(" ")}`
  )

  if (!reverseRegistrar.newlyDeployed) return

  // if (owner !== deployer) {
  //   const r = new ethers.Contract(
  //     ReverseRegistrar.address,
  //     ReverseRegistrar.abi,
  //     deployer
  //   )
  //   const tx = await r.transferOwnership(owner.address)
  //   console.log(
  //     `Transferring ownership of ReverseRegistrar to ${owner.address} (tx: ${tx.hash})...`
  //   )
  //   await tx.wait()
  // }
}

func.id = "reverse-registrar"
func.tags = ["ReverseRegistrar"]
func.dependencies = ["root"]

export default func

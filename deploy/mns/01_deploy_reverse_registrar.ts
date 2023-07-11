import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  const reverseRegistrar = await deploy("ReverseRegistrar", {
    from: deployer.address,
    args: [Registry.address],
    log: true,
  })

  if (!reverseRegistrar.newlyDeployed) return

  if (owner !== deployer) {
    const ReverseRegistrar = await deployments.get("ReverseRegistrar")
    const r = new ethers.Contract(
      ReverseRegistrar.address,
      ReverseRegistrar.abi,
      deployer
    )
    const tx = await r.transferOwnership(owner.address)
    console.log(
      `Transferring ownership of ReverseRegistrar to ${owner.address} (tx: ${tx.hash})...`
    )
    await tx.wait()
  }
}

func.id = "reverse-registrar"
func.tags = ["ReverseRegistrar"]
func.dependencies = ["root"]

export default func

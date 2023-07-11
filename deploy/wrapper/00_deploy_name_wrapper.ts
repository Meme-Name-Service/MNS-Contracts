import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  const Registrar = await deployments.get("BaseRegistrarImplementation")
  const registrar = new ethers.Contract(
    Registrar.address,
    Registrar.abi,
    deployer
  )

  const nameWrapper = await deploy("NameWrapper", {
    from: deployer.address,
    args: [Registry.address, Registrar.address, owner.address],
    log: true,
  })

  if (!nameWrapper.newlyDeployed) return

  const Wrapper = await deployments.get("NameWrapper")
  const wrapper = new ethers.Contract(Wrapper.address, Wrapper.abi, deployer)

  if (owner !== deployer) {
    const tx = await wrapper.transferOwnership(owner.address)
    console.log(
      `Transferring ownership of NameWrapper to ${owner.address} (tx: ${tx.hash})...`
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === "mainnet") return

  const tx2 = await registrar.connect(owner).addController(Wrapper.address)
  console.log(
    `Adding NameWrapper as controller on registrar (tx: ${tx2.hash})...`
  )
  await tx2.wait()
}

func.id = "name-wrapper"
func.tags = ["wrapper", "NameWrapper"]
func.dependencies = [
  "BaseRegistrarImplementation",
  "registry",
  "ReverseRegistrar",
]

export default func

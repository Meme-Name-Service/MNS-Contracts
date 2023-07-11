import namehash from "eth-ens-namehash"
import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { keccak256 } from "js-sha3"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  if (!network.tags.use_root) {
    return true
  }

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  const Root = await deployments.get("Root")
  const root = new ethers.Contract(Root.address, Root.abi, deployer)

  const bri = await deploy("BaseRegistrarImplementation", {
    from: deployer.address,
    args: [Registry.address, namehash.hash("meme")],
    log: true,
  })
  if (!bri.newlyDeployed) return

  const Registrar = await deployments.get("BaseRegistrarImplementation")
  const registrar = new ethers.Contract(
    Registrar.address,
    Registrar.abi,
    deployer
  )

  const tx1 = await registrar.transferOwnership(owner.address)
  console.log(
    `Transferring ownership of registrar to owner (tx: ${tx1.hash})...`
  )
  await tx1.wait()

  const tx2 = await root
    .connect(owner)
    .setSubnodeOwner("0x" + keccak256("meme"), Registrar.address)
  console.log(
    `Setting owner of meme node to registrar on root (tx: ${tx2.hash})...`
  )
  await tx2.wait()
}

func.id = "registrar"
func.tags = ["memeregistrar", "BaseRegistrarImplementation"]
func.dependencies = ["registry", "root"]

export default func

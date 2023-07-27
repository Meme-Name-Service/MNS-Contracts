import namehash from "eth-ens-namehash"
import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { keccak256 } from "js-sha3"
import { sha3 } from "web3-utils"

const toSha3 = (name: string): string => sha3(name) || ""

const EMPTY_BYTES =
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

  const args = [Registry.address, namehash.hash("meme")]

  const bri = await deploy("BaseRegistrarImplementation", {
    from: deployer.address,
    args,
    log: true,
  })
  if (!bri.newlyDeployed) return

  const Registrar = await deployments.get("BaseRegistrarImplementation")
  const registrar = new ethers.Contract(
    Registrar.address,
    Registrar.abi,
    deployer
  )

  console.log(
    ` |> hh verify --contract contracts/memeregistrar/BaseRegistrarImplementation.sol:BaseRegistrarImplementation --network ${
      network.name
    } ${Registrar.address} ${args.join(" ")}`
  )

  // const tx1 = await registrar.transferOwnership(owner.address)
  // console.log(
  //   `Transferring ownership of registrar to owner (tx: ${tx1.hash})...`
  // )
  // await tx1.wait()
}

func.id = "registrar"
func.tags = ["memeregistrar", "BaseRegistrarImplementation"]
func.dependencies = ["registry", "root"]

export default func

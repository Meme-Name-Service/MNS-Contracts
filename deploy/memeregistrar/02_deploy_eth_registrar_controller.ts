import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { keccak256, sha3 } from "web3-utils"
import namehash from "eth-ens-namehash"

const toSha3 = (name: string): string => sha3(name) || ""
const EMPTY_BYTES =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, deployer)

  const Registrar = await deployments.get("BaseRegistrarImplementation")
  const registrar = new ethers.Contract(
    Registrar.address,
    Registrar.abi,
    deployer
  )

  const PriceOracle = await deployments.get("StablePriceOracle")
  const priceOracle = new ethers.Contract(
    Registrar.address,
    Registrar.abi,
    deployer
  )

  const ReverseRegistrar = await deployments.get("ReverseRegistrar")
  const reverseRegistrar = new ethers.Contract(
    ReverseRegistrar.address,
    ReverseRegistrar.abi,
    deployer
  )

  const NameWrapper = await deployments.get("NameWrapper")
  const nameWrapper = new ethers.Contract(
    NameWrapper.address,
    NameWrapper.abi,
    deployer
  )

  let args = [Registrar.address, PriceOracle.address, 60, 86400]

  await deploy("MEMERegistrarController", {
    from: deployer.address,
    args,
    log: true,
  })

  const Controller = await deployments.get("MEMERegistrarController")
  const controller = new ethers.Contract(
    Controller.address,
    Controller.abi,
    deployer
  )

  console.log(
    ` |> hh verify --contract contracts/memeregistrar/MEMERegistrarController.sol:MEMERegistrarController --network ${
      network.name
    } ${Controller.address} ${args.join(" ")}`
  )

  // if (!controller.newlyDeployed) return

  const MEMERegistrarController = await deployments.get(
    "MEMERegistrarController"
  )

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === "mainnet") return

  const tx1 = await nameWrapper
    .connect(deployer)
    .setController(Controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar
    .connect(deployer)
    .setController(Controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`
  )
  await tx2.wait()

  // if (deployer !== deployer) {
  //   const c = new ethers.Contract(
  //     MEMERegistrarController.address,
  //     MEMERegistrarController.abi,
  //     deployer
  //   )
  //   const tx = await c.transferOwnership(deployer.address)
  //   console.log(
  //     `Transferring ownership of ETHRegistrarController to ${deployer.address} (tx: ${tx.hash})...`
  //   )
  //   await tx.wait()
  // }

  args = [
    Registry.address,
    NameWrapper.address,
    MEMERegistrarController.address,
    ReverseRegistrar.address,
  ]

  await deploy("PublicResolver", {
    from: deployer.address,
    args,
    log: true,
  })

  const PublicResolver = await deployments.get("PublicResolver")
  const resolverContract = new ethers.Contract(
    PublicResolver.address,
    PublicResolver.abi,
    deployer
  )

  console.log(
    ` |> hh verify --contract contracts/resolvers/PublicResolver.sol:PublicResolver --network ${
      network.name
    } ${PublicResolver.address} ${args.join(" ")}`
  )

  const tx3 = await registrar
    .connect(deployer)
    .addController(Controller.address)
  console.log(`Set Controller from registrar (tx: ${tx3.hash})...`)
  await tx3.wait()

  const tx5 = await registry
    .connect(deployer)
    .setSubnodeOwner(EMPTY_BYTES, toSha3("reverse"), deployer.address)
  console.log(`Set subnode with 0x and reverse (tx: ${tx5.hash})...`)
  await tx5.wait()

  const tx4 = await registry
    .connect(deployer)
    .setSubnodeOwner(
      namehash.hash("reverse"),
      toSha3("addr"),
      ReverseRegistrar.address
    )
  console.log(`Set subnode with 0x and meme (tx: ${tx4.hash})...`)
  await tx4.wait()

  const tx6 = await registry
    .connect(deployer)
    .setSubnodeOwner(EMPTY_BYTES, toSha3("meme"), Registrar.address)
  console.log(`Set subnode with 0x and meme (tx: ${tx6.hash})...`)
  await tx6.wait()
}

func.tags = ["ethregistrar", "ETHRegistrarController"]
func.dependencies = [
  "ENSRegistry",
  "BaseRegistrarImplementation",
  "ExponentialPremiumPriceOracle",
  "ReverseRegistrar",
  "NameWrapper",
]

export default func

import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  const Registry = await deployments.get("MNSRegistry")
  const registry = new ethers.Contract(Registry.address, Registry.abi, owner)

  const Registrar = await deployments.get("BaseRegistrarImplementation")
  const registrar = new ethers.Contract(Registrar.address, Registrar.abi, owner)

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
    owner
  )

  const NameWrapper = await deployments.get("NameWrapper")
  const nameWrapper = new ethers.Contract(
    NameWrapper.address,
    NameWrapper.abi,
    owner
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
    .connect(owner)
    .setController(Controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar
    .connect(owner)
    .setController(Controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`
  )
  await tx2.wait()

  if (owner !== deployer) {
    const c = new ethers.Contract(
      MEMERegistrarController.address,
      MEMERegistrarController.abi,
      deployer
    )
    const tx = await c.transferOwnership(owner.address)
    console.log(
      `Transferring ownership of ETHRegistrarController to ${owner.address} (tx: ${tx.hash})...`
    )
    await tx.wait()
  }

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

  // const tx3 = await resolverContract.setInterface(
  //   ethers.utils.namehash("eth"),
  //   interfaceId,
  //   controller.address
  // )
  // console.log(
  //   `Setting ETHRegistrarController interface ID ${interfaceId} on .eth resolver (tx: ${tx3.hash})...`
  // )
  // await tx3.wait()
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

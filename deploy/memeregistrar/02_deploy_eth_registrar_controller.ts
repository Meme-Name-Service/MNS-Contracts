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

  const controller = await deploy("MEMERegistrarController", {
    from: deployer.address,
    args: [Registrar.address, PriceOracle.address, 60, 86400],
    log: true,
  })
  if (!controller.newlyDeployed) return

  if (owner !== deployer) {
    const MEMERegistrarController = await deployments.get(
      "MEMERegistrarController"
    )
    const c = new ethers.Contract(
      MEMERegistrarController.address,
      MEMERegistrarController.abi,
      deployer
    )
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of ETHRegistrarController to ${owner.address} (tx: ${tx.hash})...`
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === "mainnet") return

  // console.log(
  //   "WRAPPER OWNER",
  //   await nameWrapper.owner(),
  //   await nameWrapper.signer.getAddress()
  // )
  // const tx1 = await nameWrapper.setController(controller.address, true)
  // console.log(
  //   `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`
  // )
  // await tx1.wait()

  // const tx2 = await reverseRegistrar.setController(controller.address, true)
  // console.log(
  //   `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`
  // )
  // await tx2.wait()

  // const artifact = await deployments.getArtifact("IETHRegistrarController")
  // const interfaceId = computeInterfaceId(new Interface(artifact.abi))
  // const provider = new ethers.providers.StaticJsonRpcProvider(
  //   ethers.provider.connection.url,
  //   {
  //     ...ethers.provider.network,
  //     ensAddress: (await ethers.getContract("ENSRegistry")).address,
  //   }
  // )
  // const resolver = await provider.getResolver("eth")
  // if (resolver === null) {
  //   registrar.setResolver(ethOwnedResolver.address)
  //   console.log(
  //     `No resolver set for .eth; not setting interface ${interfaceId} for ETH Registrar Controller`
  //   )
  //   return
  // }
  // const resolverContract = await ethers.getContractAt(
  //   "PublicResolver",
  //   resolver.address
  // )
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

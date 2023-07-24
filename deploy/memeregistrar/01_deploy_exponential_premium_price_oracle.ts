import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre
  const { deploy } = deployments
  const [deployer, owner] = await ethers.getSigners()

  const priceFeed = {
    bscMainnet: "0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee",
    bscTestnet: "",
  }

  let oracleAddress: any = priceFeed[network.name]
  let args = ["100000000"]
  if (network.name !== "bscMainnet") {
    await deploy("DummyOracle", {
      from: deployer.address,
      args,
      log: true,
    })

    const DummyOracle = await deployments.get("DummyOracle")

    console.log(
      ` |> hh verify --contract contracts/memeregistrar/DummyOracle.sol:DummyOracle --network ${
        network.name
      } ${DummyOracle.address} ${args.join(" ")}`
    )

    oracleAddress = DummyOracle.address
  }

  args = [oracleAddress, [0, 0, 4, 2, 1]]

  await deploy("StablePriceOracle", {
    from: deployer.address,
    args,
    log: true,
  })

  const StablePriceOracle = await deployments.get("StablePriceOracle")

  console.log(
    ` |> hh verify --contract contracts/memeregistrar/StablePriceOracle.sol:StablePriceOracle --network ${
      network.name
    } ${StablePriceOracle.address} ${args.join(" ")}`
  )
}

func.id = "price-oracle"
func.tags = ["ethregistrar", "ExponentialPremiumPriceOracle", "DummyOracle"]
func.dependencies = ["registry"]

export default func

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

  let oracleAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
  if (network.name !== "mainnet") {
    const dummyOracle = await deploy("DummyOracle", {
      from: deployer.address,
      args: ["23319000000"],
      log: true,
    })
    oracleAddress = dummyOracle.address
  }

  await deploy("StablePriceOracle", {
    from: deployer.address,
    args: [
      oracleAddress,
      [0, 0, "20294266869609", "5073566717402", "158548959919"],
    ],
    log: true,
  })
}

func.id = "price-oracle"
func.tags = ["ethregistrar", "ExponentialPremiumPriceOracle", "DummyOracle"]
func.dependencies = ["registry"]

export default func

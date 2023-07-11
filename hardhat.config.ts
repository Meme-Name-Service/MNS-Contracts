import "@nomicfoundation/hardhat-toolbox"
import dotenv from "dotenv"
import "hardhat-deploy"
import "hardhat-gas-reporter"

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1300,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      saveDeployments: false,
      tags: ["test", "use_root"],
      allowUnlimitedContractSize: false,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 0,
    },
  },
}

export default config

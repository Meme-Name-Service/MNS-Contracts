import "@nomicfoundation/hardhat-toolbox"
import "dotenv/config"
import "hardhat-deploy"
import "hardhat-gas-reporter"

const tempAccounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY, process.env.OWNER_PRIVATE_KEY]
  : []

const accounts: string[] = tempAccounts.filter(
  (account): account is string => account !== undefined
)

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
      tags: ["test", "use_root"],
      allowUnlimitedContractSize: false,
    },
    bscTestnet: {
      tags: ["test", "use_root"],
      allowUnlimitedContractSize: false,
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts,
    },
    bscMainnet: {
      tags: ["test", "use_root"],
      allowUnlimitedContractSize: false,
      url: "https://bsc-dataseed1.defibit.io/",
      accounts,
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
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

export default config

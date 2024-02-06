import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// typechain imports
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: "fafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafa", // in real world, should be in an .env file
          balance: "10000000000000000000000" // 10k ETH       
        },
        {
          privateKey: "fafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafb", // in real world, should be in an .env file
          balance: "10000000000000000000000" // 10k ETH       
        }
      ],
    }
  }
};

export default config;

# Tolem Markets Smart Contracts

This repository contains the smart contracts for the Hedera Environmental Social and Governance Marketplace (HEM).

**_Get Coinmarketcap API Key_**

Signup for a coinmarketcap account at https://coinmarketcap.com/api/

**_Create Hedera Testnet Account_**

Go to https://docs.hedera.com/guides/testnet/testnet-access and create a Testnet account.

**_Set up environment variables_**

```bash
# copy .env file
cp .env.example .env

# use your testnet keys

echo ADMIN_PRIVATE_KEY=000...000 >> .env
echo ADMIN_ACCOUNT_ID=0.0.00000000 >> .env

echo SELLER_PRIVATE_KEY=000...000 >> .env
echo SELLER_ACCOUNT_ID=0.0.00000000 >> .env

echo BUYER_PRIVATE_KEY=000...000 >> .env
echo BUYER_ACCOUNT_ID=0.0.00000000 >> .env

echo COINMARKETCAP_API_KEY=coinmarketcap-api-key-here >> .env
```

**_Quick Deploy!_**

To quickly deploy new NFTs and contracts run:

```bash
npm i
npm run build

# Deploy new smart contract
npm run dev

# Create a new account
npm run create-account

# Seed nfts (where `3` is the amount of new NFTs to mint)
npm run seed:nfts -- <network> <smart-contract-id> <amount-of-tokens-to-mint>

# Associate NFT to accounts
npm run associate-token <network> <account-id> <private-key> <token-id>

# Apply KYC to an account
npm run apply-kyc -- <network> <nft-admin-account-id> <nft-admin-private-key> <token-id> <account-id>

# Associate NFT to smart contract
npm run associate-token-to-contract -- <network> <account-id> <private-key> <token-id> <smart-contract-id>

# Apply Contract Kyc
npm run apply-contract-kyc -- <network> <nft-admin-account-id> <nft-admin-private-key> <token-id> <smart-contract-id>

# Set tinybar (HBAR) to cents conversion rate from coinmarketcap
# ex: `0.0.00000000` is the smart contract address
npm run set-tinybar-per-cent -- <smart-contract-account-id>
# Or set tinybar to cents conversion rate with manual number
npm run set-tinybar-per-cent -- <smart-contract-account-id> <conversion-rate>

# Create a new topic (id)
npm run create-topic -- <network>

# Get listed offset info
npm run get-offset -- <network> <smart-contract-id> <token-id> <serial-number>
```

# Docker Settings

Instructions: https://github.com/hashgraph/hedera-local-node

- Ensure to use Docker Compose version 1.29.2 on macOS, due to known bug in Docker Compose V2.
- Ensure the gRPC FUSE for file sharing and Use Docker Compose V2 settings are disabled in the docker settings.
- Ensure the following configurations are set at minimum in Docker **Settings** -> **Resources** and are available for use:
  - CPUs: 6
  - Memory: 5GB
  - Swap: 1 GB
  - Disk Image Size: 59.6 GB

# How to Run

**Installation**

```bash
npm i
```

**Code Formatting**

```bash
npm run lint
npm run prettier
```

**Clean**

```bash
npm run clean
```

**Build**

```bash
npm run build
```

**Tests**

Unit Tests

```bash
npm run test
```

Code Coverage

```bash
npm run test:coverage
```

Integration Tests

```bash
# start node
npm run node:start

# run tests
npm run test:integration

# stop node
npm run node:stop
```

**Deploy DEV**

```bash
npm run dev
```

**Deploy PROD**

```bash
npm run prod
```

# Demos

**Demo 1**

```bash
npm run node:start

npm run demo:1

npm run node:stop
```

# Microservice Information

See the Tolem Markets microservices repository for information on how to run the Tokem Markets API.

Ensure that the `ADMIN_ACCOUNT_ID` and ` ADMIN_PRIVATE_KEY` in you're `.env` match the enviromental variables found in the `.hem.local.properties` file in the microservice repository.

# Hardhat Notes

**Hardhat Project Commands**

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

**Etherscan verification**

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

**Performance optimizations**

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

## Scanning

[Slither](https://github.com/crytic/slither) is used to scan this repository for Solidity security misconfigurations and code quality via GitHub Actions. You may run these scans locally:

```
slither contracts --solc-remaps @openzeppelin=node_modules/@openzeppelin
```

## License

Copyright 2022 Tolam Earth

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

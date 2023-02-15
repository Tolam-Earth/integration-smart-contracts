# Tolem Markets Smart Contracts

This repository contains the smart contracts for the Tolam Markets Hedera Environmental Social and Governance Marketplace (HEM).

## Microservice Information

See the Tolem Markets microservices repository for information on how to run the Tokem Markets API.

Ensure that the `ADMIN_ACCOUNT_ID` and ` ADMIN_PRIVATE_KEY` in you're `.env` match the enviromental variables found in the `.hem.local.properties` file in the microservice repository.

## Deployment Instructions

**1. Create Environment Variable File**

Create the environment variable file by copying the `.env.example` to `.env`

_ex:_

```bash
cp .env.example .env
```

**2. Create Admin Hedera Account**

Go to https://portal.hedera.com/register and create an Hedera account. It is highly recommened to use the testnet for evaluating this software.
This account will be used to deploy the smart contract and perform adminstrative operations. Add this account to your `.env` as `ADMIN_ACCOUNT_ID` and `ADMIN_PRIVATE_KEY`.

_ex:_

```bash
ADMIN_PRIVATE_KEY=<hedera-private-key>
ADMIN_ACCOUNT_ID=<hedera-account-id>
```

**3. Deploy Smart Contract**

Build and deploy the Smart Contract onto the specified Hedera Network.

```bash
# install node package dependencies
npm i

# compile the smart contract
npm run build

# deploy to testnet
npm run dev

# deployt to mainnet
npm run prod
```

**4. Create Seller Account (only needed for `seed:nfts` script)**

Create a seller account by running the `create-account` script:

```bash
npm run create-account
```

Add the Account ID and Private Key to your `.env` file as `SELLER_ACCOUNT_ID` and `SELLER_PRIVATE_KEY`.

```bash
SELLER_PRIVATE_KEY=<hedera-private-key>
SELLER_ACCOUNT_ID=<hedera-account-id>
```

**5. Create Buyer Account (only needed for `seed:nfts` script)**

Create a buyer account by running the `create-account` script:

```bash
npm run create-account
```

```bash
BUYER_PRIVATE_KEY=<hedera-private-key>
BUYER_ACCOUNT_ID=<hedera-account-id>
```

## Scripts

Here is a list of all the scripts that can be ran.

```bash
npm i
npm run build

# Deploy new smart contract to testnet
npm run dev

# Deploy new smart contract to mainnet
npm run prod

# Create a new account
npm run create-account

# Seed nfts (where `3` is the amount of new NFTs to mint)
npm run seed:nfts -- <network> <smart-contract-id> <amount-of-tokens-to-mint>

# Associate NFT to accounts
npm run associate-token <network> <account-id> <private-key> <token-id>

# Transfer token
npm run transfer-token -- <network> <from-account-id> <from-account-private-key> <to-account-id> <token-id> <serial-number>

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

## Developer Notes

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

**Unit Tests**

_Get Coinmarketcap API Key (Optional)_:
If you would like gas reporting when running the unit tests signup for a coinmarketcap account at https://coinmarketcap.com/api/ and add your API key to the `.env` file and set `REPORT_GAS=TRUE`.

`.env`

```bash
REPORT_GAS=TRUE
COINMARKETCAP_API_KEY=<coinmarketcap-api-key-here>
```

```bash
npm run test
```

Code Coverage

```bash
npm run test:coverage
```

**Integration Tests**

In order to run the integration tests against a local hedera node, you must use the following docker settings:

Instructions: https://github.com/hashgraph/hedera-local-node

- Ensure to use Docker Compose version 1.29.2 on macOS, due to known bug in Docker Compose V2.
- Ensure the gRPC FUSE for file sharing and Use Docker Compose V2 settings are disabled in the docker settings.
- Ensure the following configurations are set at minimum in Docker **Settings** -> **Resources** and are available for use:
  - CPUs: 6
  - Memory: 5GB
  - Swap: 1 GB
  - Disk Image Size: 59.6 GB

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

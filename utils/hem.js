/*!
 * Copyright 2022 Tolam Earth
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const axios = require("axios");
const { BigNumber } = require("ethers");
const {
  AccountId,
  AccountBalanceQuery,
  AccountCreateTransaction,
  Client,
  ContractCreateTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  Hbar,
  NftId,
  TokenId,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TopicCreateTransaction,
  TokenGrantKycTransaction,
  TokenMintTransaction,
  TokenNftInfoQuery,
  TokenType,
  TransferTransaction,
  PrivateKey,
  ContractId,
} = require("@hashgraph/sdk");

const hemContractJSON = require("../build/Hem.json");
const nftValidatorContractJSON = require("../build/NFTValidator.json");

const getHbarPrice = async function () {
  let response = null;
  let price = null;
  const hederaCmcId = 4642;

  try {
    response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
        },
        params: {
          id: hederaCmcId,
          // slug: 'hedera',
          // symbol: 'HBAR'
        },
      }
    );
  } catch (ex) {
    response = null;
    console.log(ex);
  }

  if (response) {
    const json = response.data;
    price = json.data[hederaCmcId].quote.USD.price;

    price = parseFloat(price);
  }

  return price;
};

const getTinybarPerCent = async function () {
  // Derivation:
  //
  // X USD    100 CENT         1 HBAR            TINYBAR
  // -------- * -------- * ------------------- = -------
  // 1 HBAR     1 USD     100,000,000 TINYBAR     CENT

  const centPerUsd = 100;
  const tinybarPerHbar = 10 ** 8;

  const usdPerHbar = await getHbarPrice();
  const centPerHbar = parseFloat(usdPerHbar * centPerUsd);

  // Old way
  // ex:
  //  5 cents = 1 HBAR
  //  5 cents = 100,000,000 TINYBAR

  // const tinybarPerCent = Math.trunc(parseFloat(centPerHbar * tinybarPerHbar));

  // New way
  // ex:
  //  5 cents = 1 HBAR
  //
  //  5 CENT         1 HBAR            CENT
  //  ------ * -------------------  = -------
  //  1 HBAR   100,000,000 TINYBAR    TINYBAR
  //
  //                   CENT             TINYBAR
  //  And then invert ------- => to get -------
  //                  TINYBAR            CENT

  const centPerTinybar = parseFloat(centPerHbar / tinybarPerHbar);
  const tinybarPerCent = Math.trunc(1 / parseFloat(centPerTinybar));

  return BigNumber.from(tinybarPerCent);
};

async function deployContract(
  client,
  contractByteCode,
  gas,
  constructParameters
) {
  // console.log(`\nCreate file for contract bytecode`);

  // Create a file on Hedera and store the hex-encoded bytecode
  const fileCreateTx = await new FileCreateTransaction()
    .setKeys([client.operatorPublicKey])
    .execute(client);
  const fileCreateRx = await fileCreateTx.getReceipt(client);
  const bytecodeFileId = fileCreateRx.fileId;
  // console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

  // Append contents to the file
  const fileAppendTx = await new FileAppendTransaction()
    .setFileId(bytecodeFileId)
    .setContents(contractByteCode)
    .setMaxChunks(25)
    .setTransactionValidDuration(180)   // 3 minutes
    .execute(client);
  await fileAppendTx.getReceipt(client);
  // console.log(`- Content added`);

  // console.log(`\nDeploy contract`);
  const contractCreateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(gas);
  if (constructParameters) {
    contractCreateTx.setConstructorParameters(constructParameters);
  }

  const result = await contractCreateTx.execute(client);

  const contractCreateRx = await result.getReceipt(client);
  return contractCreateRx.contractId;
}

async function deploy(network, operatorId, operatorKey) {
  const defaultTinybarPerCents = 17523291;
  let client;

  if (network === "localhost") {
    client = Client.forNetwork({
      "127.0.0.1:50211": new AccountId(3),
    }).setMirrorNetwork("127.0.0.1:5600");
  } else {
    client = Client.forNetwork(network);
  }

  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));

  const nftValidatorContractId = await deployContract(
    client,
    nftValidatorContractJSON.bytecode,
    100000,
    null
  );

  const constructParams = new ContractFunctionParameters()
    .addAddress(nftValidatorContractId.toSolidityAddress())
    .addUint256(defaultTinybarPerCents)
    .addBool(false);

  const hemContractId = await deployContract(
    client,
    hemContractJSON.bytecode,
    3000000,
    constructParams
  );

  return {
    nftValidatorId: nftValidatorContractId.toString(),
    hemId: hemContractId.toString(),
  };
}

/**
 * Helper function to encode function name and parameters that can be used to invoke a contract's function
 * @param abiInterface an ethers.js interface
 * @param functionName the name of the function to invoke
 * @param parameterArray an array of parameters to pass to the function
 */
function encodeFunctionParameters(abiInterface, functionName, parameterArray) {
  // build the call parameters using ethers.js
  // .slice(2) to remove leading '0x'
  const functionCallAsHexString = abiInterface
    .encodeFunctionData(functionName, parameterArray)
    .slice(2);
  // convert to a Uint8Array
  return Buffer.from(functionCallAsHexString, `hex`);
}

class Hem {
  constructor(network, hemContractId, accountId, privateKey) {
    this.hemContractId =
      ContractId.fromString(hemContractId) ||
      ContractId.fromString("0.0.00000000");
    this.accountId =
      AccountId.fromString(accountId) || AccountId.fromString("0.0.00000000");
    this.privateKey =
      PrivateKey.fromString(privateKey) || PrivateKey.generateED25519();

    if (network === "mainnet") {
      this.client = Client.forMainnet();
    } else if (network === "testnet") {
      this.client = Client.forTestnet();
    } else if (network === "localhost") {
      this.client = Client.forNetwork({
        "127.0.0.1:50211": new AccountId(3),
      }).setMirrorNetwork("127.0.0.1:5600");
    }

    this.client.setOperator(this.accountId, this.privateKey);
  }

  createAccount = async function (initialBalance, key) {
    let privateKey;

    if (key === "undefined") {
      privateKey = PrivateKey.fromString(key);
    } else {
      privateKey = PrivateKey.generateED25519();
    }

    const createAccountTx = await new AccountCreateTransaction()
      .setKey(privateKey)
      .setInitialBalance(initialBalance)
      .execute(this.client);

    const createAccountRx = await createAccountTx.getReceipt(this.client);

    return {
      accountId: createAccountRx.accountId.toString(),
      privateKey: privateKey.toString(),
    };
  };

  createTopic = async function () {
    const transaction = new TopicCreateTransaction();
    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return receipt.topicId;
  };

  getHbarBalance = async function () {
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.accountId)
      .execute(this.client);
    return balance.hbars;
  };

  getNftBalance = async function (tokenId) {
    const balanceCheckTx = await new AccountBalanceQuery()
      .setAccountId(this.accountId)
      .execute(this.client);
    const balance = balanceCheckTx.tokens._map.get(tokenId.toString());

    if (balance) {
      return parseInt(balance.toString());
    } else {
      return 0;
    }
  };

  getNftInfo = async function (tokenId, serial) {
    const nftId = new NftId(tokenId, serial);
    const nftInfo = await new TokenNftInfoQuery()
      .setNftId(nftId)
      .execute(this.client);
    return nftInfo[0].accountId.toString();
  };

  transferNFT = async function (to, tokenId, serial) {
    // console.log(`** Transfering ${tokenId} from ${from} to ${to} **`);
    const transaction = await new TransferTransaction()
      .addNftTransfer(tokenId, serial, this.accountId, to)
      .freezeWith(this.client);

    const signTx = await transaction.sign(this.privateKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const transactionStatus = receipt.status;
    return transactionStatus.toString();
  };

  transferNFTs = async function (to, tokenId, serials) {
    // console.log(`** Transfering ${tokenId}: ${serialNumbers} from ${from} to ${to} **`);
    const transaction = await new TransferTransaction();

    serials.forEach((s) => {
      transaction.addNftTransfer(tokenId, s.toString(), this.accountId, to);
    });

    transaction.freezeWith(this.client);
    const signTx = await transaction.sign(this.privateKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const transactionStatus = receipt.status;

    return transactionStatus.toString();
  };

  associateNFT = async function (tokenId) {
    const transaction = await new TokenAssociateTransaction()
      .setAccountId(this.accountId)
      .setTokenIds([tokenId])
      .freezeWith(this.client);

    const signTx = await transaction.sign(this.privateKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const transactionStatus = receipt.status;

    return transactionStatus.toString();
  };

  associateOffsets = async function (tokenIds) {
    tokenIds = tokenIds.map((tokenId) => {
      return TokenId.fromString(tokenId).toSolidityAddress();
    });

    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "associateOffsets",
        new ContractFunctionParameters().addAddressArray(tokenIds)
      )
      .setGas(1000000)
      .execute(this.client);
    return await contractListTx.getReceipt(this.client);
  };

  getOffset = async function (tokenId, serial) {
    const contractCallResult = await new ContractCallQuery()
      .setContractId(this.hemContractId)
      .setGas(500000)
      .setFunction(
        "getOffset",
        new ContractFunctionParameters()
          .addAddress(TokenId.fromString(tokenId).toSolidityAddress())
          .addInt64(serial)
      )
      .setQueryPayment(new Hbar(1))
      .execute(this.client);

    return {
      seller: AccountId.fromSolidityAddress(
        contractCallResult.getAddress(0)
      ).toString(),
      price: parseInt(contractCallResult.getUint256(1).toString()),
      hemApproved: contractCallResult.getBool(2),
      userApproved: contractCallResult.getBool(3),
    };
  };

  getPurchaseWhitelist = async function (tokenId, serial) {
    const contractCallResult = await new ContractCallQuery()
      .setContractId(this.hemContractId)
      .setGas(500000)
      .setFunction(
        "getPurchaseWhitelist",
        new ContractFunctionParameters()
          .addAddress(TokenId.fromString(tokenId).toSolidityAddress())
          .addInt64(serial)
      )
      .setQueryPayment(new Hbar(1))
      .execute(this.client);

    return {
      buyer: AccountId.fromSolidityAddress(
        contractCallResult.getAddress(0)
      ).toString(),
      price: parseInt(contractCallResult.getUint256(1).toString()),
      hemApproved: contractCallResult.getBool(2),
    };
  };

  list = async function (tokenIds, serials, price) {
    tokenIds = tokenIds.map((tokenId) => {
      return TokenId.fromString(tokenId).toSolidityAddress();
    });

    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "list_offset",
        new ContractFunctionParameters()
          .addAddress(this.accountId.toSolidityAddress())
          .addAddressArray(tokenIds)
          .addInt64Array(serials)
          .addUint256Array(price)
      )
      .setGas(1000000)
      .execute(this.client);
    return await contractListTx.getReceipt(this.client);
  };

  purchase = async function (tokenIds, serials, priceInTinybar) {
    priceInTinybar = priceInTinybar.add(50000000); // Pad the price by 0.5 Hbar
    const hBarPrice = Hbar.fromTinybars(priceInTinybar.toString());
    tokenIds = tokenIds.map((tokenId) => {
      return TokenId.fromString(tokenId).toSolidityAddress();
    });

    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "purchase_offset",
        new ContractFunctionParameters()
          .addAddress(this.accountId.toSolidityAddress())
          .addAddressArray(tokenIds)
          .addInt64Array(serials)
      )
      .setPayableAmount(hBarPrice)
      .setGas(1000000)
      .execute(this.client);
    await contractListTx.getReceipt(this.client);
  };
}

class HemNFTAdmin extends Hem {
  createNFTNoKyc = async function () {
    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName("Demo 3")
      .setTokenSymbol("Test")
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyKey(this.privateKey)
      .setTreasuryAccountId(this.accountId)
      .execute(this.client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(this.client);
    const tokenId = tokenCreateRx.tokenId;
    return tokenId;
  };

  createNFT = async function () {
    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName("Demo 3")
      .setTokenSymbol("Test")
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyKey(this.privateKey)
      .setKycKey(this.privateKey)
      .setTreasuryAccountId(this.accountId)
      .execute(this.client);

    const tokenCreateRx = await tokenCreateTx.getReceipt(this.client);
    const tokenId = tokenCreateRx.tokenId;
    return tokenId;
  };

  grantContractKyc = async function (tokenId) {
    return await this.grantKyc(
      AccountId.fromString(this.hemContractId.toString()),
      tokenId
    );
  };

  grantKyc = async function (accountId, tokenId) {
    const transaction = await new TokenGrantKycTransaction()
      .setAccountId(accountId)
      .setTokenId(tokenId)
      .freezeWith(this.client);

    const signTx = await transaction.sign(this.privateKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return receipt;
  };

  mintMultipleNFTs = async function (tokenId, amount) {
    // console.log(`\n** Minting ${amount} NFTs **`);
    const CID = "QmTy8fATSsEJazSekXTyZHuqEFu2H9sqYQGmaBvMW8jTxN";
    const metadata = [];
    for (let i = 1; i <= amount; i++) {
      metadata.push(Buffer.from(CID));
    }

    const tokenMintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata(metadata)
      .execute(this.client);
    await tokenMintTx.getReceipt(this.client);
  };
}

class HemAdmin extends Hem {
  getNftBalance = async function (tokenId) {
    const balanceCheckTx = await new AccountBalanceQuery()
      .setContractId(this.hemContractId)
      .execute(this.client);
    const balance = balanceCheckTx.tokens._map.get(tokenId.toString());

    if (balance) {
      return parseInt(balance.toString());
    } else {
      return 0;
    }
  };

  setTinybarPerCent = async function (price) {
    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "setTinybarPerCent",
        new ContractFunctionParameters().addUint256(price.toString())
      )
      .setGas(1000000)
      .execute(this.client);

    return await contractListTx.getReceipt(this.client);
  };

  getTinybarPerCent = async function () {
    const contractCallResult = await new ContractCallQuery()
      .setContractId(this.hemContractId)
      .setGas(500000)
      .setFunction("getTinybarPerCent")
      .setQueryPayment(new Hbar(1))
      .execute(this.client);

    return contractCallResult.getUint256(0);
  };

  whitelistList = async function (seller, tokenIds, serials, prices) {
    tokenIds = tokenIds.map((tokenId) => {
      return TokenId.fromString(tokenId).toSolidityAddress();
    });

    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "whitelist_list",
        new ContractFunctionParameters()
          .addAddress(seller)
          .addAddressArray(tokenIds)
          .addInt64Array(serials)
          .addUint256Array(prices)
      )
      .setGas(1000000)
      .execute(this.client);
    await contractListTx.getReceipt(this.client);
  };

  whitelistPurchase = async function (buyer, tokenIds, serials, minPrice) {
    tokenIds = tokenIds.map((tokenId) => {
      return TokenId.fromString(tokenId).toSolidityAddress();
    });

    const contractListTx = await new ContractExecuteTransaction()
      .setContractId(this.hemContractId)
      .setFunction(
        "whitelist_purchase",
        new ContractFunctionParameters()
          .addAddress(buyer)
          .addAddressArray(tokenIds)
          .addInt64Array(serials)
      )
      .setGas(1000000)
      .execute(this.client);
    await contractListTx.getReceipt(this.client);
  };
}

module.exports = {
  deploy,
  getHbarPrice,
  getTinybarPerCent,
  deployContract,
  encodeFunctionParameters,
  Hem,
  HemAdmin,
  HemNFTAdmin,
};

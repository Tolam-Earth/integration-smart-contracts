const {
  AccountId,
  PrivateKey,
  Client,
  ContractFunctionParameters,
} = require("@hashgraph/sdk");

const {
  getTinybarPerCent,
  deployContract,
  Hem,
  HemAdmin,
  HemNFTAdmin,
} = require("../utils/hem");

const nftValidatorContractJSON = require("../build/NFTValidator.json");
const hemContractJSON = require("../build/Hem.json");

async function main() {
  // Hedera Operator Client
  const operatorId = AccountId.fromString("0.0.2");
  const operatorKey = PrivateKey.fromString(
    "302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
  );
  const node = { "127.0.0.1:50211": new AccountId(3) };
  const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
  client.setOperator(operatorId, operatorKey);

  // Contract Deployment
  const defaultTinybarPerCents = 17523291;

  const nftValidatorContractId = await deployContract(
    client,
    nftValidatorContractJSON.bytecode,
    100000,
    null
  );

  const constructParams = new ContractFunctionParameters()
    .addAddress(nftValidatorContractId.toSolidityAddress())
    .addUint256(defaultTinybarPerCents);

  const hemContractId = await deployContract(
    client,
    hemContractJSON.bytecode,
    3000000,
    constructParams
  );

  // Hem Account Setup
  const admin = new HemAdmin(
    "localhost",
    hemContractId,
    operatorId.toString(),
    operatorKey.toString()
  );

  const { accountId: nftAdminAccountId, privateKey: nftAdminPrivateKey } =
    await admin.createAccount(100);
  const { accountId: aliceAccountId, privateKey: alicePrivateKey } =
    await admin.createAccount(100);
  const { accountId: bobAccountId, privateKey: bobPrivateKey } =
    await admin.createAccount(100);

  const nftAdmin = new HemNFTAdmin(
    "localhost",
    hemContractId,
    nftAdminAccountId,
    nftAdminPrivateKey
  );

  const alice = new Hem(
    "localhost",
    hemContractId,
    aliceAccountId,
    alicePrivateKey
  );

  const bob = new Hem("localhost", hemContractId, bobAccountId, bobPrivateKey);

  // Set HBAR per Cent
  const hbarPerUsd = await getTinybarPerCent();
  await admin.setTinybarPerCent(hbarPerUsd);

  // Hedera NFTs
  const nftId = await nftAdmin.createNFT();
  await nftAdmin.mintMultipleNFTs(nftId, 10);

  // Give NFTs to alice
  await alice.associateNFT(nftId);
  await bob.associateNFT(nftId);

  let serialNumbers = [1];
  await nftAdmin.transferNFTs(alice.accountId, nftId, serialNumbers);

  const nfts = [nftId.toSolidityAddress()];
  const prices = [5];
  serialNumbers = [1];

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("ACCOUNTS");
  console.log("-------------------------------------------------------------");
  console.log("admin       :", admin.accountId.toString());
  console.log("nftAdmin    :", nftAdmin.accountId.toString());
  console.log("alice       :", alice.accountId.toString());
  console.log("bob         :", bob.accountId.toString());

  console.log("\r\n");
  console.log("contractId  :", hemContractId.toString());

  console.log("\r\n");
  console.log("tokenId     :", nftId.toString());

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("HBAR BALANCE");
  console.log("-------------------------------------------------------------");
  console.log("alice    :", (await alice.getHbarBalance()).toString());
  console.log("bob      :", (await bob.getHbarBalance()).toString());

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFTs BALANCE");
  console.log("-------------------------------------------------------------");
  console.log("contractId  :", await admin.getNftBalance(nftId));
  console.log("alice       :", await alice.getNftBalance(nftId));
  console.log("bob         :", await bob.getNftBalance(nftId));

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFT OWNER");
  console.log("-------------------------------------------------------------");
  console.log("Owner of NFT1:", await admin.getNftInfo(nftId, 1));

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log(" 1 USD = ", hbarPerUsd.toString(), " Tinybar");
  console.log("-------------------------------------------------------------");
  console.log("\r\n");

  console.log(
    `1. >>> admin.whitelist(${alice.accountId}, [${nftId}], [${serialNumbers}], [${prices}]); \r\n`
  );
  await admin.whitelistList(
    alice.accountId.toSolidityAddress(),
    nfts,
    serialNumbers,
    prices
  );

  for (let i = 0; i < nfts.length; i++) {
    console.log(
      `QUERY. >>> admin.getOffset(${nftId}, ${serialNumbers[i]}); \r\n`
    );
    const listed = await admin.getOffset(nfts[i], serialNumbers[i]);
    console.log(listed, "\r\n");
  }

  console.log(
    "\r\n-------------------------------------------------------------\r\n"
  );
  console.log(
    `2. >>> alice.list([${nftId}], [${serialNumbers}], [${prices}]); \r\n`
  );
  await alice.list(nfts, serialNumbers, prices);

  for (let i = 0; i < nfts.length; i++) {
    console.log(
      `QUERY. >>> admin.getOffset(${nftId}, ${serialNumbers[i]}); \r\n`
    );
    const listed = await admin.getOffset(nfts[i], serialNumbers[i]);
    console.log(listed, "\r\n");
  }

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFTs BALANCE");
  console.log("-------------------------------------------------------------");
  console.log("contractId  :", await admin.getNftBalance(nftId));
  console.log("alice       :", await alice.getNftBalance(nftId));
  console.log("bobH        :", await bob.getNftBalance(nftId));

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFT OWNER");
  console.log("-------------------------------------------------------------");
  console.log("Owner of NFT1:", await admin.getNftInfo(nftId, 1));
  console.log("\r\n");

  console.log(
    "\r\n-------------------------------------------------------------\r\n"
  );
  console.log(
    `3. >>> admin.whitelistPurchase(${bob.accountId}, [${nftId}], [${serialNumbers}], [${prices}]); \r\n`
  );
  await admin.whitelistPurchase(
    bob.accountId.toSolidityAddress(),
    nfts,
    serialNumbers,
    prices
  );

  console.log(
    "\r\n-------------------------------------------------------------\r\n"
  );
  console.log(
    `4. >>> bob.whitelistPurchase([${nftId}], [${serialNumbers}], ${hbarPerUsd.mul(
      prices[0]
    )}); \r\n`
  );
  await bob.purchase(nfts, serialNumbers, hbarPerUsd.mul(prices[0]));

  for (let i = 0; i < nfts.length; i++) {
    console.log(
      `QUERY. >>> admin.getOffset(${nftId}, ${serialNumbers[i]}); \r\n`
    );
    const listed = await admin.getOffset(nfts[i], serialNumbers[i]);
    console.log(listed, "\r\n");
  }

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("HBAR BALANCE");
  console.log("-------------------------------------------------------------");
  console.log("alice    :", (await alice.getHbarBalance()).toString());
  console.log("bob      :", (await bob.getHbarBalance()).toString());

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFTs BALANCE");
  console.log("-------------------------------------------------------------");
  console.log("contractId  :", await admin.getNftBalance(nftId));
  console.log("alice      :", await alice.getNftBalance(nftId));
  console.log("bob        :", await bob.getNftBalance(nftId));

  console.log(
    "\r\n-------------------------------------------------------------"
  );
  console.log("NFT OWNER");
  console.log("-------------------------------------------------------------");
  console.log("Owner of NFT1:", await admin.getNftInfo(nftId, 1));
  console.log("\r\n");
}

main();

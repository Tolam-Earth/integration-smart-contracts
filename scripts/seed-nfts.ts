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
require("dotenv").config();
const { Hem, HemAdmin, HemNFTAdmin } = require("../utils/hem");

const seedNFTs = async function () {
  const network = process.argv[2];
  const hemContractId = process.argv[3];
  const nftAmount = process.argv[4];

  console.log(`seedNFTs(${hemContractId}, ${nftAmount})\r\n`);

  const adminAccountId = process.env.ADMIN_ACCOUNT_ID;
  const adminPrivateKeyId = process.env.ADMIN_PRIVATE_KEY;

  const sellerAccount = process.env.SELLER_ACCOUNT_ID;
  const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY;

  const buyerAccount = process.env.BUYER_ACCOUNT_ID;
  const buyerPrivateKey = process.env.BUYER_PRIVATE_KEY;

  // Hedera Accounts
  const admin = new HemAdmin(
    network,
    hemContractId,
    adminAccountId,
    adminPrivateKeyId
  );

  const { accountId: nftAdminAccountId, privateKey: nftAdminPrivateKey } =
    await admin.createAccount(100);

  // Hem Account Setup
  const seller = new Hem(
    network,
    hemContractId,
    sellerAccount,
    sellerPrivateKey
  );

  const buyer = new Hem(network, hemContractId, buyerAccount, buyerPrivateKey);

  const nftAdmin = new HemNFTAdmin(
    network,
    hemContractId,
    nftAdminAccountId,
    nftAdminPrivateKey
  );

  // Hedera NFTs
  const nftId = await nftAdmin.createNFT();
  await nftAdmin.mintMultipleNFTs(nftId, nftAmount);

  await seller.associateNFT(nftId);
  await buyer.associateNFT(nftId);
  await nftAdmin.associateOffsets([nftId]);

  await nftAdmin.grantKyc(seller.accountId, nftId);
  await nftAdmin.grantKyc(buyer.accountId, nftId);
  await nftAdmin.grantContractKyc(nftId);

  // Give NFTs to seller
  const serialNumbers = Array.from({ length: nftAmount }, (_, i) => i + 1);
  await nftAdmin.transferNFTs(seller.accountId, nftId, serialNumbers);

  console.log("NFT Admin Account ID:", nftAdmin.accountId.toString());
  console.log("NFT Admin Private Key:", nftAdmin.privateKey.toString());
  console.log("NFT ID: ", nftId.toString());

  return {
    nftId: nftId.toString(),
    nftAdminAccountId: nftAdminAccountId,
    nftAdminPrivateKey: nftAdminPrivateKey,
  };
};

seedNFTs();

module.exports = {
  seedNFTs,
};

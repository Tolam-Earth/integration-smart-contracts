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
import { expect } from "chai";

const {
  AccountId,
  ContractId,
  Client,
  PrivateKey,
  ContractFunctionParameters,
  Hbar,
} = require("@hashgraph/sdk");

const {
  deploy,
  getTinybarPerCent,
  Hem,
  HemAdmin,
  HemNFTAdmin,
} = require("../utils/hem");

const nftValidatorContractJSON = require("../build/NFTValidator.json");
const hemContractJSON = require("../build/Hem.json");

describe("Hem Integration", function () {
  // Hem Account Instances
  let admin: typeof HemAdmin;
  let nftAdmin: typeof HemNFTAdmin;
  let alice: typeof Hem;
  let bob: typeof Hem;

  // Hedera NFTs
  let nftId: any;

  // Contracts
  let nftValidatorContractId: any;
  let hemContractId: any;

  // Contract Parameters
  let tinybarPerCent: any;

  before(async function () {
    // Hedera Operator Client
    const operatorId = AccountId.fromString("0.0.2");
    const operatorKey = PrivateKey.fromString(
      "302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
    );
    const node = { "127.0.0.1:50211": new AccountId(3) };
    const client: typeof Client =
      Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    client.setOperator(operatorId, operatorKey);

    // Contract Deployment
    const defaultTinybarPerCents = 17523291;

    const { nftValidatorId, hemId } = await deploy(
      "localhost",
      operatorId.toString(),
      operatorKey.toString()
    );

    nftValidatorContractId = ContractId.fromString(nftValidatorId);
    hemContractId = ContractId.fromString(hemId);

    // Hem Account Setup
    admin = new HemAdmin(
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

    nftAdmin = new HemNFTAdmin(
      "localhost",
      hemContractId,
      nftAdminAccountId,
      nftAdminPrivateKey
    );

    alice = new Hem(
      "localhost",
      hemContractId,
      aliceAccountId,
      alicePrivateKey
    );

    bob = new Hem("localhost", hemContractId, bobAccountId, bobPrivateKey);

    // Set USD per HBAR
    tinybarPerCent = await getTinybarPerCent();
    await admin.setTinybarPerCent(tinybarPerCent);
  });

  beforeEach(async function () {
    // Hedera NFTs
    nftId = await nftAdmin.createNFT();
    await nftAdmin.mintMultipleNFTs(nftId, 10);

    // Associate NFT's with seller and buyer
    await alice.associateNFT(nftId);
    await bob.associateNFT(nftId);

    await nftAdmin.grantKyc(alice.accountId, nftId);
    await nftAdmin.grantKyc(bob.accountId, nftId);
    await nftAdmin.associateOffsets([nftId]);
    await nftAdmin.grantContractKyc(nftId);

    // Transfer NFT's to alice
    const serialNumbers: Array<number> = [1];
    await nftAdmin.transferNFTs(alice.accountId, nftId, serialNumbers);
  });

  describe("listing", async function () {
    let nfts: Array<string>;
    let serialNumbers: Array<number>;
    let prices: Array<number>;

    let aliceNFTBalance: number;
    let hemNFTBalance: number;
    let ownerOfNFT1: typeof AccountId;

    beforeEach(async function () {
      nfts = [nftId];
      serialNumbers = [1];
      prices = [5];

      aliceNFTBalance = await alice.getNftBalance(nftId);
      hemNFTBalance = await admin.getNftBalance(nftId);
      ownerOfNFT1 = await admin.getNftInfo(nftId, 1);
    });

    it("should succesfully whitelist and list an NFT on the Hem", async function () {
      expect(aliceNFTBalance).to.be.eq(1);
      expect(hemNFTBalance).to.be.eq(0);
      expect(ownerOfNFT1).to.be.eq(alice.accountId.toString());

      await admin.whitelistList(
        alice.accountId.toSolidityAddress(),
        nfts,
        serialNumbers,
        prices
      );
      await alice.list(nfts, serialNumbers, prices);

      // Check balances
      aliceNFTBalance = await alice.getNftBalance(nftId);
      hemNFTBalance = await admin.getNftBalance(nftId);
      ownerOfNFT1 = await admin.getNftInfo(nftId, 1);

      expect(aliceNFTBalance).to.be.eq(0);
      expect(hemNFTBalance).to.be.eq(1);
      expect(ownerOfNFT1).to.be.eq(hemContractId.toString());

      // Check listing table
      for (let i = 0; i < nfts.length; i++) {
        const listed = await admin.getOffset(nfts[i], serialNumbers[i]);

        expect(listed.seller).to.be.eq(alice.accountId.toString());
        expect(listed.price).to.be.eq(prices[i]);
      }
    });
  });

  describe("buying", async function () {
    let nfts: Array<string>;
    let serialNumbers: Array<number>;
    let prices: Array<number>;

    let ownerOfNFT1: typeof AccountId;

    beforeEach(async function () {
      nfts = [nftId];
      serialNumbers = [1];
      prices = [5];

      await admin.whitelistList(
        alice.accountId.toSolidityAddress(),
        nfts,
        serialNumbers,
        prices
      );
      await alice.list(nfts, serialNumbers, prices);

      await admin.whitelistPurchase(
        bob.accountId.toSolidityAddress(),
        nfts,
        serialNumbers,
        prices
      );
    });

    it("should succesfully purchase a listed assest from the Hem", async function () {
      const aliceHbarBalanceBefore = await alice.getHbarBalance();
      const bobHbarBalanceBefore = await bob.getHbarBalance();

      expect(await admin.getNftInfo(nftId, 1)).to.be.eq(
        hemContractId.toString()
      );

      await bob.purchase(nfts, serialNumbers, tinybarPerCent.mul(prices[0]));

      ownerOfNFT1 = await admin.getNftInfo(nftId, 1);

      const aliceHbarBalanceAfter = await alice.getHbarBalance();
      const bobHbarBalanceAfter = await bob.getHbarBalance();

      const aliceHbarBalanceExpectedHBAR = (
        parseFloat(
          Hbar.fromTinybars(tinybarPerCent * prices[0])
            .toBigNumber()
            .toString()
        ) + parseFloat(aliceHbarBalanceBefore.toBigNumber().toString())
      ).toFixed(8);

      const bobHbarBalanceExpectedHBAR = (
        parseFloat(bobHbarBalanceBefore.toBigNumber().toString()) -
        parseFloat(
          Hbar.fromTinybars(tinybarPerCent * prices[0])
            .toBigNumber()
            .toString()
        )
      ).toFixed(8);

      expect(parseFloat(aliceHbarBalanceAfter.toString())).to.be.eq(
        parseFloat(aliceHbarBalanceExpectedHBAR.toString())
      );
      expect(parseFloat(bobHbarBalanceAfter.toString())).to.be.lessThan(
        // checking lessThan to factor in the gas price
        parseFloat(bobHbarBalanceExpectedHBAR.toString())
      );
      expect(ownerOfNFT1).to.be.eq(bob.accountId.toString());

      // Check listing table
      for (let i = 0; i < nfts.length; i++) {
        const listed = await admin.getOffset(nfts[i], serialNumbers[i]);

        expect(listed.seller).to.be.eq("0.0.0");
        expect(listed.price).to.be.eq(0);
      }
    });
  });
});

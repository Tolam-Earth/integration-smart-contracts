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
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
const { getTinybarPerCent } = require("../utils/hem");

use(smock.matchers);

describe("Hem", function () {
  let hemAdmin: SignerWithAddress; // Hem microservice
  let alice: SignerWithAddress; // Seller
  let bob: SignerWithAddress; // Buyer

  let NftValidatorFake: ContractFactory;
  let nftValidatorFake: FakeContract;

  let Hem: ContractFactory;
  let hem: Contract;

  let defaultTinybarPerCents: number;

  before(async function () {
    [hemAdmin, alice, bob] = await ethers.getSigners();

    NftValidatorFake = await ethers.getContractFactory("NFTValidator");
    Hem = await ethers.getContractFactory("Hem");
    defaultTinybarPerCents = 1; // Defaulting to 1 Tinybar = 1 Cent for testing
  });

  beforeEach(async function () {
    nftValidatorFake = await smock.fake(NftValidatorFake);
    hem = await Hem.deploy(
      nftValidatorFake.address,
      defaultTinybarPerCents,
      true
    );
    await hem.deployed();
  });

  describe("USD to HBAR conversion", async function () {
    it("should allow the hem api account to set the usdToHbar conversion ration", async function () {
      const priceInTinybar = await getTinybarPerCent();
      await hem.setTinybarPerCent(priceInTinybar);

      const setPriceInTinybar = await hem.getTinybarPerCent();

      await expect(setPriceInTinybar).to.be.eq(priceInTinybar);
    });

    it("convert USD to HBAR", async function () {
      const priceUsd = BigNumber.from(5);

      const priceInTinybar = await getTinybarPerCent();
      await hem.setTinybarPerCent(priceInTinybar);

      const res = await hem.convertCentsToTinybar(priceUsd);

      await expect(res).to.be.eq(priceInTinybar.mul(priceUsd));
    });
  });

  describe("whitelistList", async function () {
    let nfts: Array<string>;
    let serialNumbers: Array<number>;
    let prices: Array<number>;

    before(async function () {
      // Fake NFT addresses for now;
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x8ff234f321989aaf9479c42a63b0b28e51a31a20",
      ];
      serialNumbers = [1, 2];
      prices = [5, 1];
    });

    it("should allow the hem api account to whitelist an account for listing", async function () {
      // Given
      nftValidatorFake.validate.returns(true);
      const whitelistAddress = alice.address;

      // When
      await hem
        .connect(hemAdmin)
        .whitelist_list(whitelistAddress, nfts, serialNumbers, prices);

      // Then
      const pendingHashes = await hem.getPendingListings(whitelistAddress);

      expect(pendingHashes[0]).to.be.eq(
        "0xfbac7971afef23474af89e32aa418410da0cd805f97d4d6907475cd4f19f1fbd"
      );
    });

    it("should not allow invalid nfts to be whitelisted for listing", async function () {
      // Given
      nftValidatorFake.validate.returns(false);
      const whitelistAddress = alice.address;

      // When
      const res = hem
        .connect(hemAdmin)
        .whitelist_list(whitelistAddress, nfts, serialNumbers, prices);

      // Then
      await expect(res).to.be.revertedWith("invalid nft");
    });
  });

  describe("list", async function () {
    let whitelistAddress: any;
    let nfts: Array<string>;
    let serialNumbers: Array<number>;
    let prices: Array<number> = [1, 1];

    before(async function () {
      // Fake NFT addresses for now;
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x8ff234f321989aaf9479c42a63b0b28e51a31a20",
      ];
      serialNumbers = [1, 2];
      prices = [1, 1];
      whitelistAddress = alice.address;
    });

    beforeEach(async function () {
      nftValidatorFake.validate.returns(true);

      await hem
        .connect(hemAdmin)
        .whitelist_list(whitelistAddress, nfts, serialNumbers, prices);
    });

    it("should allow sellers to list their offsets for sale at a minimum price", async function () {
      // Given
      nftValidatorFake.validate.returns(true);

      // When
      // TODO: Get mocks working to test this
      await hem
        .connect(alice)
        .list_offset(whitelistAddress, nfts, serialNumbers, prices);

      // Then
      const pendingHashes = await hem.getPendingListings(whitelistAddress);
      expect(pendingHashes.length).to.be.eq(0);

      for (let i: number = 0; i < nfts.length; i++) {
        const { seller, price } = await hem.getOffset(
          nfts[i],
          serialNumbers[i]
        );
        await expect(seller).to.be.eq(alice.address);
        await expect(price).eq(prices[i]);
      }
    });

    it("should not allow the seller to list an nft they are not whitelisted for", async function () {
      // Given
      nftValidatorFake.validate.returns(true);
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x8ff234f321989aaf9479c42a63b0b28e51a31a20",
      ];
      serialNumbers = [1, 3]; // changed `2` to `3`
      prices = [1, 1];
      whitelistAddress = alice.address;

      // When
      const res = hem
        .connect(alice)
        .list_offset(alice.address, nfts, serialNumbers, prices);

      // Then
      await expect(res).to.be.revertedWith("not whitelisted");
    });

    it("should not allow a seller to list invalid nft addresses", async function () {
      // Given
      nftValidatorFake.validate.returns(false);

      // When
      const res = hem
        .connect(alice)
        .list_offset(alice.address, nfts, serialNumbers, prices);

      // Then
      await expect(res).to.be.revertedWith("invalid nft");
    });
  });

  describe("whitelist_purchase", async function () {
    let nfts: Array<string>;
    let serialNumbers: Array<number>;

    beforeEach(async function () {
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x8ff234f321989aaf9479c42a63b0b28e51a31a20",
      ];
      serialNumbers = [1, 2];
    });

    it("should allow hem micro service to whitelist a token to be purchased", async function () {
      // Given
      nftValidatorFake.validate.returns(true);

      // When
      await hem
        .connect(bob)
        .whitelist_purchase(bob.address, nfts, serialNumbers);

      // Then
      const pendingHashes = await hem.getPendingPurchases(bob.address);

      expect(pendingHashes[0]).to.be.eq(
        "0x180653f679fd56ee345c672601bcb4e39a814ef8daec8e175aa151aeae608b04"
      );
    });

    it("should not allow hem micro service to whitelist a token with mismatched parameters", async function () {
      // Given
      nftValidatorFake.validate.returns(true);
      serialNumbers = [1];

      // When
      const res = hem
        .connect(bob)
        .whitelist_purchase(bob.address, nfts, serialNumbers);

      // Then
      await expect(res).to.be.revertedWith("nft length does not match");
    });

    it("should not allow hem micro service to whitelist an invalid token", async function () {
      // Given
      nftValidatorFake.validate.returns(false);

      // When
      const res = hem
        .connect(bob)
        .whitelist_purchase(bob.address, nfts, serialNumbers);

      // Then
      await expect(res).to.be.revertedWith("invalid nft");
    });
  });

  describe("purchase_offset", async function () {
    let nfts: Array<string>;
    let serialNumbers: Array<number>;
    let minPrice: number;

    before(async function () {
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x8ff234f321989aaf9479c42a63b0b28e51a31a20",
      ];
      serialNumbers = [1, 2];
      minPrice = 5;
    });

    beforeEach(async function () {
      nftValidatorFake.validate.returns(true);

      await hem
        .connect(hemAdmin)
        .whitelist_list(alice.address, nfts, serialNumbers, [
          minPrice,
          minPrice,
        ]);
      // TODO: Mock this
      await hem
        .connect(alice)
        .list_offset(alice.address, nfts, serialNumbers, [minPrice, minPrice]);

      await hem
        .connect(bob)
        .whitelist_purchase(bob.address, nfts, serialNumbers);
    });

    it("should allow a buyer to purchase an approved offset", async function () {
      // Given

      // When
      await hem.connect(bob).purchase_offset(bob.address, nfts, serialNumbers, {
        value: minPrice * serialNumbers.length,
      });

      // Then
      const pendingHashes = await hem.getPendingPurchases(bob.address);
      expect(pendingHashes.length).to.be.eq(0);

      for (let i: number = 0; i < nfts.length; i++) {
        const { seller, price } = await hem.getOffset(
          nfts[i],
          serialNumbers[i]
        );
        await expect(seller).to.be.eq(ethers.constants.AddressZero);
        await expect(price).eq(0);
      }
    });

    it("should not allow buyer to purchase an unapproved offset", async function () {
      // Given
      nfts = [
        "0x9b1c5d60b87402896542869b162039254f764140",
        "0x0000000000000000000000000000000000000000",
      ];
      serialNumbers = [1, 2];
      minPrice = 5;

      // When
      const res = hem
        .connect(bob)
        .purchase_offset(bob.address, nfts, serialNumbers, {
          value: minPrice * serialNumbers.length,
        });

      // Then
      await expect(res).to.be.revertedWith("not whitelisted");
    });

    it("should not allow buyer to purchase an offset without enough Hbar payment", async function () {
      // Given
      await hem
        .connect(bob)
        .whitelist_purchase(bob.address, nfts, serialNumbers);

      // When
      const res = hem
        .connect(bob)
        .purchase_offset(bob.address, nfts, serialNumbers, { value: 0 });

      // Then
      await expect(res).to.be.revertedWith("not enough funds to purchase");
    });
  });
});

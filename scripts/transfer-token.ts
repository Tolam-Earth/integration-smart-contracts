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
const { Hem } = require("../utils/hem");

const transferToken = async function () {
  const network = process.argv[2];
  const fromAccountId = process.argv[3];
  const fromPrivateKey = process.argv[4];
  const toAccountId = process.argv[5];
  const toPrivateKey = process.argv[6];
  const tokenId = process.argv[7];
  const serialNumberLowerBound = Number(process.argv[8]);
  const serialNumberUpperBound = Number(process.argv[9]);

  const sender = new Hem(network, "0.0.000000", fromAccountId, fromPrivateKey);

  const receiver = new Hem(network, "0.0.000000", toAccountId, toPrivateKey);

  // Associate NFTs
  await receiver.associateNFT(tokenId);

  // Transfer NFTs
  const serialNumbers = [];

  for (let i = serialNumberLowerBound; i <= serialNumberUpperBound; i++) {
    serialNumbers.push(i);
  }

  await sender.transferNFTs(toAccountId, tokenId, serialNumbers);
};

transferToken();

module.exports = {
  transferToken,
};

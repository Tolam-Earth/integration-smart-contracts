/*!
 * Copyright 2022 ESG Marketplace Inc, DBA Tolam Earth
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

const associateTokenToContract = async function () {
  const network = process.argv[2];
  const accountId = process.argv[3];
  const privateKey = process.argv[4];
  const nftId = process.argv[5];
  const hemContractId = process.argv[6];

  const user = new Hem(network, hemContractId, accountId, privateKey);
  const res = await user.associateOffsets([nftId]);

  console.log("The transaction consensus status " + res.status.toString());
};

associateTokenToContract();

module.exports = {
  associateTokenToContract,
};

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

const getOffset = async function () {
  const network = process.argv[2];
  const hemContractId = process.argv[3];
  const tokenId = process.argv[4];
  const serialNumber = process.argv[5];

  const adminAccountId = process.env.ADMIN_ACCOUNT_ID;
  const adminPrivateKeyId = process.env.ADMIN_PRIVATE_KEY;

  const admin = new Hem(
    network,
    hemContractId,
    adminAccountId,
    adminPrivateKeyId
  );

  const listed = await admin.getOffset(tokenId, serialNumber);

  console.log("seller: ", listed.seller);
  console.log("price: ", listed.price);
  console.log("hemApproved: ", listed.hemApproved);
  console.log("userApproved: ", listed.userApproved);
};

getOffset();

module.exports = {
  getOffset,
};

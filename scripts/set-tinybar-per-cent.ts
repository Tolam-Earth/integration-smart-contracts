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
const { HemAdmin } = require("../utils/hem");

const setTinybarPerCent = async function () {
  const hemContractId = process.argv[2];
  const mockExchangeRate = parseInt(process.argv[3]);

  console.log(`setTinybarPerCent(${hemContractId}, ${mockExchangeRate})\r\n`);

  const adminAccountId = process.env.ADMIN_ACCOUNT_ID;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

  const admin = new HemAdmin(
    "testnet",
    hemContractId,
    adminAccountId,
    adminPrivateKey
  );

  let tinybarPerCent;

  if (mockExchangeRate > 0) {
    tinybarPerCent = mockExchangeRate;
  } else {
    tinybarPerCent = await admin.getTinybarPerCent();
  }

  await admin.setTinybarPerCent(tinybarPerCent);

  console.log(
    "tinybarPerCent set to:",
    (await admin.getTinybarPerCent()).toString()
  );
};

setTinybarPerCent();

module.exports = {
  setTinybarPerCent,
};

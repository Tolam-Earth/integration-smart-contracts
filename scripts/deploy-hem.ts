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
const {
  Client,
  AccountId,
  PrivateKey,
  ContractFunctionParameters,
} = require("@hashgraph/sdk");
const { deployContract } = require("../utils/hem");

const hemContractJSON = require("../build/Hem.json");
const nftValidatorContractJSON = require("../build/NFTValidator.json");

const operatorId = AccountId.fromString(process.env.ADMIN_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.ADMIN_PRIVATE_KEY);

export async function deploy(network: string) {
  const defaultTinybarPerCents = 17523291;

  const client: typeof Client = Client.forNetwork(network);
  client.setOperator(operatorId, operatorKey);

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

  return {
    nftValidatorId: nftValidatorContractId.toString(),
    hemId: hemContractId.toString(),
  };
}

//SPDX-License-Identifier: Apache-2.0
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
pragma solidity ^0.8.0;

import "./NFTValidator.sol";
import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Hem is HederaTokenService {
    using SafeMath for uint256;
    using Strings for string;

    bool private mock = false;

    NFTValidator private nftValidator;

    struct Offset {
        address seller;
        uint256 price;
    }

    mapping(address => bytes32[]) private pendingListing;
    mapping(address => bytes32[]) private pendingPurchase;

    struct PurchaseWhitelist {
        address buyer;
        uint256 price;
        bool hemApproved;
    }

    uint256 private tinybarPerCents;

    mapping(address => mapping(int64 => Offset)) private offsets;

    /**
     * @dev Constructor
     */
    constructor(
        address _nftValidator,
        uint256 _tinyberPerCents,
        bool isMock
    ) {
        nftValidator = NFTValidator(_nftValidator);
        setTinybarPerCent(_tinyberPerCents);
        mock = isMock;
    }

    /**
     * @dev Sets the tinybar per 1 cent ratio
     *
     * Requirements:
     *
     * - `_tinybarPerCent`: must be vaild Cent amount in units of Tinybar.
     *
     */
    function setTinybarPerCent(uint256 _tinybarPerCent) public {
        tinybarPerCents = _tinybarPerCent;
    }

    /**
     * @dev Returns the tinybar per 1 cent ratio
     *
     */
    function getTinybarPerCent() external view returns (uint256) {
        return tinybarPerCents;
    }

    /**
     * @dev Tests USD to HBAR conversion rate
     *
     */
    function convertCentsToTinybar(uint256 priceCents)
        external
        view
        returns (uint256)
    {
        return priceCents.mul(tinybarPerCents);
    }

    /**
     * @dev Removes a users pending listing or purchase
     *
     * - `user`: user to remove pending listing from.
     * - `index`: index pending listing is located.
     */
    function removePending(
        mapping(address => bytes32[]) storage pending,
        address user,
        uint256 index
    ) internal {
        pending[user][index] = pending[user][pending[user].length - 1];
        pending[user].pop();
    }

    function constructListingString(
        string memory listing,
        address tokenIdAddress,
        int64 serialNumberInt64,
        uint256 priceUint256
    ) internal pure returns (string memory) {
        string memory tokenId = Strings.toHexString(
            uint256(uint160(tokenIdAddress)),
            20
        );
        string memory serialNum = Strings.toString(
            uint256(uint64(serialNumberInt64))
        );
        string memory price = Strings.toString(priceUint256);

        listing = string(abi.encodePacked(listing, tokenId));
        listing = string(abi.encodePacked(listing, ","));
        listing = string(abi.encodePacked(listing, serialNum));
        listing = string(abi.encodePacked(listing, ","));
        listing = string(abi.encodePacked(listing, price));
        listing = string(abi.encodePacked(listing, ","));

        return listing;
    }

    function constructPurchaseString(
        string memory purchase,
        address tokenIdAddress,
        int64 serialNumberInt64
    ) internal pure returns (string memory) {
        string memory tokenId = Strings.toHexString(
            uint256(uint160(tokenIdAddress)),
            20
        );
        string memory serialNum = Strings.toString(
            uint256(uint64(serialNumberInt64))
        );

        purchase = string(abi.encodePacked(purchase, tokenId));
        purchase = string(abi.encodePacked(purchase, ","));
        purchase = string(abi.encodePacked(purchase, serialNum));
        purchase = string(abi.encodePacked(purchase, ","));

        return purchase;
    }

    /**
     * @dev Whitelist an account and nft for listing
     *
     * Requirements:
     *
     * - `account_id`: (seller) must be a valid address.
     * - `token_ids`: (nfts) must contain a valid nft address.
     * - `serial_numbers`: must be an existing token serial number.
     *
     */
    function whitelist_list(
        address account_id,
        address[] memory token_ids,
        int64[] memory serial_numbers,
        uint256[] memory prices
    ) external {
        // txn_id is unused
        require(
            token_ids.length == serial_numbers.length &&
                serial_numbers.length == prices.length,
            "nft length does not match"
        );

        string memory listingString = "";

        for (uint256 i = 0; i < token_ids.length; i++) {
            require(nftValidator.validate(token_ids[i]), "invalid nft");

            listingString = constructListingString(
                listingString,
                token_ids[i],
                serial_numbers[i],
                prices[i]
            );
        }

        bytes32 pendingHash = keccak256(bytes(listingString));

        pendingListing[account_id].push(pendingHash);
    }

    /**
     * @dev Returns pending listing hashes for a given user
     *
     * Requirements:
     *
     * - `accountId` is a valid HEM user
     */
    function getPendingListings(address user)
        public
        view
        returns (bytes32[] memory hashes)
    {
        hashes = pendingListing[user];
    }

    /**
     * @dev Returns pending purchase hashes for a given user
     *
     * Requirements:
     *
     * - `accountId` is a valid HEM user
     */
    function getPendingPurchases(address user)
        public
        view
        returns (bytes32[] memory hashes)
    {
        hashes = pendingPurchase[user];
    }

    /**
     * @dev Lists multiple offsets for sale at a minimum price.
     *
     * Requirements:
     *
     * - `account_id`: seller account.
     * - `token_ids`: must contain a valid address.
     * - `serial_numbers`  must be an existing token serial number.
     * - `minPrice` must be greater than zero.
     *
     */
    function list_offset(
        address account_id,
        address[] memory token_ids,
        int64[] memory serial_numbers,
        uint256[] memory prices
    ) external {
        // account_id is unused
        bool isApproved = false;

        require(
            token_ids.length == serial_numbers.length &&
                serial_numbers.length == prices.length,
            "nft length does not match"
        );

        string memory listingString = "";

        for (uint256 i = 0; i < token_ids.length; i++) {
            require(prices[i] > 0, "invalid price");
            require(nftValidator.validate(token_ids[i]), "invalid nft");

            listingString = constructListingString(
                listingString,
                token_ids[i],
                serial_numbers[i],
                prices[i]
            );
        }

        bytes32 pendingHash = keccak256(bytes(listingString));

        for (uint256 i = 0; i < pendingListing[msg.sender].length; i++) {
            if (pendingListing[msg.sender][i] == pendingHash) {
                isApproved = true;
                removePending(pendingListing, msg.sender, i);
            }
        }

        require(isApproved, "not whitelisted");

        if (isApproved) {
            for (uint256 i = 0; i < token_ids.length; i++) {
                offsets[token_ids[i]][serial_numbers[i]].seller = account_id;
                offsets[token_ids[i]][serial_numbers[i]].price = prices[i];

                if (!mock) {
                    _associateToken(address(this), token_ids[i]);

                    transferOffset(
                        token_ids[i],
                        msg.sender,
                        address(this),
                        serial_numbers[i]
                    );
                }
            }
        }
    }

    /**
     * @dev Whitelist an account and nft for purchasing
     *
     * Requirements:
     *
     * - `account_id`: (seller) must be a valid address.
     * - `token_ids`: (nfts) must contain a valid nft address.
     * - `serial_numbers`: must be an existing token serial number.
     *
     */
    function whitelist_purchase(
        address account_id,
        address[] memory token_ids,
        int64[] memory serial_numbers
    ) external {
        require(
            token_ids.length == serial_numbers.length,
            "nft length does not match"
        );

        string memory purchaseString = "";

        for (uint256 i = 0; i < token_ids.length; i++) {
            require(nftValidator.validate(token_ids[i]), "invalid nft");

            purchaseString = constructPurchaseString(
                purchaseString,
                token_ids[i],
                serial_numbers[i]
            );
        }

        bytes32 pendingHash = keccak256(bytes(purchaseString));

        pendingPurchase[account_id].push(pendingHash);
    }

    /**
     * @dev Purchase multiple offsets at a minimum price.
     *
     * Requirements:
     *
     * - `account_id` buyer address.
     * - `nfts` must contain a valid address.
     * - `serial` must be a valid nft address.
     * - `minPrice` must be greater than the minimum price.
     *
     */
    function purchase_offset(
        address account_id,
        address[] memory token_ids,
        int64[] memory serial_numbers
    ) external payable {
        // `account_id` is unused infavor of `msg.sender`
        bool isApproved = false;

        require(
            token_ids.length == serial_numbers.length,
            "nft length does not match"
        );

        string memory purchaseString = "";

        // Construct purchase whitelist hash
        for (uint256 i = 0; i < token_ids.length; i++) {
            require(nftValidator.validate(token_ids[i]), "invalid nft");

            purchaseString = constructPurchaseString(
                purchaseString,
                token_ids[i],
                serial_numbers[i]
            );
        }

        bytes32 pendingHash = keccak256(bytes(purchaseString));

        // Validate hash
        for (uint256 i = 0; i < pendingPurchase[msg.sender].length; i++) {
            if (pendingPurchase[msg.sender][i] == pendingHash) {
                isApproved = true;
                removePending(pendingPurchase, msg.sender, i);
            }
        }

        require(isApproved, "not whitelisted");

        // Complete trade
        uint256 totalPayment = 0;

        for (uint256 i = 0; i < token_ids.length; i++) {
            uint256 expectedPrice = offsets[token_ids[i]][serial_numbers[i]]
                .price
                .mul(tinybarPerCents);

            totalPayment += expectedPrice;

            address payable seller = payable(
                offsets[token_ids[i]][serial_numbers[i]].seller
            );

            delete offsets[token_ids[i]][serial_numbers[i]];

            // Transfer Offset to buyer
            if (!mock) {
                // Transfer HBar to Seller
                _associateToken(msg.sender, token_ids[i]);

                transferOffset(
                    token_ids[i],
                    address(this),
                    msg.sender,
                    serial_numbers[i]
                );
                (bool success, bytes memory data) = seller.call{
                    value: expectedPrice
                }("");
            }
        }

        require(totalPayment <= msg.value, "not enough funds to purchase");
    }

    /**
     * @dev Returns ask details.
     */
    function getOffset(address tokenAddress, int64 serial)
        public
        view
        returns (address seller, uint256 price)
    {
        seller = (offsets[tokenAddress][serial].seller != address(0))
            ? offsets[tokenAddress][serial].seller
            : address(0);
        price = (offsets[tokenAddress][serial].price > 0)
            ? offsets[tokenAddress][serial].price
            : 0;
    }

    /**
     * @dev Associates multiple token ids with this smart contract.
     *
     * Requirements:
     *
     * - `tokenIds` must contain a valid nft address.
     *
     */
    function associateOffsets(address[] memory tokenIds) external {
        HederaTokenService.associateTokens(address(this), tokenIds);
    }

    function _associateToken(address account, address tokenId)
        internal
        returns (int256)
    {
        int256 associateTokenResponseCode = HederaTokenService.associateToken(
            account,
            tokenId
        );

        if (
            associateTokenResponseCode ==
            HederaResponseCodes.CONTRACT_REVERT_EXECUTED
        ) {
            revert(
                string(
                    abi.encodePacked(
                        "Failed to associate token with response: ",
                        Strings.toString(uint256(associateTokenResponseCode))
                    )
                )
            );
        }

        return associateTokenResponseCode;
    }

    /**
     * @dev Sends NFT to buyer
     *
     * Requirements:
     *
     * - `nft` must be a valid address.
     * - `receiver` - msg sender.
     * - `serial` must be an existing token serial number.
     *
     */
    function transferOffset(
        address nft,
        address sender,
        address receiver,
        int64 serialNumber
    ) internal returns (bool) {
        int256 transferNftResponseCode = HederaTokenService.transferNFT(
            nft,
            sender,
            receiver,
            serialNumber
        );

        if (transferNftResponseCode != HederaResponseCodes.SUCCESS) {
            revert(
                string(
                    abi.encodePacked(
                        "Failed to transfer token with reponse: ",
                        Strings.toString(uint256(transferNftResponseCode))
                    )
                )
            );
        }

        return true;
    }
}

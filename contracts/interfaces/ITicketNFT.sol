// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface ITicketNFT {
    function mintFromMarketPlace(address to, uint256 nftId) external;
}
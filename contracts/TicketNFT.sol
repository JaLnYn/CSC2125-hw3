// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ITicketNFT} from "./interfaces/ITicketNFT.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract TicketNFT is ERC1155, ITicketNFT {
    address public ticket_owner;

    // your code goes here (you can do it!)
    constructor(address marketplaceAddr) ERC1155("{id}") {
        ticket_owner = marketplaceAddr;
    }

    function owner() external view returns (address) {
        return ticket_owner;
    }

    function mintFromMarketPlace(address to, uint256 nftId) external override {
        _mint(to, nftId, 1, "");
    }
}

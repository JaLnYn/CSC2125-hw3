// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol"; 
import "hardhat/console.sol";

interface ITicketMarketplace {
    event EventCreated(uint128 eventId, uint128 maxTickets, uint256 pricePerTicket, uint256 pricePerTicketERC20);
    event PriceUpdate(uint128 eventId, uint256 newPrice, string priceType);
    event MaxTicketsUpdate(uint128 eventId, uint128 newMaxTickets);
    event TicketsBought(uint128 eventId, uint128 numberOfTickets, string boughtWith);
    event ERC20AddressUpdate(address newERC20Address);


    function createEvent(uint128 maxTickets, uint256 pricePerTicket, uint256 pricePerTicketERC20) external;

    function setMaxTicketsForEvent(uint128 eventId, uint128 newMaxTickets) external;

    function setPriceForTicketETH(uint128 eventId, uint256 price) external;

    function setPriceForTicketERC20(uint128 eventId, uint256 price) external;

    function buyTickets(uint128 eventId, uint128 ticketCount) payable external;

    function buyTicketsERC20(uint128 eventId, uint128 ticketCount) external;

    function setERC20Address(address newERC20Address) external;
}
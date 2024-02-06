import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SampleCoin, TicketMarketplace } from "../typechain-types";

describe("TicketMarketplace", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMarketplaceERC20() {
    // Contracts are deployed using the first signer/account by default
    const [owner, notOwner] = await ethers.getSigners();
    const SampleCoin = await ethers.getContractFactory("SampleCoin");
    const sampleCoin: SampleCoin = await SampleCoin.deploy();

    const TicketMarketplace = await ethers.getContractFactory("TicketMarketplace");
    const ticketMarketplace: TicketMarketplace = await TicketMarketplace.deploy(
      await sampleCoin.getAddress()
    );
    
    const ticketNFT = await ethers.getContractAt("TicketNFT", await ticketMarketplace.nftContract());
    return {owner, ticketMarketplace, sampleCoin, ticketNFT, notOwner} 
  }

  async function marketplaceWithEvents() {
    const {owner, ticketMarketplace, sampleCoin, ticketNFT, notOwner} = await deployMarketplaceERC20();
    await ticketMarketplace.createEvent(1e5, 1e5 + 1, 1e5 + 2);
    await ticketMarketplace.createEvent(1e5, 1e5 + 1, 1e5 + 2);
    // allow contract to spend some of your ERC20 tokens (1 * 10**18 to be precise)
    await sampleCoin.connect(owner).approve(await ticketMarketplace.getAddress(), ethers.parseUnits("1", 18));
    await sampleCoin.connect(owner).transfer(await notOwner.getAddress(), ethers.parseUnits("1", 18));
    await sampleCoin.connect(notOwner).approve(await ticketMarketplace.getAddress(), ethers.parseUnits("1", 18)); 
    
    return {owner, ticketMarketplace, sampleCoin, ticketNFT, notOwner};
  }

  describe("Deployment", function () {
    it("Should set the nftContract address", async function () {
      const {ticketNFT, ticketMarketplace} = await loadFixture(deployMarketplaceERC20);
      expect(await ticketMarketplace.nftContract()).to.be.eq(await ticketNFT.getAddress());
    });

    it("Should set the ERC20Address address", async function () {
      const {sampleCoin, ticketMarketplace} = await loadFixture(deployMarketplaceERC20);
      expect(await ticketMarketplace.ERC20Address()).to.be.eq(await sampleCoin.getAddress());
    });

    it("Should correctly set the owner of the marketplace", async function () {
      const {owner, ticketMarketplace} = await loadFixture(deployMarketplaceERC20);
      expect(await ticketMarketplace.owner()).to.equal(owner.address);
    });

    it("Should correctly set the owner of the NFT contract", async function () {
      const {ticketMarketplace, ticketNFT} = await loadFixture(deployMarketplaceERC20);
      expect(await ticketNFT.owner()).to.equal(await ticketMarketplace.getAddress());
    });

    it("Should mint ERC20 tokens to the owner of the coin contract", async function () {
      const {owner, sampleCoin} = await loadFixture(deployMarketplaceERC20);
      expect(await sampleCoin.balanceOf(owner)).to.be.eq(ethers.parseUnits("100", 18));
    });

    it("Should set initial event id to 0", async function () {
      const {ticketMarketplace} = await loadFixture(deployMarketplaceERC20);
      expect(await ticketMarketplace.currentEventId()).to.be.eq(0);
    });
  });

  describe("createNewEvent", function () {
    it("Should revert when not called by owner", async function () {
      const { ticketMarketplace, notOwner } = await loadFixture(deployMarketplaceERC20);
      await expect(ticketMarketplace.connect(notOwner).createEvent(1e5, 1e5, 1e5)).to.be.revertedWith(
        "Unauthorized access"
      );
    });

    it("Should create a new event", async function () {
      const { ticketMarketplace } = await loadFixture(deployMarketplaceERC20);
      await ticketMarketplace.createEvent(1e5, 1e5 + 1, 1e5 + 2);
      const {
        nextTicketToSell,
        maxTickets,
        pricePerTicket,
        pricePerTicketERC20
      } = await ticketMarketplace.events(0);
      const event = {
        nextTicketToSell,
        maxTickets,
        pricePerTicket,
        pricePerTicketERC20
      };
      expect(event).to.eql({
        nextTicketToSell: 0n,
        maxTickets: 100000n,
        pricePerTicket: 100001n,
        pricePerTicketERC20: 100002n
      });
    });

    
    it("Should update the next eventId", async function () {
      const { ticketMarketplace } = await loadFixture(deployMarketplaceERC20);
      const oldEventId = await ticketMarketplace.currentEventId();
      await ticketMarketplace.createEvent(1e5, 1e5 + 1, 1e5 + 2);
      const newEventId = await ticketMarketplace.currentEventId();
      expect(oldEventId).to.eq(newEventId - 1n);
    });
  });

  describe("setMaxTicketsForEvent", function () {
    it("Should revert when not called by owner", async function () {
      const { ticketMarketplace, notOwner } = await loadFixture(marketplaceWithEvents);
      await expect(ticketMarketplace.connect(notOwner).setMaxTicketsForEvent(0, 1e10)).to.be.revertedWith(
        "Unauthorized access"
      );
    });
  
    it("Should revert when the new maxTickets value is smaller than the one that is already present", async function () {
      const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);
      const { maxTickets } = await ticketMarketplace.events(0);
      await expect(ticketMarketplace.setMaxTicketsForEvent(0, maxTickets - 1n)).to.be.revertedWith(
        "The new number of max tickets is too small!"
      );
    });
    
    it("Should update the max tickets in case the admin adds more tickets in the system", async function () {
      const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);
      const { maxTickets } = await ticketMarketplace.events(0);
      await ticketMarketplace.setMaxTicketsForEvent(0, maxTickets + 1n);
      const newMaxTickets = (await ticketMarketplace.events(0)).maxTickets;
      await expect(newMaxTickets).to.be.eq(maxTickets + 1n);
    })
  });


  describe("Price setters", function () {
    describe("setPriceForTicketETH", function () {
      it("Should revert when not called by owner", async function () {
        const { ticketMarketplace, notOwner } = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.connect(notOwner).setPriceForTicketETH(0, 1e10)).to.be.revertedWith(
          "Unauthorized access"
        );
      });
  
      it("Should update the price", async function () {
        const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.setPriceForTicketETH(0, 1e10);
        const newPrice = (await ticketMarketplace.events(0)).pricePerTicket;
        await expect(newPrice).to.be.eq(1e10);
      });
    })
  
  
    describe("setPriceForTicketERC20", function () {
      it("Should revert when not called by owner", async function () {
        const { ticketMarketplace, notOwner } = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.connect(notOwner).setPriceForTicketERC20(0, 1e10)).to.be.revertedWith(
          "Unauthorized access"
        );
      });
  
      it("Should update the price", async function () {
        const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.setPriceForTicketERC20(0, 1e10);
        const newPrice = (await ticketMarketplace.events(0)).pricePerTicketERC20;
        await expect(newPrice).to.be.eq(1e10);
      });
    })
  })

  describe("setERC20Address", function () {
    it("Should revert when not called by owner", async function () {
      const { ticketMarketplace, notOwner } = await loadFixture(deployMarketplaceERC20);
      await expect(ticketMarketplace.connect(notOwner).setERC20Address("0x0000000000000000000000000000000000000001")).to.be.revertedWith(
        "Unauthorized access"
      );
    })

    it("Should set an updated ERC20 address", async function() {
      const { ticketMarketplace } = await loadFixture(deployMarketplaceERC20);
      const oldERC20Address = await ticketMarketplace.ERC20Address();
      await ticketMarketplace.setERC20Address("0x0000000000000000000000000000000000000001");
      const newERC20Address = await ticketMarketplace.ERC20Address();
      expect(newERC20Address).not.to.be.eq(oldERC20Address);
      expect(newERC20Address).to.be.eq("0x0000000000000000000000000000000000000001");
    })
  })

  describe("Ticket buying methods", function () {
    describe("buyTickets", function () {
      it("Should NOT revert on a non-admin call", async function () {
        const { ticketMarketplace, notOwner } = await loadFixture(marketplaceWithEvents);
        await expect(
          ticketMarketplace.connect(notOwner).buyTickets(
            0, 
            1, 
            {value: ethers.parseEther("1")}
          )
        ).not.to.be.reverted;
      })
  
      it("Should revert on overflow", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.setPriceForTicketETH(0, ethers.parseUnits("1", 75)); // 10 ** 75
        await expect(ticketMarketplace.buyTickets(0, ethers.parseUnits("1", 10))).to.be.revertedWith(
          "Overflow happened while calculating the total price of tickets. Try buying smaller number of tickets."
        );
      })

      it("Should revert when not enough funds supplied", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.buyTickets(0, 1, {value: 1})).to.be.revertedWith(
          "Not enough funds supplied to buy the specified number of tickets."
        );
      })

      it("Should revert when trying to buy too many tickets", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.buyTickets(0, 1e6, {value: ethers.parseEther("1000")})).to.be.revertedWith(
          "We don't have that many tickets left to sell!"
        );
      })

      it("Should mint NFTs to user's account when all conditions are satisfied", async function() {
        const {owner, ticketMarketplace, ticketNFT} = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.buyTickets(1, 3, {value: ethers.parseEther("10")});

        const array = [];
        for (let i = 0; i < 32; i++) {
          array.push(0);
        }
        array[15] = 1;
        const nftIdEventPart = ethers.toBigInt(Uint8Array.from(array));
        
        let nftIds = [nftIdEventPart + 0n, nftIdEventPart + 1n, nftIdEventPart + 2n];
        for (const nftId of nftIds) {
          const ticketBalance = await ticketNFT.balanceOf(owner.address, nftId);
          expect(ticketBalance).to.be.eq(1);
        }

        await ticketMarketplace.buyTickets(1, 3, {value: ethers.parseEther("10")});
        
        nftIds = [nftIdEventPart + 3n, nftIdEventPart + 4n, nftIdEventPart + 5n];
        for (const nftId of nftIds) {
          const ticketBalance = await ticketNFT.balanceOf(owner.address, nftId);
          expect(ticketBalance).to.be.eq(1);
        }
      });

    })
  
    describe("buyTicketsERC20", function () { 
      it("Should NOT revert on a non-admin call", async function () {
        const { ticketMarketplace, notOwner } = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.connect(notOwner).buyTicketsERC20(0, 1)).not.to.be.reverted;
      })
  
      it("Should revert on overflow", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.setPriceForTicketERC20(0, ethers.parseUnits("1", 75)); // 10 ** 75
        await expect(ticketMarketplace.buyTicketsERC20(0, ethers.parseUnits("1", 10))).to.be.revertedWith(
          "Overflow happened while calculating the total price of tickets. Try buying smaller number of tickets."
        );
      })

      it("Should revert when not enough funds is on the account", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.setPriceForTicketERC20(0, ethers.parseUnits("1", 75)); // 10 ** 75
        await expect(ticketMarketplace.buyTicketsERC20(0, 1)).to.be.reverted;
      })

      it("Should revert when trying to buy too many tickets", async function() {
        const {ticketMarketplace} = await loadFixture(marketplaceWithEvents);
        await expect(ticketMarketplace.buyTicketsERC20(0, 1e6)).to.be.revertedWith(
          "We don't have that many tickets left to sell!"
        );
      })

      it("Should mint NFTs to user's account when all conditions are satisfied", async function() {
        const {owner, ticketMarketplace, ticketNFT} = await loadFixture(marketplaceWithEvents);
        await ticketMarketplace.buyTicketsERC20(1, 3);
        const array = [];
        for (let i = 0; i < 32; i++) {
          array.push(0);
        }
        array[15] = 1;
        const nftIdEventPart = ethers.toBigInt(Uint8Array.from(array));
        
        let nftIds = [nftIdEventPart + 0n, nftIdEventPart + 1n, nftIdEventPart + 2n];
        // console.log(nftIds);
        for (const nftId of nftIds) {
          // console.log(nftId)
          const ticketBalance = await ticketNFT.balanceOf(owner.address, nftId);
          expect(ticketBalance).to.be.eq(1);
        }

        await ticketMarketplace.buyTicketsERC20(1, 3);
        
        nftIds = [nftIdEventPart + 3n, nftIdEventPart + 4n, nftIdEventPart + 5n];
        for (const nftId of nftIds) {
          const ticketBalance = await ticketNFT.balanceOf(owner.address, nftId);
          expect(ticketBalance).to.be.eq(1);
        }
      })
    })
  })

  


    describe("Events", function () {
      it("Should emit an event after calling createEvent", async function () {
        const { ticketMarketplace } = await loadFixture(deployMarketplaceERC20);

        await expect(ticketMarketplace.createEvent(1e5, 1e5 + 1, 1e5 + 2))
          .to.emit(ticketMarketplace, "EventCreated")
          .withArgs(0, 1e5, 1e5 + 1, 1e5 + 2); 
      });

      it("Should emit an event after calling setPriceForTicketERC20 and setPriceForTicketETH", async function () {
        const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);

        await expect(ticketMarketplace.setPriceForTicketERC20(0, 1e10))
          .to.emit(ticketMarketplace, "PriceUpdate")
          .withArgs(0, 1e10, "ERC20");
          
        await expect(ticketMarketplace.setPriceForTicketETH(0, 1e10))
          .to.emit(ticketMarketplace, "PriceUpdate")
          .withArgs(0, 1e10, "ETH");
      });

      it("Should emit an event after calling setMaxTicketsForEvent", async function () {
        const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);

        await expect(ticketMarketplace.setMaxTicketsForEvent(0, 1e10))
          .to.emit(ticketMarketplace, "MaxTicketsUpdate")
          .withArgs(0, 1e10); 
      });


      it("Should emit an event after buying tickets", async function () {
        const { ticketMarketplace, owner } = await loadFixture(marketplaceWithEvents);

        await expect(ticketMarketplace.connect(owner).buyTickets(0, 1, {value: ethers.parseEther("10")}))
          .to.emit(ticketMarketplace, "TicketsBought")
          .withArgs(0, 1, "ETH"); 

        await expect(ticketMarketplace.connect(owner).buyTicketsERC20(0, 1))
          .to.emit(ticketMarketplace, "TicketsBought")
          .withArgs(0, 1, "ERC20"); 
      });

      it("Should emit an event after changing ERC20 address", async function () {
        const { ticketMarketplace } = await loadFixture(marketplaceWithEvents);

        await expect(ticketMarketplace.setERC20Address("0x0000000000000000000000000000000000000001"))
          .to.emit(ticketMarketplace, "ERC20AddressUpdate")
          .withArgs("0x0000000000000000000000000000000000000001");  
      });
    });

    describe("Transfers", function () {
      it("Should transfer ETH to the contract after calling buyTickets", async function () {
        const { owner, ticketMarketplace } = await loadFixture(marketplaceWithEvents);

        await expect(ticketMarketplace.buyTickets(0, 1, {value: ethers.parseEther("10")})).to.changeEtherBalances(
          [owner, ticketMarketplace],
          [-ethers.parseEther("10"), ethers.parseEther("10")]
        );
      });

      it("Should transfer ERC20 tokens to the contract after calling buyTicketsERC20", async function () {
        const { notOwner, ticketMarketplace, sampleCoin } = await loadFixture(marketplaceWithEvents);

        await ticketMarketplace.connect(notOwner).buyTicketsERC20(0, 1);
        const balanceContract = await sampleCoin.balanceOf(await ticketMarketplace.getAddress());
        const balanceNotOwner = await sampleCoin.balanceOf(await notOwner.getAddress());
        
        expect(balanceNotOwner).to.be.eq(ethers.parseUnits("1", 18) - 100002n);
        expect(balanceContract).to.be.eq(100002n);
      })
    });
});

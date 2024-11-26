require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load environment variables
const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// In-memory claim history (use a database in production)
const claimHistory = {};
const claimCooldown = 3600 * 1000; // 1 hour in milliseconds

// Faucet endpoint
app.post("/faucet", async (req, res) => {
    const { address } = req.body;

    if (!ethers.utils.isAddress(address)) {
        return res.status(400).send("Invalid wallet address.");
    }

    const now = Date.now();

    // Check cooldown
    if (claimHistory[address] && now - claimHistory[address] < claimCooldown) {
        const remainingTime = Math.ceil((claimCooldown - (now - claimHistory[address])) / 1000);
        return res.status(429).send(`Please wait ${remainingTime} seconds before claiming again.`);
    }

    try {
        // Send transaction
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther("1.0"), // 1 ETH
        });

        // Update claim history
        claimHistory[address] = now;

        res.status(200).send({
            message: "Transaction sent!",
            txHash: tx.hash,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Transaction failed.");
    }
});

// Start server
app.listen(port, () => {
    console.log(`Faucet backend is running at http://localhost:${port}`);
});

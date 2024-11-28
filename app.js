const web3 = require("@solana/web3.js");
const RAYDIUM_ADDRESS = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";
const fs = require('fs');
require('dotenv').config();

const getTransactionsForAddress = async function() {
    const provider = new web3.Connection(`${process.env.MAINNET}`);

    const newPublicKey = new web3.PublicKey(RAYDIUM_ADDRESS);
    // Fetch the list of transaction signatures for the address
    const signatures = await provider.getSignaturesForAddress(newPublicKey, {limit: 20});

  
    console.log(`Found ${signatures.length} transactions`);

    const interactingWallets = new Set(); // Use a Set to avoid duplicate addresses

    // Fetch transaction details for each signature
    for (const signatureInfo of signatures) {
      const transaction = await provider.getTransaction(
        signatureInfo.signature,
        { maxSupportedTransactionVersion: 0 }
      );

      if (transaction) {
        // Extract all account keys involved in the transaction
        transaction.transaction.message.staticAccountKeys.forEach(async (accountKey) => {
          if (accountKey.toString() !== RAYDIUM_ADDRESS) {
            const accountInfo = await provider.getAccountInfo(accountKey);
            if (accountInfo && !accountInfo.executable) {
                interactingWallets.add(accountKey.toString()); // Add only non-program accounts
              }
          }
        });
        // console.log(transaction.transaction.message.staticAccountKeys)
      }
    }

    console.log(`Found ${interactingWallets.size} unique interacting wallets:`);
    console.log(Array.from(interactingWallets));
    // Convert the Set to an array and then to an object { index: walletAddress }
    const walletsObject = Array.from(interactingWallets).reduce((acc, wallet, index) => {
        acc[index] = wallet;
        return acc
    }, {});
    // const walletsObject = Object.fromEntries(
    //     walletsArray.map((wallet, index) => [index, wallet])
    // );

    console.log(walletsObject);

    // Write the object to a JSON file in the root directory
    fs.writeFileSync("interactingWallets4.json", JSON.stringify(walletsObject, null, 2));
    console.log("Wallets written to interactingWallets.json");
}







getTransactionsForAddress().catch((error)=>{
    console.error(error)
    process.exit(1)
})
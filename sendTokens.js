const {
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} = require("@solana/web3.js");
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const quicknodeEndpoint =`${process.env.MAINNET}`;
const connection = new Connection(quicknodeEndpoint, "confirmed");

// Replace this with your token's mint address
const mintAddress = new PublicKey(
  "DBRMDdGWKi83tpAKyjctSQESY7VGcFxGm3bjRQRBfC1J"
);
const recipients = require("./interactingWallets.json");

// Load the keypair file and convert it into Uint8Array
const keypairFile = require(path.resolve(
  process.env.HOME,
  ".config/solana/id.json"
));
const localKeypair = Keypair.fromSecretKey(new Uint8Array(keypairFile));

// File to store successful transactions
const successLogFile = path.resolve(__dirname, "successfulTransfers0.json");

const sendTokens = async function () {
  const successfulTransfers = []; // Correctly named and initialized

  for (const [key, recipientAddress] of Object.entries(recipients)) {
    try {
      const recipientPublicKey = new PublicKey(recipientAddress);

      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        localKeypair,
        mintAddress,
        recipientPublicKey
      );

      // Specify the amount to send (no decimals)
      const amount = 1; // Adjust amount as needed

      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        localKeypair,
        mintAddress,
        localKeypair.publicKey
      );

      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address, // Sender token account
        recipientTokenAccount.address, // Recipient token account
        localKeypair.publicKey, // Sender
        amount,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create a TransactionMessage for versioned transactions
      const message = new TransactionMessage({
        payerKey: localKeypair.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      // Create a VersionedTransaction
      const versionedTransaction = new VersionedTransaction(message);

      // Sign the transaction
      versionedTransaction.sign([localKeypair]);

      // Send the transaction
      const transactionSignature = await connection.sendTransaction(
        versionedTransaction
      );

      console.log(`Successfully sent ${amount} tokens to ${recipientAddress}`);
      console.log(`Transaction Signature: ${transactionSignature}`);

      // Log the success
      successfulTransfers.push({
        recipient: recipientAddress,
        signature: transactionSignature,
        amount,
      });
    } catch (error) {
      console.error(
        `Failed to send tokens to ${recipientAddress}:`,
        error.message
      );
      console.error("Skipping to the next address...");
    }
  }

  // Write successful transfers to the log file
  try {
    await fs.writeFile(successLogFile, JSON.stringify(successfulTransfers, null, 2));
    console.log(`Logged successful transfers to ${successLogFile}`);
  } catch (error) {
    console.error("Error writing to log file:", error.message);
  }
};

sendTokens();
import { Connection, Keypair } from  "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, setAuthority, transfer } from  "@solana/spl-token";
const path = require('path');


const quicknodeEndpoint = 'https://still-serene-dust.solana-mainnet.quiknode.pro/18c3797ab7ef751ee61733259ac83af86da19052/';
const connection = new Connection(quicknodeEndpoint, "confirmed");

// const secret=[0...0]; // Replace with your secret key
// const localKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

const keypairFile = require(path.resolve(process.env.HOME, '.config/solana/id.json'));
const localKeypair = Keypair.fromSecretKey(new Uint8Array(keypairFile));

(async () => {
  // Create a new token 
  const mint = await createMint(
    connection, 
    localKeypair,            // Payer of the transaction
    localKeypair.publicKey,  // Account that will control the minting 
    null,                  // Account that will control the freezing of the token 
    0                      // Location of the decimal place 
    
  );

  // Get the token account of the localKeypair Solana address. If it does not exist, create it.
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    localKeypair,
    mint,
    localKeypair.publicKey
  );

  // Generate a new wallet to receive the newly minted token
  const toWallet = Keypair.generate();

  // Get the token account of the toWallet Solana address. If it does not exist, create it.
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    localKeypair,
    mint,
    toWallet.publicKey
  );

  // Minting 1 new token to the "fromTokenAccount" account we just returned/created.
  let signature = await mintTo(
    connection,
    localKeypair,               // Payer of the transaction fees 
    mint,                     // Mint for the account 
    fromTokenAccount.address, // Address of the account to mint to 
    localKeypair.publicKey,     // Minting authority
    1                         // Amount to mint 
  );

  await setAuthority(
    connection,
    localKeypair,            // Payer of the transaction fees
    mint,                  // Account 
    localKeypair.publicKey,  // Current authority 
    0,                     // Authority type: "0" represents Mint Tokens 
    null                   // Setting the new Authority to null
  );

  signature = await transfer(
    connection,
    localKeypair,               // Payer of the transaction fees 
    fromTokenAccount.address, // Source account 
    toTokenAccount.address,   // Destination account 
    localKeypair.publicKey,     // Owner of the source account 
    1                         // Number of tokens to transfer 
  );

  console.log("SIGNATURE", signature);

})();
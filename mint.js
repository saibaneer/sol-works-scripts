const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { Connection } = require("@solana/web3.js");
const { mplTokenMetadata, createNft, TokenStandard, createV1, mintV1, createMasterEditionV3, findMetadataPda } = require("@metaplex-foundation/mpl-token-metadata");
const { keypairIdentity, createGenericFile, percentAmount, generateSigner, signerIdentity, createSignerFromKeypair, some } = require("@metaplex-foundation/umi");
const { PinataSDK } = require("pinata-web3")
const { mplCore, create, createCollection } = require("@metaplex-foundation/mpl-core");
const { mplToolbox, mintTokensTo, createMint, createToken } = require("@metaplex-foundation/mpl-toolbox");
const fs = require("fs").promises;
const path = require('path');
require('dotenv').config();


const pinata = new PinataSDK({
    pinataJwt: process.env.JWT,
    pinataGateway: "lime-written-capybara-396.mypinata.cloud"
})

const quicknodeEndpoint = `${process.env.MAINNET}`;
const connection = new Connection(quicknodeEndpoint, "confirmed");


async function uploadToPinata(filePath, fileName) {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const file = new File([fileBuffer], fileName, {type: "image/png"});
        const upload = await pinata.upload.file(file);
        console.log("Pinata upload response:", upload);
        return `https://lime-written-capybara-396.mypinata.cloud/ipfs/${upload.IpfsHash}`
    } catch (error) {

        console.error('Error uploading to Pinata:', error);
        throw error;
    }
}

async function uploadMetadataToPinata(metadata) {
    try {
        const jsonString = JSON.stringify(metadata);
        const file = new File([jsonString], "metadata.json", { type: "application/json"});
        const upload = await pinata.upload.file(file);
        console.log("Pinata upload response:", upload);
        return `https://lime-written-capybara-396.mypinata.cloud/ipfs/${upload.IpfsHash}`
    } catch (error) {
        console.error('Error uploading to Pinata:', error);
        throw error;
    }
}

async function mintNFT() {
    // console.log({NFT_STORAGE_API_KEY})
    try {
        
        // Load the JSON data
        const data = require("./tradesta.json");
        
        // Setup image path
        const imagePath = path.resolve(__dirname, "TradeSta.png");
        console.log("Image path:", imagePath);

        

        // Initialize Umi with Devnet
        const umi = createUmi(connection);

        // Load keypair from file
        // Option 1: If you have a JSON keypair file
        const keypairFile = require(path.resolve(process.env.HOME, '.config/solana/id.json'));
        const localKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairFile));
        
        // Option 2: If you have a base58 private key
        // const localKeypair = Keypair.fromSecretKey(bs58.decode('your_private_key_here'));
        
        console.log("Using wallet address:", localKeypair.publicKey.toString());

        const signer = createSignerFromKeypair(umi, localKeypair);
        umi.use(mplTokenMetadata())
        umi.use(signerIdentity(signer))
        umi.use(mplToolbox());


        
        // Upload image and get URI
        console.log("Uploading image to Pinata...");
        const imageUri = await uploadToPinata(imagePath, "bit.ly_STANFT.png");
        console.log("Image uploaded successfully:", imageUri);

        // Create metadata JSON
        const metadata = {
            name: data.name,
            symbol: "STA",  // Added symbol
            description: data.description,
            image: imageUri,
            external_url: data.external_url,
            attributes: [],  // Added attributes array
            properties: {
                files: [
                    {
                        uri: imageUri,
                        type: "image/png"
                    }
                ],
                category: "image"  // Added category
            }
        };

        console.log("Uploading metadata to Pinata...");
        const uri = await uploadMetadataToPinata(metadata);
        console.log("Metadata uploaded successfully:", uri);

        // Generate a new mint keypair for the NFT
        const mint = generateSigner(umi);
        console.log("Generated mint address:", mint.publicKey);

        // const balance = await connection.getBalance(localKeypair.publicKey);
        // console.log(`Wallet Balance: ${balance / 1e9} SOL`);
        // if (balance < 0.1 * 1e9) {
        // throw new Error("Insufficient SOL balance for mainnet operations. Please top up your wallet.");
        // }

        // Create the NFT
        console.log(`Creating Fungible Asset Token with supply: 1000`);
        await createV1(umi, {
            mint,
            authority: signer,
            symbol: "STA NFT",
            name: data.name,
            isMutable: false,
            sellerFeeBasisPoints: percentAmount(0),
            decimals: some(0),
            uri: uri,
            tokenStandard: TokenStandard.FungibleAsset,
        }).sendAndConfirm(umi);
        console.log("NFT created successfully!");
        console.log("Mint address:", mint.publicKey);

        console.log(`Minting NonFungible Asset Token with supply: 2000`);
        const tx  = await mintV1(umi, {
            mint: mint.publicKey,
            amount: 900,
            authority: signer,
            tokenOwner: signer.publicKey,
            tokenStandard: TokenStandard.FungibleAsset
        }).sendAndConfirm(umi)

        console.log("Minted NFT successfully!");
        console.log("Signature:", tx.signature);

        return {
            mintAddress: mint.publicKey,
            metadataUri: uri
        };

    } catch (error) {
    
        throw error;
    }
}

// Execute the minting function
mintNFT()
    .then(result => console.log("Minting completed:", result))
    .catch(error => console.error("Minting failed:", error));
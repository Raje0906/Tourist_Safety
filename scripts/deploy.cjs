const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying TouristID Smart Contract...");

  // Get the contract factory
  const TouristID = await ethers.getContractFactory("TouristID");

  // Deploy the contract
  console.log("⏳ Deploying contract...");
  const touristID = await TouristID.deploy();

  // Wait for deployment to complete
  await touristID.waitForDeployment();

  const contractAddress = await touristID.getAddress();
  console.log("✅ TouristID contract deployed to:", contractAddress);

  // Get deployment transaction
  const deployTx = touristID.deploymentTransaction();
  if (deployTx) {
    console.log("📄 Deployment transaction hash:", deployTx.hash);
    console.log("⛽ Gas used:", deployTx.gasLimit.toString());
  }

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Get contract owner
  const owner = await touristID.owner();
  console.log("👤 Contract owner:", owner);

  // Check total profiles (should be 0 initially)
  const totalProfiles = await touristID.getTotalProfiles();
  console.log("📊 Total profiles:", totalProfiles.toString());

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Contract Information:");
  console.log("   Address:", contractAddress);
  console.log("   Network:", network.name);
  console.log("   Chain ID:", network.chainId.toString());
  console.log("   Owner:", owner);

  // Save deployment info to file
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    owner,
    deploymentTime: new Date().toISOString(),
    transactionHash: deployTx?.hash
  };

  const fs = require('fs');
  const path = require('path');
  
  const deploymentDir = path.join(__dirname, '../deployment');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentDir, `deployment-${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to:", `deployment/deployment-${network.name}.json`);

  return contractAddress;
}

// Run the deployment
main()
  .then((contractAddress) => {
    console.log("\n🎉 Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
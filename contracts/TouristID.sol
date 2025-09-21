// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TouristID
 * @dev Smart contract for managing secure, blockchain-based tourist digital IDs
 */
contract TouristID is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct TouristProfile {
        bytes32 profileHash;        // Hash of tourist profile data
        bytes32 documentHash;       // Hash of KYC documents
        string ipfsDocumentHash;    // IPFS hash for encrypted documents
        address touristAddress;     // Tourist's wallet address
        uint256 createdAt;         // Timestamp of creation
        uint8 verificationLevel;   // 0=Pending, 1=Verified, 2=Premium
        bool isActive;             // Active status
        string emergencyContact;   // Encrypted emergency contact
    }

    struct VerificationAuthority {
        address authority;
        string name;
        bool isActive;
        uint256 addedAt;
    }

    // Mappings
    mapping(bytes32 => TouristProfile) public touristProfiles;
    mapping(address => bytes32) public addressToProfileId;
    mapping(address => VerificationAuthority) public verificationAuthorities;
    mapping(bytes32 => bool) public revokedProfiles;

    // Arrays for enumeration
    bytes32[] public allProfileIds;
    address[] public authorityAddresses;

    // Events
    event ProfileCreated(
        bytes32 indexed profileId,
        address indexed touristAddress,
        bytes32 profileHash,
        uint256 timestamp
    );

    event ProfileVerified(
        bytes32 indexed profileId,
        address indexed authority,
        uint8 verificationLevel,
        uint256 timestamp
    );

    event ProfileRevoked(
        bytes32 indexed profileId,
        address indexed authority,
        string reason,
        uint256 timestamp
    );

    event AuthorityAdded(
        address indexed authority,
        string name,
        uint256 timestamp
    );

    event EmergencyAccessed(
        bytes32 indexed profileId,
        address indexed accessor,
        uint256 timestamp
    );

    modifier onlyAuthority() {
        require(
            verificationAuthorities[msg.sender].isActive,
            "Not authorized verification authority"
        );
        _;
    }

    modifier profileExists(bytes32 _profileId) {
        require(
            touristProfiles[_profileId].createdAt > 0,
            "Profile does not exist"
        );
        _;
    }

    modifier profileActive(bytes32 _profileId) {
        require(
            touristProfiles[_profileId].isActive,
            "Profile is not active"
        );
        require(
            !revokedProfiles[_profileId],
            "Profile has been revoked"
        );
        _;
    }

    constructor() {
        // Add contract deployer as initial authority
        verificationAuthorities[msg.sender] = VerificationAuthority({
            authority: msg.sender,
            name: "System Administrator",
            isActive: true,
            addedAt: block.timestamp
        });
        authorityAddresses.push(msg.sender);

        emit AuthorityAdded(msg.sender, "System Administrator", block.timestamp);
    }

    /**
     * @dev Create a new tourist digital ID
     * @param _profileHash Hash of the tourist's profile data
     * @param _documentHash Hash of KYC documents
     * @param _ipfsDocumentHash IPFS hash of encrypted documents
     * @param _emergencyContact Encrypted emergency contact information
     */
    function createTouristProfile(
        bytes32 _profileHash,
        bytes32 _documentHash,
        string memory _ipfsDocumentHash,
        string memory _emergencyContact
    ) external nonReentrant returns (bytes32) {
        require(_profileHash != bytes32(0), "Invalid profile hash");
        require(_documentHash != bytes32(0), "Invalid document hash");
        require(
            addressToProfileId[msg.sender] == bytes32(0),
            "Profile already exists for this address"
        );

        // Generate unique profile ID
        bytes32 profileId = keccak256(
            abi.encodePacked(
                _profileHash,
                _documentHash,
                msg.sender,
                block.timestamp,
                block.difficulty
            )
        );

        // Create profile
        touristProfiles[profileId] = TouristProfile({
            profileHash: _profileHash,
            documentHash: _documentHash,
            ipfsDocumentHash: _ipfsDocumentHash,
            touristAddress: msg.sender,
            createdAt: block.timestamp,
            verificationLevel: 0, // Pending verification
            isActive: true,
            emergencyContact: _emergencyContact
        });

        // Update mappings
        addressToProfileId[msg.sender] = profileId;
        allProfileIds.push(profileId);

        emit ProfileCreated(profileId, msg.sender, _profileHash, block.timestamp);

        return profileId;
    }

    /**
     * @dev Verify a tourist profile (only verification authorities)
     * @param _profileId The profile ID to verify
     * @param _verificationLevel Level of verification (1=Basic, 2=Premium)
     */
    function verifyProfile(
        bytes32 _profileId,
        uint8 _verificationLevel
    ) external onlyAuthority profileExists(_profileId) {
        require(_verificationLevel >= 1 && _verificationLevel <= 2, "Invalid verification level");
        
        touristProfiles[_profileId].verificationLevel = _verificationLevel;

        emit ProfileVerified(_profileId, msg.sender, _verificationLevel, block.timestamp);
    }

    /**
     * @dev Revoke a tourist profile
     * @param _profileId The profile ID to revoke
     * @param _reason Reason for revocation
     */
    function revokeProfile(
        bytes32 _profileId,
        string memory _reason
    ) external onlyAuthority profileExists(_profileId) {
        revokedProfiles[_profileId] = true;
        touristProfiles[_profileId].isActive = false;

        emit ProfileRevoked(_profileId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @dev Add a new verification authority
     * @param _authority Address of the new authority
     * @param _name Name of the authority
     */
    function addVerificationAuthority(
        address _authority,
        string memory _name
    ) external onlyOwner {
        require(_authority != address(0), "Invalid authority address");
        require(!verificationAuthorities[_authority].isActive, "Authority already exists");

        verificationAuthorities[_authority] = VerificationAuthority({
            authority: _authority,
            name: _name,
            isActive: true,
            addedAt: block.timestamp
        });

        authorityAddresses.push(_authority);

        emit AuthorityAdded(_authority, _name, block.timestamp);
    }

    /**
     * @dev Get tourist profile information
     * @param _profileId The profile ID to query
     */
    function getProfile(bytes32 _profileId)
        external
        view
        profileExists(_profileId)
        returns (
            bytes32 profileHash,
            bytes32 documentHash,
            string memory ipfsDocumentHash,
            address touristAddress,
            uint256 createdAt,
            uint8 verificationLevel,
            bool isActive
        )
    {
        TouristProfile memory profile = touristProfiles[_profileId];
        return (
            profile.profileHash,
            profile.documentHash,
            profile.ipfsDocumentHash,
            profile.touristAddress,
            profile.createdAt,
            profile.verificationLevel,
            profile.isActive && !revokedProfiles[_profileId]
        );
    }

    /**
     * @dev Verify profile authenticity using signature
     * @param _profileId The profile ID
     * @param _message Message to verify
     * @param _signature Signature from tourist's private key
     */
    function verifyProfileSignature(
        bytes32 _profileId,
        bytes32 _message,
        bytes memory _signature
    ) external view profileExists(_profileId) profileActive(_profileId) returns (bool) {
        address expectedSigner = touristProfiles[_profileId].touristAddress;
        address actualSigner = _message.recover(_signature);
        return expectedSigner == actualSigner;
    }

    /**
     * @dev Emergency access to profile (logged on blockchain)
     * @param _profileId The profile ID to access
     */
    function emergencyAccess(bytes32 _profileId)
        external
        onlyAuthority
        profileExists(_profileId)
        returns (string memory)
    {
        emit EmergencyAccessed(_profileId, msg.sender, block.timestamp);
        return touristProfiles[_profileId].emergencyContact;
    }

    /**
     * @dev Get total number of profiles
     */
    function getTotalProfiles() external view returns (uint256) {
        return allProfileIds.length;
    }

    /**
     * @dev Get profile ID by address
     * @param _touristAddress The tourist's wallet address
     */
    function getProfileIdByAddress(address _touristAddress) external view returns (bytes32) {
        return addressToProfileId[_touristAddress];
    }

    /**
     * @dev Check if a profile is verified
     * @param _profileId The profile ID to check
     */
    function isProfileVerified(bytes32 _profileId) external view returns (bool) {
        return touristProfiles[_profileId].verificationLevel > 0;
    }

    /**
     * @dev Get verification level of a profile
     * @param _profileId The profile ID to check
     */
    function getVerificationLevel(bytes32 _profileId) external view returns (uint8) {
        return touristProfiles[_profileId].verificationLevel;
    }

    /**
     * @dev Batch verify multiple profiles
     * @param _profileIds Array of profile IDs to verify
     * @param _verificationLevel Verification level to assign
     */
    function batchVerifyProfiles(
        bytes32[] calldata _profileIds,
        uint8 _verificationLevel
    ) external onlyAuthority {
        require(_verificationLevel >= 1 && _verificationLevel <= 2, "Invalid verification level");
        
        for (uint256 i = 0; i < _profileIds.length; i++) {
            if (touristProfiles[_profileIds[i]].createdAt > 0) {
                touristProfiles[_profileIds[i]].verificationLevel = _verificationLevel;
                emit ProfileVerified(_profileIds[i], msg.sender, _verificationLevel, block.timestamp);
            }
        }
    }
}
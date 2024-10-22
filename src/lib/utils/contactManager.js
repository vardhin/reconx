import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const basePath = 'contacts/';

// Create a new contact with MyName, FriendName, RoomId
export const createContact = async(myName, friendName, roomId) => {
    try {
        const contactPath = `${basePath}${myName}/`;

        await Filesystem.mkdir({
            path: contactPath,
            directory: Directory.Documents,
            recursive: true
        });

        const contactDetails = {
            MyName: myName,
            FriendName: friendName,
            RoomId: roomId
        };

        await Filesystem.writeFile({
            path: `${contactPath}contact_details.json`,
            data: JSON.stringify(contactDetails),
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });

        console.log('Contact created successfully!');
    } catch (error) {
        console.error('Error creating contact:', error);
    }
};

// Get contact details from contact_details.json
export const getContactDetails = async(myName) => {
    try {
        const contactDetailsPath = `${basePath}${myName}/contact_details.json`;

        const result = await Filesystem.readFile({
            path: contactDetailsPath,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });

        const contactDetails = JSON.parse(result.data);
        return contactDetails;
    } catch (error) {
        console.error('Error retrieving contact details:', error);
        return null;
    }
};

// Save profile picture for the contact
export const saveProfilePicture = async(name, pictureFile) => {
    try {
        const profilePicturePath = `${basePath}${name}/profile_picture.png`;

        await Filesystem.writeFile({
            path: profilePicturePath,
            data: pictureFile,
            directory: Directory.Documents
        });

        console.log('Profile picture saved!');
    } catch (error) {
        console.error('Error saving profile picture:', error);
    }
};

export const getAllContacts = async() => {
    try {
        const result = await Filesystem.readdir({
            path: basePath,
            directory: Directory.Documents
        });

        const contacts = [];
        for (const file of result.files) {
            const contactDetailsPath = `${basePath}${file.name}/contact_details.json`;
            try {
                const contactResult = await Filesystem.readFile({
                    path: contactDetailsPath,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });
                const contactDetails = JSON.parse(contactResult.data);
                contacts.push(contactDetails);
            } catch (error) {
                console.error(`Error reading contact details for ${file.name}:`, error);
            }
        }

        return contacts;
    } catch (error) {
        console.error('Error retrieving contacts:', error);
        return [];
    }
};

export const deleteContact = async(name) => {
    try {
        const contactPath = `${basePath}${name}/`;

        // Remove the contact directory and its contents
        await Filesystem.rmdir({
            path: contactPath,
            directory: Directory.Documents,
            recursive: true // This makes sure it deletes everything inside the directory
        });

        console.log(`Contact with name '${name}' deleted successfully!`);
    } catch (error) {
        console.error(`Error deleting contact '${name}':`, error);
    }
};
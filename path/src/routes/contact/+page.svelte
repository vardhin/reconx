<script>
    import { Preferences } from '@capacitor/preferences';
    import { onMount } from 'svelte';
    import NavBar from '../NavBar.svelte';
    import { darkMode } from '../../lib/stores';
    import { fade, fly } from 'svelte/transition';
    import Clouds from '../clouds.svelte';

    let myName = '';
    let friendName = '';
    let contacts = [];
    let isDarkMode;
    let visible = true; // Changed from false to true
    let showSuccessMessage = false;
    let createdContact = null;
    let errorMessage = '';

    darkMode.subscribe((value) => {
        isDarkMode = value;
    });

    async function fetchContacts() {
        try {
            console.log('Attempting to read contacts...');
            const { value } = await Preferences.get({ key: 'contacts' });
            if (value) {
                contacts = JSON.parse(value);
                console.log('Contacts fetched successfully:', contacts);
            } else {
                console.log('No contacts found. Initializing empty array.');
                contacts = [];
            }
        } catch (e) {
            console.error('Error reading contacts:', e);
            errorMessage = `Failed to read contacts: ${e.message}`;
            contacts = [];
        }
    }

    onMount(async () => {
        try {
            await fetchContacts();
        } catch (e) {
            console.error('Error in onMount:', e);
            errorMessage = `Failed to initialize contacts: ${e.message}`;
        }
    });
  
    async function handleCreateContact() {
        try {
            console.log('Creating a new contact...');
            // Trim input values
            const trimmedMyName = myName.trim();
            const trimmedFriendName = friendName.trim();

            if (!trimmedMyName || !trimmedFriendName) {
                throw new Error('Both names are required.');
            }

            // Sort names alphabetically
            const sortedNames = [trimmedMyName, trimmedFriendName].sort();
            const roomID = sortedNames.join('_');

            // Add new contact to contacts array
            const newContact = {
                myName: trimmedMyName,
                friendName: trimmedFriendName,
                roomID
            };
            contacts = [...contacts, newContact];
            console.log('Updated contacts array:', contacts);

            const saveSuccess = await saveContacts();

            if (saveSuccess) {
                console.log('Contact saved successfully');
                createdContact = newContact;
                showSuccessMessage = true;
                setTimeout(() => {
                    showSuccessMessage = false;
                }, 5000);
                myName = '';
                friendName = '';
            } else {
                throw new Error('Failed to save contact');
            }
        } catch (error) {
            console.error('Error in handleCreateContact:', error);
            errorMessage = `Failed to create contact: ${error.message}`;
        }
    }
  
    async function saveContacts() {
        try {
            const contactsString = JSON.stringify(contacts);
            console.log('Attempting to save contacts:', contactsString);
            
            await Preferences.set({
                key: 'contacts',
                value: contactsString
            });
            console.log('Contacts saved successfully');
            return true;
        } catch (e) {
            console.error('Error saving contacts:', e);
            errorMessage = `Failed to save contacts: ${e.message}`;
            return false;
        }
    }
</script>

<main class="contact-screen" class:dark-mode={isDarkMode} in:fade={{ duration: 400 }}>
    <Clouds />
    <NavBar title="Create Contact" />
    <div class="contact-form">
        {#if visible}
            <form on:submit|preventDefault={handleCreateContact} in:fade={{ duration: 400 }}>
                <label for="myName">Your Name</label>
                <input id="myName" type="text" bind:value={myName} required />

                <label for="friendName">Friend's Name</label>
                <input id="friendName" type="text" bind:value={friendName} required />

                <button type="submit">Create Contact</button>
            </form>
            <div class="alternative-create">
                <button on:click={handleCreateContact}>Alternative Create Contact</button>
            </div>
        {/if}
        
        {#if showSuccessMessage && createdContact}
            <div class="success-message" in:fly="{{ y: 50, duration: 300 }}" out:fade>
                Contact created successfully:
                <br>
                Your Name: {createdContact.myName}
                <br>
                Friend's Name: {createdContact.friendName}
                <br>
                Room ID: {createdContact.roomID}
            </div>
        {/if}

        {#if errorMessage}
            <div class="error-message">
                {errorMessage}
            </div>
        {/if}
    </div>
</main>

<style>
    /* ... existing styles ... */
</style>

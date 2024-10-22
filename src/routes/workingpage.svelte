<script>
	import { onMount } from 'svelte';
	import {
		createContact,
		addMessageToContactHistory,
		getContactDetails,
		getContactHistory,
		saveProfilePicture,
		getAllContacts
	} from '../lib/utils/contactManager';

	let name = '';
	let id = '';
	let friendId = '';
	let message = '';
	let contactDetails = null;
	let history = [];
	let profilePicture = null;
	let selectedContact = '';
	let contacts = [];

	// Fetch all contacts on component mount
	onMount(async () => {
		contacts = await getAllContacts();
	});

	// Create a new contact
	const handleCreateContact = async () => {
		await createContact(name, id, friendId);
		alert(`Contact ${name} created successfully!`);

		// Refresh contact list after creating a new contact
		contacts = await getAllContacts();
	};

	// Add message to a contact's history
	const handleAddMessage = async () => {
		await addMessageToContactHistory(selectedContact, message);
		alert(`Message added to ${selectedContact}'s history!`);
	};

	// Get contact details
	const handleGetContactDetails = async () => {
		contactDetails = await getContactDetails(selectedContact);
	};

	// Get contact history
	const handleGetContactHistory = async () => {
		history = await getContactHistory(selectedContact);
	};

	// Save a profile picture for a contact
	const handleSaveProfilePicture = async () => {
		if (!profilePicture) {
			alert('Please upload a profile picture!');
			return;
		}

		const reader = new FileReader();
		reader.onloadend = async () => {
			const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
			await saveProfilePicture(selectedContact, base64String);
			alert('Profile picture saved successfully!');
		};
		reader.readAsDataURL(profilePicture);
	};
</script>

<div class="App">
	<h1>Manage Contacts</h1>

	<!-- List of All Contacts -->
	<h2>Available Contacts</h2>
	<ul>
		{#if contacts.length > 0}
			{#each contacts as contact}
				<li>{contact}</li>
			{/each}
		{:else}
			<li>No contacts available</li>
		{/if}
	</ul>

	<!-- Form to Create Contact -->
	<form on:submit|preventDefault={handleCreateContact}>
		<h2>Create a Contact</h2>
		<input type="text" bind:value={name} placeholder="Name" required />
		<input type="text" bind:value={id} placeholder="ID" required />
		<input type="text" bind:value={friendId} placeholder="Friend ID" />
		<button type="submit">Create Contact</button>
	</form>

	<hr />

	<!-- Form to Select Contact and Add Message -->
	<form on:submit|preventDefault={handleAddMessage}>
		<h2>Add Message to Contact's History</h2>
		<input type="text" bind:value={selectedContact} placeholder="Contact Name" required />
		<input type="text" bind:value={message} placeholder="Message" required />
		<button type="submit">Add Message</button>
	</form>

	<hr />

	<!-- Form to Retrieve Contact Details -->
	<form on:submit|preventDefault={handleGetContactDetails}>
		<h2>Get Contact Details</h2>
		<input type="text" bind:value={selectedContact} placeholder="Contact Name" required />
		<button type="submit">Get Details</button>
	</form>
	{#if contactDetails}
		<div>
			<h3>Contact Details</h3>
			<p>Name: {contactDetails.name}</p>
			<p>ID: {contactDetails.id}</p>
			<p>Friend ID: {contactDetails.friendId}</p>
		</div>
	{/if}

	<hr />

	<!-- Form to Retrieve Contact History -->
	<form on:submit|preventDefault={handleGetContactHistory}>
		<h2>Get Contact History</h2>
		<input type="text" bind:value={selectedContact} placeholder="Contact Name" required />
		<button type="submit">Get History</button>
	</form>
	{#if history.length > 0}
		<div>
			<h3>Contact History</h3>
			<ul>
				{#each history as entry}
					<li>{entry.message} (Sent at: {entry.timestamp})</li>
				{/each}
			</ul>
		</div>
	{/if}

	<hr />

	<!-- Form to Save Profile Picture -->
	<form on:submit|preventDefault={handleSaveProfilePicture}>
		<h2>Upload Profile Picture</h2>
		<input type="text" bind:value={selectedContact} placeholder="Contact Name" required />
		<input
			type="file"
			accept="image/*"
			on:change={(e) => (profilePicture = e.target.files[0])}
			required
		/>
		<button type="submit">Save Picture</button>
	</form>
</div>

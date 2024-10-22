<script>
	import { createContact, saveProfilePicture } from '../lib/utils/contactManager';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { generateRandomString, generateQRCode } from '../lib/utils/qrUtils.js';
	import Navbar from './NavBar.svelte'; // Assuming Navbar is in the same directory
	import { darkMode } from '../lib/utils/stores'; // Import dark mode store

	let name = '';
	let id = '';
	let friendId = '';
	let profilePicture = null;
	let visible = false; // Track form visibility to trigger animations
	let qrCodeDataUrl = '';
	let isDarkMode = false;

	// Create a new contact with profile picture
	const handleCreateContact = async () => {
		if (!profilePicture) {
			alert('Please upload a profile picture!');
			return;
		}

		// Convert the profile picture to base64
		const reader = new FileReader();
		reader.onloadend = async () => {
			const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');

			// First, create the contact
			await createContact(name, id, friendId);

			// Then, save the profile picture for the contact
			await saveProfilePicture(name, base64String);
			alert(`Contact ${name} created successfully with a profile picture!`);
		};
		reader.readAsDataURL(profilePicture);
	};

	// Ensure the animation triggers on page load
	onMount(async () => {
		setTimeout(() => {
			visible = true; // Set to true after a short delay to trigger transitions
		}, 100); // Short delay before showing forms

		id = generateRandomString();
		qrCodeDataUrl = await generateQRCode(id);
	});

	// Subscribe to darkMode store
	darkMode.subscribe((value) => {
		isDarkMode = value;
	});

	function handleFileChange(event) {
		const file = event.target.files[0];
		if (file) {
			profilePicture = file;
		}
	}
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
</svelte:head>
<body class:dark-mode={isDarkMode}>
	<Navbar title="Create Contact" />
<div class="create-contact-screen" class:dark-mode={isDarkMode}>
	<div class="create-contact-content">
		{#if visible}
			<form on:submit|preventDefault={handleCreateContact} in:fade out:fade class="create-contact-form">
				<div class="form-group">
					<label for="friendName">Friend Name</label>
					<input type="text" id="friendName" bind:value={name} placeholder="Enter friend's name" required />
				</div>
				<div class="form-group">
					<label for="friendId">Friend ID</label>
					<input type="text" id="friendId" bind:value={friendId} placeholder="Enter friend's ID" />
				</div>
				<div class="form-group file-input-group">
					<label class="file-input">
						<input type="file" accept="image/*" on:change={handleFileChange} required />
						<span><i class="upload-icon"></i>{profilePicture ? profilePicture.name : 'Upload Profile Picture'}</span>
					</label>
				</div>
				<div class="id-info">
					<p>Ask your friend to copy/scan this ID:</p>
					<p class="user-id">{id}</p>
				</div>
				<div class="qr-container">
					{#if qrCodeDataUrl}
						<img src={qrCodeDataUrl} alt="QR Code for your ID" />
					{/if}
				</div>
				<button type="submit" class="submit-button">Create Contact</button>
			</form>
		{/if}
		</div>
</div>
</body>

<style>
	:global(:root) {
		--background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		--dark-background-gradient: linear-gradient(135deg, #2a2a72 0%, #009ffd 100%);
		--input-bg: rgba(255, 255, 255, 0.15);
		--dark-input-bg: rgba(0, 0, 0, 0.4);
		--button-bg: rgba(255, 255, 255, 0.25);
		--button-hover-bg: rgba(255, 255, 255, 0.35);
		--dark-button-bg: rgba(0, 0, 0, 0.5);
		--dark-button-hover-bg: rgba(0, 0, 0, 0.6);
		--text-color: #ffffff;
		--text-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
	}

	@media (max-width: 600px) {
		.create-contact-form {
			padding: 2rem;
			max-width: 320px;
		}

		input[type="text"],
		.file-input,
		.submit-button {
			font-size: 0.95rem;
			padding: 0.7rem 0.9rem;
		}

	}
</style>

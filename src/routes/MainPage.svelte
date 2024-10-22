<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import NavBar from './NavBar.svelte';
	import { darkMode } from '../lib/stores';
	import { fade } from 'svelte/transition';
	import FooterBar from './Footer.svelte';
	import Clouds from './clouds.svelte';

	let contacts = [];
	let isDarkMode;
	let visible = false;

	async function fetchContacts() {
		try {
			const result = await Filesystem.readFile({
				path: 'contacts.json',
				directory: Directory.Documents,
				encoding: Encoding.UTF8
			});
			contacts = JSON.parse(result.data);
		} catch (e) {
			console.error('Error reading contacts.json:', e);
		}
	}

	onMount(() => {
		fetchContacts();
		setTimeout(() => {
			visible = true;
		}, 100);
	});

	function openChat(myName, friendName) {
		goto(`/chat?myName=${myName}&friendName=${friendName}`);
	}

	const navigateToCreateContact = () => {
		goto('/contact');
	};

	darkMode.subscribe((value) => {
		isDarkMode = value;
	});
</script>

<main class="contact-screen" class:dark-mode={isDarkMode} in:fade={{ duration: 400 }}>
	<Clouds />
	<NavBar title="Recon" />
	<div class="contact-list">
		{#if visible}
			{#each contacts as contact}
				<button
					class="contact-button"
					on:click={() => openChat(contact.myName, contact.friendName)}
					in:fade={{ duration: 400 }}
				>
					{contact.myName} & {contact.friendName}
				</button>
			{/each}
		{/if}
	</div>
	<FooterBar on:middleButtonClick={navigateToCreateContact} />
</main>
<link
	href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap"
	rel="stylesheet"
/>

<style>
	:root {
		--primary-color: #3a86ff;
		--secondary-color: #8338ec;
		--body-bg-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		--body-text-color: #333;
		--form-bg-color: rgba(205, 205, 205, 0.05);
		--navbar-bg-color: rgba(255, 255, 255, 0.8);
		--navbar-text-color: #333;
		--shadow-dark: rgba(0, 0, 0, 0.1);
		--shadow-light: rgba(255, 255, 255, 0.5);
		--light-glow: 0 0 15px rgba(255, 255, 255, 0.5);
		--bg: linear-gradient(135deg, #66a4ea 0%, #5e4ba2 100%);
		--light-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		font-family: 'Orbitron', sans-serif;
		--background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.dark-mode {
		--body-bg-color: #1a1a2e;
		--bg: linear-gradient(135deg, #1a1a2e 0%, #1a1a2e 100%);
		--body-text-color: #e0e0e0;
		--form-bg-color: rgba(255, 255, 255, 0.05);
		--navbar-bg-color: rgba(26, 26, 46, 0.8);
		--navbar-text-color: #e0e0e0;
		--shadow-dark: rgba(0, 0, 0, 0.2);
		--shadow-light: rgba(255, 255, 255, 0.1);
		--dark-glass: rgba(255, 255, 255, 0.1);
		--dark-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
		--dark-glow: 0 0 15px rgba(58, 134, 255, 0.5);
	}

	.contact-screen {
		position: relative;
		transition: all 0.5s ease;
		padding-top: 70px;
		min-height: 100vh;
		width: 100%;
		box-sizing: border-box;
		overflow-x: hidden;
		background: var(--bg);
		color: var(--body-text-color);
		backdrop-filter: blur(10px);
	}

	

	.contact-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 15px;
		padding: 20px;
	}

	.contact-button {
		width: 100%;
		padding: 20px;
		font-size: 1.1em;
		color: var(--body-text-color);
		background: rgba(255, 255, 255, 0.1); /* More transparent background */
		border: 1px solid rgba(255, 255, 255, 0.2); /* Subtle border for glass effect */
		border-radius: 15px;
		backdrop-filter: blur(3px); /* Increased saturation for vividness */
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
		cursor: pointer;
		transition: all 0.3s ease;
		font-family: 'Orbitron', sans-serif;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.contact-button:hover {
		transform: translateY(-5px);
		box-shadow: 0 15px 30px 0 rgba(31, 38, 135, 0.5);
	}

	:global(.navbar) {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 60px;
		display: flex;
		align-items: center;
		padding: 0 30px;
		background: var(--navbar-bg-color);
		backdrop-filter: blur(10px);
		z-index: 1000;
		box-shadow: 0 2px 10px var(--shadow-dark);
		color: var(--navbar-text-color);
	}

	@media (max-width: 768px) {
		.contact-button {
			font-size: 0.9em;
			padding: 15px;
		}
	}

	.dark-mode .contact-button {
		background: rgba(255, 255, 255, 0.01); /* More transparent background */
		border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border for glass effect */
		backdrop-filter: blur(1px); /* Apply background blur */
	}
</style>

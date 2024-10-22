<script>
	import { onMount } from 'svelte';
	import * as QRCode from 'qrcode';

	let qrString = '';
	let qrCodeDataUrl = '';

	// Function to generate a random 32-character string
	function generateRandomString() {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < 32; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			result += charset[randomIndex];
		}
		return result;
	}

	// Generate QR code from the string
	async function generateQRCode(text) {
		try {
			const qrDataUrl = await QRCode.toDataURL(text);
			qrCodeDataUrl = qrDataUrl;
		} catch (error) {
			console.error('Error generating QR Code:', error);
		}
	}

	// When the component is mounted, generate the string and QR code
	onMount(() => {
		qrString = generateRandomString();
		generateQRCode(qrString);
	});
</script>

<div class="qr-container">
	<p>{qrString}</p>
	{#if qrCodeDataUrl}
		<img src={qrCodeDataUrl} alt="QR Code" />
	{/if}
</div>

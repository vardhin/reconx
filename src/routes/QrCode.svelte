<script>
	import { onMount, afterUpdate } from 'svelte';
	import * as QRCode from 'qrcode';

	export let roomId = ''; // Accept roomId as a prop

	let qrCodeDataUrl = '';

	// Generate QR code from the roomId
	async function generateQRCode(text) {
		try {
			const qrDataUrl = await QRCode.toDataURL(text);
			qrCodeDataUrl = qrDataUrl;
		} catch (error) {
			console.error('Error generating QR Code:', error);
		}
	}

	// Generate QR code when component mounts and when roomId changes
	$: {
		if (roomId) {
			generateQRCode(roomId);
		}
	}
</script>

<div class="qr-code-container">
	{#if qrCodeDataUrl}
		<img src={qrCodeDataUrl} alt="QR Code" class="qr-code-image" />
	{:else}
		<p>Generating QR Code...</p>
	{/if}
</div>

<style>
	.qr-code-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.qr-code-image {
		max-width: 100%;
		max-height: 100%;
	}
</style>

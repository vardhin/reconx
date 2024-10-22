// src/utils/qrUtils.js
import * as QRCode from 'qrcode';

// Function to generate a random 32-character string
export function generateRandomString(length = 32) {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * charset.length);
		result += charset[randomIndex];
	}
	return result;
}

// Function to generate a QR code as a Data URL
export async function generateQRCode(text) {
	try {
		const qrDataUrl = await QRCode.toDataURL(text);
		return qrDataUrl;
	} catch (error) {
		console.error('Error generating QR Code:', error);
		return null;
	}
}

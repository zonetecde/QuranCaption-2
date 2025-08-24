/**
 * M'envoie un message
 * @param msg Le message à envoyer
 */
export async function telemetry(msg: string) {
	try {
		const url = 'https://rayanestaszewski.fr/telemetry-quran-caption';
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ msg: msg })
		});
		if (!res.ok) {
			console.warn('telemetry request failed', res.status, await res.text());
		} else {
			console.log('telemetry request succeeded', await res.text());
		}
	} catch (err) {
		console.warn('telemetry failed', err);
	}
}

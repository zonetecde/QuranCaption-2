import { Quran } from '$lib/classes/Quran';

export const prerender = true;
export const ssr = false;

// Load le Qur'an au démarrage de l'application
Quran.load();

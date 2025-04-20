/**
 * Convert Latin numbers to Arabic numbers.
 * @param number The number to convert
 * @returns The converted number
 */
export function latinNumberToArabic(number: string) {
	return number.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1584));
}

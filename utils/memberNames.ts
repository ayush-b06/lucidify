export interface MemberName { firstName?: string; lastName?: string; selectedAvatar?: string | null; }
export const normalizeName = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').trim().replace(/\s+/g, ' ');
export function directoryProfile(profile: MemberName) {
    const firstName = (profile.firstName || '').slice(0, 80);
    const lastName = (profile.lastName || '').slice(0, 80);
    const name = normalizeName(`${firstName} ${lastName}`);
    const prefixes = new Set<string>();
    for (const term of [name, ...name.split(' ')]) {
        for (let length = 1; length <= Math.min(term.length, 80); length++) prefixes.add(term.slice(0, length));
    }
    return { firstName, lastName, selectedAvatar: profile.selectedAvatar || null, searchPrefixes: [...prefixes] };
}

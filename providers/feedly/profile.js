import { cli, Strategy } from '@jackwener/opencli/registry';
import { getFeedlyProfile } from './utils.js';

cli({
    site: 'feedly',
    name: 'profile',
    access: 'read',
    description: 'Verify Feedly token and show profile metadata',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [],
    columns: ['id', 'email', 'name', 'locale'],
    func: async () => {
        const profile = await getFeedlyProfile();
        return [{
            id: profile.id || '',
            email: profile.email || '',
            name: [profile.givenName, profile.familyName].filter(Boolean).join(' ') || profile.fullName || '',
            locale: profile.locale || '',
        }];
    },
});

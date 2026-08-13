import { cli, Strategy } from '@jackwener/opencli/registry';
import { fetchLinuxDoJson } from './feed.js';
cli({
    site: 'linux-do',
    name: 'categories',
    access: 'read',
    description: 'linux.do 分类列表',
    domain: 'linux.do',
    strategy: Strategy.COOKIE,
    browser: true,
    args: [
        { name: 'subcategories', type: 'boolean', default: false, help: 'Include subcategories' },
        { name: 'limit', type: 'int', default: 20, help: 'Number of categories' },
    ],
    columns: ['name', 'slug', 'id', 'topics', 'description'],
    func: async (page, kwargs) => {
        const data = await fetchLinuxDoJson(page, '/categories.json');
        const cats = (data?.category_list?.categories || []);
        const showSub = !!kwargs.subcategories;
        const limit = kwargs.limit || 500;
        const results = [];
        const visitedIds = new Set();

        async function processCategory(c, parentPath = "", parentId = null) {
            if (visitedIds.has(c.id) || results.length >= limit) return;
            visitedIds.add(c.id);

            const fullName = parentPath ? `${parentPath} / ${c.name}` : c.name;
            results.push({
                name: fullName,
                slug: c.slug,
                id: c.id,
                parent_id: parentId,
                parentCategoryId: parentId,
                topics: c.topic_count,
                description: (c.description_text || '').slice(0, 80),
            });

            if (showSub) {
                let subCats = Array.isArray(c.subcategory_list) ? c.subcategory_list : (Array.isArray(c.subcategories) ? c.subcategories : []);
                if (subCats.length === 0 && Array.isArray(c.subcategory_ids) && c.subcategory_ids.length > 0) {
                    try {
                        const subData = await fetchLinuxDoJson(page, `/categories.json?parent_category_id=${c.id}`, { skipNavigate: true });
                        subCats = subData?.category_list?.categories || [];
                    } catch {
                        subCats = [];
                    }
                }
                for (const sc of subCats) {
                    if (results.length >= limit) break;
                    await processCategory(sc, fullName, c.id);
                }
            }
        }

        for (const c of cats) {
            if (results.length >= limit) break;
            await processCategory(c, "", null);
        }
        return results;
    },
});


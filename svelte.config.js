import adapter from '@sveltejs/adapter-static';
import sveltePreprocess from 'svelte-preprocess';

export default {
    kit: {
        // Specify the adapter-static, ensure fallback is set for dynamic routes
        adapter: adapter({
            fallback: 'index.html', // Single-page app fallback
            strict: false // Allow dynamic routes without prerendering everything
        }),
        prerender: {
            crawl: true, // Crawl and prerender all static pages
            entries: ['*'] // You can specify certain routes or use '*' for all
        }
    },
    preprocess: sveltePreprocess()
};
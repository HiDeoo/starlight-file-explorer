import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const site =
  (process.env['CONTEXT'] === 'production' ? process.env['URL'] : process.env['DEPLOY_PRIME_URL']) ??
  'https://starlight-file-explorer.netlify.app/'

export default defineConfig({
  integrations: [
    starlight({
      description: 'Explore and document files and folders in your Starlight site with an interactive file explorer.',
      editLink: {
        baseUrl: 'https://github.com/HiDeoo/starlight-file-explorer/edit/main/docs/',
      },
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: new URL('og.jpg', site).href },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content: 'Explore and document files and folders in your Starlight site with an interactive file explorer.',
          },
        },
      ],
      // TODO(HiDeoo)
      // sidebar: [
      //   {
      //     label: 'Start Here',
      //     items: [
      //       { label: 'Getting Started', link: '/getting-started/' },
      //       { label: 'Usage', link: '/usage/' },
      //     ],
      //   },
      //   {
      //     label: 'Guides',
      //     items: [
      //       { label: 'Package Managers', link: '/guides/package-managers/' },
      //       { label: 'Icons', link: '/guides/icons/' },
      //     ],
      //   },
      //   {
      //     label: 'Resources',
      //     items: [{ label: 'Plugins and Tools', link: '/resources/starlight/' }],
      //   },
      //   { label: 'Demo', link: '/demo/' },
      // ],
      social: [
        {
          href: 'https://bsky.app/profile/hideoo.dev',
          icon: 'blueSky',
          label: 'Bluesky',
        },
        {
          href: 'https://github.com/HiDeoo/starlight-file-explorer',
          icon: 'github',
          label: 'GitHub',
        },
      ],
      title: 'Starlight File Explorer',
    }),
  ],
  site,
  trailingSlash: 'always',
})

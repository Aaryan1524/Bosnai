import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Repo Garden',
  description: "A GitHub Action that grows a botanical SVG from your repo's git history",
  base: '/Bosnai/',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Install', link: '/install' },
      { text: 'Write a Biome', link: '/write-a-biome' },
    ],

    sidebar: [
      { text: 'Install', link: '/install' },
      { text: 'Write a Biome', link: '/write-a-biome' },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/Aaryan1524/Bosnai' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Aaryan',
    },
  },
});

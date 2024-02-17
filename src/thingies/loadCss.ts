type LoadCss = (href: string, id?: string) => HTMLLinkElement | undefined;

export const loadCss: LoadCss =
  typeof window !== 'object'
    ? () => void 0
    : (href, id?) => {
        if (id) {
          const link = document.getElementById(id);
          if (link) return link as HTMLLinkElement;
        }
        const link = document.createElement('link');
        if (id) link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        link.media = 'all';
        document.getElementsByTagName('head')[0].appendChild(link);
        return link;
      };

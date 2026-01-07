import * as cheerio from 'cheerio';

interface PageProps {
  params: Promise<{ path?: string[] }>;
}

async function fetchAndTransform(path: string) {
  const url = `https://buzerant.com${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove all existing style tags and link tags for stylesheets
    $('style').remove();
    $('link[rel="stylesheet"]').remove();

    // Remove all inline styles
    $('[style]').removeAttr('style');

    // Remove class attributes that might have styling
    $('[class]').removeAttr('class');

    // Add our custom styles
    $('head').append(`
      <style>
        * {
          background-color: white !important;
          color: black !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
   body {
      margin: 5% auto; 
      background: #f2f2f2; 
      color: #444444; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px; 
      line-height: 1.8; 
      text-shadow: 0 1px 0 #ffffff; 
      width: 800px;
      max-width: 90%;
    }
      .main-header div:nth-child(2) {
      display: inline;
    }
      .main-header > span {
      font-style: italic;
    }
      .tags {
      display:flex;
      flex-wrap:wrap;
       gap: 0 1rem;
       font-size: larger;
      }
       .art-header {
        display:flex;
        justify-content:space-between;
       }
        a {
          text-decoration: underline;
        }
          h1, h3 {
          margin-bottom:0;
          }
        a:hover {
          opacity: 0.7;
        }
          footer {
          margin-top: 2em;
          font-style: italic;
          }
      </style>
    `);

    // Rewrite all links to go through the proxy
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        // Handle absolute buzerant.com URLs
        if (href.startsWith('https://buzerant.com') || href.startsWith('http://buzerant.com')) {
          const newPath = href.replace(/https?:\/\/buzerant\.com/, '');
          $(element).attr('href', newPath || '/');
        }
        // Handle protocol-relative URLs
        else if (href.startsWith('//buzerant.com')) {
          const newPath = href.replace('//buzerant.com', '');
          $(element).attr('href', newPath || '/');
        }
        // Relative URLs are already fine, just keep them as-is
        // External links will remain external
      }
    });

    // Replace logo.svg with h1
    $('img[src*="logo.svg"]').replaceWith('<h1>Buzerant</h1>');

    // Rewrite image sources to be absolute
    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        $(element).attr('src', `https://buzerant.com${src.startsWith('/') ? src : '/' + src}`);
      } else if (src && src.startsWith('//')) {
        $(element).attr('src', `https:${src}`);
      }
    });

    // Rewrite other resource URLs (scripts, etc.)
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        $(element).attr('src', `https://buzerant.com${src.startsWith('/') ? src : '/' + src}`);
      } else if (src && src.startsWith('//')) {
        $(element).attr('src', `https:${src}`);
      }
    });

    // Remove trailing · from elements with no following sibling
    $('div span').each((_, element) => {
      const $el = $(element);
      if (!$el.next().length) {
        const text = $el.text();
        if (text.match(/·\s*$/)) {
          $el.text(text.replace(/·\s*$/, ''));
        }
      }
    });

    // Add "tags" class to div after header on main page only
    if (['/', '/buzeni', '/vulvar', '/podsunuto', '/brichomluveni'].includes(path)) {
      $('header').attr('class', 'main-header');
      $('header').next('div').attr('class', 'tags');
    } else {
      $('header').attr('class', 'art-header');
    }

    // Replace all "Buzerant" with "Bu*erant"
    $('*').contents().each((_, node) => {
      if (node.type === 'text' && node.data) {
        node.data = node.data.replace(/Buzerant/gi, 'Bu*erant');
      }
    });

    return $.html();
  } catch (error) {
    console.error('Error fetching page:', error);
    throw error;
  }
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const path = resolvedParams.path ? '/' + resolvedParams.path.join('/') : '/';

  try {
    const transformedHtml = await fetchAndTransform(path);

    return (
      <div dangerouslySetInnerHTML={{ __html: transformedHtml }} />
    );
  } catch (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h1>Error Loading Page</h1>
        <p>Failed to load content from buzerant.com{path}</p>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}

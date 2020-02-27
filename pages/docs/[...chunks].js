import { request, seoMetaTagsFields, imageFields } from 'lib/datocms';
import { renderMetaTags } from 'react-datocms';
import { gqlStaticPaths } from 'lib/datocms';
import DocsLayout from 'components/DocsLayout';
import gql from 'graphql-tag';
import PostContent from 'components/PostContent';
import Link from 'next/link';
import ActiveLink from 'components/ActiveLink';
import LeftIcon from 'public/icons/regular/chevron-double-left.svg';
import htmlToDOM from 'html-dom-parser';
import { domToReact } from 'html-react-parser';
import slugify from 'utils/slugify';
import getInnerText from 'utils/getInnerText';
import s from 'pages/docs/pageStyle.css';
import Head from 'next/head';
import docHref from 'utils/docHref';

var domParserOptions = { decodeEntities: true, lowerCaseAttributeNames: false };

export const unstable_getStaticPaths = gqlStaticPaths(
  gql`
    {
      roots: allDocGroups(filter: { parent: { exists: false } }) {
        slug
        pages {
          page {
            slug
          }
        }
        children {
          name
          slug
          pages {
            page {
              slug
            }
          }
          children {
            name
            slug
            pages {
              page {
                slug
              }
            }
          }
        }
      }
    }
  `,
  'chunks',
  ({ roots }) =>
    roots
      .map(root =>
        root.children
          .filter(c => c.slug !== 'content-management-api')
          .map(sub =>
            sub.pages[0].page.slug === 'index'
              ? [sub.slug]
              : [sub.slug, sub.pages[0].page.slug],
          ),
      )
      .flat(),
);

export const unstable_getStaticProps = async function({
  params: { chunks: rawChunks },
}) {
  const chunks = rawChunks.map(chunk => chunk.split(/\//g)).flat();
  const groupSlug = chunks.length >= 2 ? chunks[chunks.length - 2] : chunks[0];
  const pageSlug = chunks.length >= 2 ? chunks[chunks.length - 1] : 'index';

  const {
    data: { docGroup },
  } = await request({
    query: gql`
      query($groupSlug: String!) {
        docGroup(filter: { slug: { eq: $groupSlug } }) {
          name
          slug
          pages {
            titleOverride
            page {
              id
              title
              slug
            }
          }
        }
      }
    `,
    variables: { groupSlug },
  });

  const page =
    docGroup && docGroup.pages.find(page => page.page.slug === pageSlug);
  const titleOverride = page && page.titleOverride;
  const pageId = page && page.page.id;

  const {
    data: { page: pageData },
  } = await request({
    query: gql`
      query($pageId: ItemId!) {
        page: docPage(filter: { id: { eq: $pageId } }) {
          title
          _seoMetaTags {
            ...seoMetaTagsFields
          }
          content {
            ... on TextRecord {
              id
              _modelApiKey
              text(markdown: true)
            }
            ... on ImageRecord {
              id
              _modelApiKey
              image {
                format
                width
                responsiveImage(imgixParams: { w: 810 }) {
                  ...imageFields
                }
                url
              }
            }
            ... on VideoRecord {
              id
              _modelApiKey
              video {
                url
                title
                provider
                width
                height
                providerUid
              }
            }
            ... on InternalVideoRecord {
              id
              _modelApiKey
              autoplay
              loop
              thumbTimeSeconds
              video {
                title
                width
                height
                video {
                  duration
                  streamingUrl
                  thumbnailUrl
                }
              }
            }
            ... on CodeBlockRecord {
              _modelApiKey
              code
              language
            }
          }
        }
      }

      ${seoMetaTagsFields}
      ${imageFields}
    `,
    variables: { pageId },
  });

  return { props: { docGroup, titleOverride, page: pageData } };
};

export const Sidebar = ({ title, entries }) => {
  return (
    <>
      <Link href="/docs">
        <a className={s.backHome}>
          <LeftIcon /> Home
        </a>
      </Link>

      <div className={s.groupName}>{title}</div>

      {entries.map(({ url, label }) => (
        <ActiveLink
          href={docHref(url)}
          as={url}
          activeClassName={s.activePage}
          key={url}
        >
          <a className={s.page}>{label}</a>
        </ActiveLink>
      ))}
    </>
  );
};

export function Toc({ content, extraEntries: extra }) {
  const contentEntries =
    content &&
    content
      .filter(b => b._modelApiKey === 'text')
      .map(b => {
        const dom = htmlToDOM(b.text, domParserOptions);

        return dom
          .filter(el => el.type === 'tag' && el.name.match(/^h[1-6]$/))
          .map(heading =>
            domToReact([heading], {
              replace: ({ children }) => {
                const innerText = getInnerText(children);
                return (
                  <a
                    href={`#${slugify(innerText)}`}
                    className={s.tocEntry}
                    key={innerText}
                  >
                    {domToReact(children)}
                  </a>
                );
              },
            }),
          );
      })
      .flat();

  const extraEntries =
    extra &&
    extra.map(({ anchor, label }) => (
      <a href={`#${anchor}`} className={s.tocEntry} key={anchor}>
        {label}
      </a>
    ));

  return (contentEntries && contentEntries.length > 0) ||
    (extraEntries && extraEntries.length > 0) ? (
    <div className={s.sidebar}>
      <div className={s.toc}>
        <div className={s.tocTitle}>In this page</div>
        <div className={s.entries}>
          {contentEntries}
          {extraEntries}
        </div>
      </div>
    </div>
  ) : null;
}

export default function DocPage({ docGroup, titleOverride, page }) {
  return (
    <DocsLayout
      sidebar={
        docGroup && (
          <Sidebar
            title={docGroup.name}
            entries={docGroup.pages.map(page => {
              return {
                url: `/docs/${docGroup.slug}${
                  page.page.slug === 'index' ? '' : `/${page.page.slug}`
                }`,
                label: page.titleOverride || page.page.title,
              };
            })}
          />
        )
      }
    >
      {page && (
        <>
          <Head>{renderMetaTags(page._seoMetaTags)}</Head>
          <div className={s.articleContainer}>
            <div className={s.article}>
              <div className={s.title}>{titleOverride || page.title}</div>
              <PostContent content={page.content} style={s} />
            </div>
            <Toc content={page.content} />
          </div>
        </>
      )}
    </DocsLayout>
  );
}

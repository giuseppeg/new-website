import { Image } from 'react-datocms';

export default function ImageFigure({ data, imageClassName }) {
  return (
    <figure>
      {data.format === 'gif' && (
        <video
          poster={`${data.url}?fm=jpg&fit=max&w=900`}
          style={{ width: `${data.width}px` }}
          autoPlay
          loop
        >
          <source src={`${data.url}?fm=webm&w=900`} type="video/webm" />
          <source src={`${data.url}?fm=mp4&w=900`} type="video/mp4" />
        </video>
      )}
      {data.format !== 'gif' && data.responsiveImage && (
        <Image
          className={imageClassName}
          data={data.responsiveImage}
          style={{ display: 'inline-block' }}
        />
      )}
      {data.format !== 'gif' && !data.responsiveImage && (
        <img alt={data.alt} src={`${data.url}?auto=format&fit=max&w=900`} />
      )}
      {(data.title || (data.responsiveImage && data.responsiveImage.title)) && (
        <figcaption>{data.title || data.responsiveImage.title}</figcaption>
      )}
    </figure>
  );
}

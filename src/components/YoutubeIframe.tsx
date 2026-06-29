export function YouTubeIframe(props: any) {
  return (
    <div className="relative h-0 overflow-hidden pt-[56.25%]">
      <iframe
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube video player"
        {...props}
      />
    </div>
  );
}

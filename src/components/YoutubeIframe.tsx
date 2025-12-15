export function YouTubeIframe(props: any) {
  return (
    <div className="sh-relative sh-h-0 sh-overflow-hidden sh-pt-[56.25%]">
      <iframe
        className="sh-absolute sh-inset-0 sh-w-full sh-h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube video player"
        {...props}
      />
    </div>
  );
}

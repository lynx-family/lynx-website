export default (request: Request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/')) {
    return;
  }

  url.pathname += '/';
  return Response.redirect(url, 308);
};

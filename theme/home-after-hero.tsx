import { Banner, Features, ShowCase } from '@/components/home-comps';

export function HomeAfterHero({ routePath }: { routePath: string }) {
  return (
    <>
      <Features src={routePath} />
      {routePath === '/' && <ShowCase />}
      {routePath === '/' && <Banner />}
    </>
  );
}

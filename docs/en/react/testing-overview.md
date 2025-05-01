# Testing Overview

Testing is an important topic in the React ecosystem. There are many excellent testing solutions in the React ecosystem, which can be roughly divided into two categories:

- End-to-end testing: Render components in a real browser environment to test the behavior of the entire application. The underlying layer often requires tools such as Puppeteer and Playwright to provide a real browser environment.

- Unit testing: Render components in a pure JS environment, and then assert the rendering results and behavior of components. The underlying layer often requires jsdom, happy-dom, etc. to simulate the browser environment. In ReactLynx, `@lynx-js/test-environment` is required.

For end-to-end testing in ReactLynx, you can bundle you App into web using [Lynx for Web](guide/start/fragments/web/integrating-lynx-with-web), and then test it based on tools such as Puppeteer.

For unit testing, we provide [ReactLynx Testing Library](./react-lynx-testing-library/index.mdx), which is based on jsdom and other tools to implement unit testing of ReactLynx components. If you have used [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) before, you will find that using ReactLynx Testing Library is simple because the APIs of the two are similar.

## How to choose a testing solution

End-to-end testing and unit testing each have their own advantages and disadvantages. You can choose the appropriate testing solution according to your needs. The following table compares the differences between end-to-end testing and unit testing:

| Comparison items | End-to-end testing                                                           | Unit testing                                                                         |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Test scope       | Test the behavior of the entire application                                  | Test the behavior of components                                                      |
| Test speed       | The test speed is slow and requires the launch of a real browser environment | The test speed is fast and does not require the launch of a real browser environment |
| Bundling         | Will use Rspeedy for bundling, which is close to the actual situation        | Only translate the code without bundling, and Lynx behavior is mock                  |

import * as fs from 'node:fs';

const doGenMdx = (data) => {
  if (!data?.[0]?.flag && !data?.[0]?.children) {
    if (!data) {
      return '';
    }

    const sourceString = JSON.stringify(data);

    return `
      <Lynx.UIApiTable source={${sourceString}}/> 
    `;
  }

  return data
    .map((d) => {
      if (d.flag && d.title) {
        return `
        ${d.flag} ${d.title} 
        ${doGenMdx(d.children)}
      `;
      }
    })
    .join('\n');
};

const doGenTplWithData = async (dataPath: string, savePath: string) => {
  const dataString = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(dataString);

  let content = `
  ${data.flag} ${data.title}
  ${doGenMdx(data.children)}
  `;

  fs.writeFileSync(savePath, content);
};

export { doGenTplWithData };

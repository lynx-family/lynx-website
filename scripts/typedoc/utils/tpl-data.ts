import * as fs from 'node:fs';

const doFindObjectWithTagValue = (obj, tagName, tagValue) => {
  function recursiveSearch(currentObj) {
    for (let key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        if (key === tagName && currentObj[key] === tagValue) {
          return currentObj;
        }
        if (typeof currentObj[key] === 'object' && currentObj[key] !== null) {
          let result = recursiveSearch(currentObj[key]);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  return recursiveSearch(obj);
};

const doFindObjectWithTag = (obj, tagName) => {
  function recursiveSearch(currentObj) {
    for (let key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        if (key === tagName) {
          return currentObj[key];
        }
        if (typeof currentObj[key] === 'object' && currentObj[key] !== null) {
          let result = recursiveSearch(currentObj[key]);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  return recursiveSearch(obj);
};

const doSingleTypeCalc = (t) => {
  try {
    const { type, name } = t;

    switch (type) {
      case 'intrinsic':
      case 'reference':
        return name;
      case 'array':
        return `${t.elementType.name}[]`;
      case 'literal':
        return t.value;
      case 'templateLiteral':
        return t.head + t.tail?.map((ti) => ti?.[1]).join(',');
      default:
        return t;
    }
  } catch (e) {
    throw e;
  }
};

const doCalcSingleParam = (p) => {
  return `${p.name}: ${doTypeCalc(p.type)}`;
};

const doCalcParams = (params) => {
  return params?.length ? params.map(doCalcSingleParam).join(', ') : '';
};

const doCalcUnionType = (types) => {
  try {
    return types.map(doSingleTypeCalc).join(' | ');
  } catch (e) {
    throw e;
  }
};

const doCalcReflectionType = (declaration) => {
  try {
    if (declaration.signatures) {
      const { parameters, type } = declaration.signatures?.[0];

      return `(${doCalcParams(parameters)}) => ${doSingleTypeCalc(type)}`;
    }

    return 'Record<string, unknown>';
  } catch (e) {
    throw e;
  }
};

const doTypeCalc = (t) => {
  try {
    const { type, name, types, declaration } = t;

    switch (type) {
      case 'intrinsic':
      case 'reference':
        return name;
      case 'array':
        return `${t.elementType.name}[]`;
      case 'templateLiteral':
        return t.head + t.tail?.map((ti) => ti?.[1]).join(',');
      case 'union':
        return doCalcUnionType(types);
      case 'reflection':
        return doCalcReflectionType(declaration);
      default:
        return t;
    }
  } catch (e) {
    console.log(e);

    return t;
  }
};

const doGetDefaultBaseValueString = (singleContent: string) => {
  const regex = /ts\n(.*?)\n/;
  const match = regex.exec(singleContent);

  if (match) {
    const extractedContent = match[1];

    return extractedContent;
  } else {
    return '';
  }
};

const doGetDefaultComplexValueString = (singleContent: string) => {
  const regex = /`(.*?)`/;
  const match = regex.exec(singleContent);

  if (match) {
    const extractedContent = match[1];

    return extractedContent;
  } else {
    return '';
  }
};

const doDefaultValueCalc = (defaultValue) => {
  if (!defaultValue) return '';

  const { content } = defaultValue;

  return content
    ?.map((c) => {
      const formatValue =
        doGetDefaultBaseValueString(c.text) ||
        doGetDefaultComplexValueString(c.text);

      return formatValue;
    })
    .join(',');
};

const doMoreForItem = (item) => {
  const { name, type } = item;
  // 是否可选
  const isOption = !!doFindObjectWithTagValue(item, 'isOptional', true)
    ? true
    : false;
  // 支持 iOS
  const isSupportIOS = !!doFindObjectWithTagValue(item, 'tag', '@iOS')
    ? true
    : false;
  // 支持 Android
  const isSupportAndroid = !!doFindObjectWithTagValue(item, 'tag', '@Android')
    ? true
    : false;
  // 支持 Harmony
  const isSupportHarmony = !!doFindObjectWithTagValue(item, 'tag', '@Harmony')
    ? true
    : false;
  // 描述信息
  const summary = doFindObjectWithTag(item, 'summary');
  // 默认值
  const defaultValue = doFindObjectWithTagValue(item, 'tag', '@defaultValue');

  return {
    name,
    type: doTypeCalc(type),
    summary,
    defaultValue: doDefaultValueCalc(defaultValue),
    isOption,
    isSupportIOS,
    isSupportAndroid,
    isSupportHarmony,
  };
};

const doGetChildren = (
  groupsRoot: { title: string; children: number[] }[],
  childrenRoot: Record<string, unknown>[],
  flag,
) => {
  return groupsRoot?.map((g) => {
    const { title, children } = g;
    const targetChildren = childrenRoot.filter((c) =>
      children.includes((c as { id: number }).id),
    );

    const formatChildren = targetChildren.map((f) => {
      if (f.groups && f.children) {
        return doGetChildren(
          f.groups as { title: string; children: number[] }[],
          f.children as Record<string, unknown>[],
          flag + '#',
        );
      }

      return doMoreForItem(f);
    });

    return {
      title,
      flag,
      children: formatChildren,
    };
  });
};

const doGenDocData = async (jsonPath: string, savePath: string) => {
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const typedocData = JSON.parse(content);
      const checkIndexTargetGroup = typedocData.groups?.filter(
        (g) => g.title === '接口' || g.title === 'Interfaces',
      )?.[0];

      const rootTitle = checkIndexTargetGroup?.title || '';
      const checkArray = checkIndexTargetGroup?.children || [];

      const rootArray = typedocData.children.filter((c) =>
        checkArray?.includes(c.id),
      );

      rootArray.sort((a, b) => {
        if (a.name.endsWith('Props')) {
          return -1;
        } else if (b.name.endsWith('Props')) {
          return 1;
        } else if (a.name.endsWith('Ref')) {
          return -1;
        } else if (b.name.endsWith('Ref')) {
          return 1;
        } else {
          return 0;
        }
      });

      const rootFlag = '##';

      const docData = {
        title: rootTitle,
        flag: rootFlag,
        children: rootArray?.map((ra) => {
          return {
            title: ra.name,
            flag: rootFlag + '#',
            children: doGetChildren(
              ra.groups as { title: string; children: number[] }[],
              ra.children as Record<string, unknown>[],
              ' ', // 不再增加一个标题
            ),
          };
        }),
      };

      fs.writeFileSync(savePath, JSON.stringify(docData, null, 2));
    } catch (e) {
      console.log(e);

      return !!0;
    }
  }

  return !!0;
};

export { doGenDocData };

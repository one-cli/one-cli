const parser = require('@babel/parser');
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const fs = require('fs');
const path = require('path');
const { getSplitString, toUpperCaseFirstWord } = require('../utils');

// 使用 ag g page 生成页面组件时，第四个输入为 ’ foo/bar ‘,加入分隔符’/‘，
// 则被认为 在 key ='foo'的路由下面的 children 数组内加入菜单配置 ，自动配置好 menuList 菜单配置
// 例如 ag g page systemEvaluation/demo 测试 ，则会在 src/layouts/base/config.tsx 文件下产生如下菜单配置：

// {
//   key: "systemEvaluation",
//   text: "架构评估",
//   icon: <FileTextOutlined />,
//   children: [
//     { key: "/system-evaluation/Demo", text: "测试" },
//   ],
// },

// 由于遗留代码命名没统一，导致以下情况，父菜单 key 为 systemEvaluation ,而子菜单的 key 的父级前缀 为 /system-evaluation
// 所以建立 menuKeyMap 做一个映射关系
// {
//   key: "systemEvaluation",
//   text: "架构评估",
//   icon: <FileTextOutlined />,
//   children: [
//     { key: "/system-evaluation/Demo", text: "测试" },
//   ],
// },

const menuKeyMap = {
  systemEvaluation: 'system-evaluation',
  analysisTools: 'analysis',
};

function createMemberExpression(routerPath, componentPath) {
  return t.objectExpression([
    {
      key: t.identifier('path'),
      type: 'ObjectProperty',
      value: t.StringLiteral(routerPath),
    },
    {
      key: t.identifier('component'),
      type: 'ObjectProperty',
      value: t.StringLiteral(componentPath),
    },
  ]);
}

function handleRouter(code, parentKey, childKey) {
  const ast = parser.parse(code, {
    sourceType: 'module',
  });

  traverse(ast, {
    ObjectExpression(path) {
      path.node.properties.forEach((item) => {
        //TODO: 处理没有找到 key 的情况，给予提示
        if (item.value.value === '/:systemId') {
          path.traverse({
            ObjectProperty(path2) {
              //找到 children属性
              if (path2.node.key.name === 'routes') {
                path2.node.value.elements.push(
                  createMemberExpression(
                    `${parentKey}/${childKey}`,
                    `@/pages/${parentKey}/${childKey}/${childKey}`
                  )
                );
              }
            },
          });
        }
      });
    },
  });

  return generator(
    ast,
    {
      // retainLines: true,
      // minified: false,
    },
    code
  );
}

function getRouterConfigFile() {
  //默认都在 src 目录下执行
  return fs.readFileSync(path.join(process.cwd(), '../.umirc.ts'), 'utf-8');
}

function rewrite(newCode) {
  fs.writeFile(
    path.join(process.cwd(), '../.umirc.ts'),
    newCode,
    {
      encoding: 'utf-8',
    },
    () => {}
  );
}

/**
 *
 *
 * @param {*} menuPath 菜单路径 例如 systemEvaluation/demo（父/子）,若不加分隔符 /，则视为新增一级菜单
 * @param {*} menuText 菜单显示文字
 */
function routerHandler(menuPath, menuText) {
  console.log('menuPath: ', menuPath);
  if (menuPath.includes('/')) {
    let { parent, child } = getSplitString(menuPath);
    if (!child) {
      console.error('分隔符后面不能为空字符！');
      return;
    }
    child = toUpperCaseFirstWord(child);
    const routerConfigFile = getRouterConfigFile();

    const codeResult = handleRouter(routerConfigFile, parent, child);
    rewrite(codeResult.code);
  } else {
    //TODO: 处理顶级菜单
    console.log('routerHandler 没有指定父节点');
  }
}

module.exports = routerHandler;
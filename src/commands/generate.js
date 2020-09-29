const fs = require('fs');
const path = require('path');
const menuConfigHandler = require('../handlers/menuConfigHandler');
const routerHandler = require('../handlers/routerHandler');

const {
  generateFileByTemplate,
  validate,
  getSplitString,
  formatFileName,
} = require('../utils');

function copyTemplate(from, to, fileName) {
  from = path.join(__dirname, '../templates', from);
  const rawContent = fs.readFileSync(from, 'utf-8');
  const finalContent = generateFileByTemplate(rawContent, {
    fileName,
  });
  fs.writeFileSync(to, finalContent);
}

/**
 * @param {*} templateFileName componentBasic | componentBusiness | page
 * @param {*} fileName
 * @param {*} filePath './pages' | './components'
 */
function createFile(templateFileName, filePath, fileName) {
  fs.mkdirSync(filePath + `/${fileName}`);
  copyTemplate(
    templateFileName,
    filePath + `/${fileName}/${fileName}.tsx`,
    fileName
  );
  copyTemplate(
    templateFileName + 'Less',
    filePath + `/${fileName}/${fileName}.less`,
    fileName
  );
}

function generatePage(fileName, menuName) {
  if (!fileName.includes('/')) {
    console.error(
      '目前新建页面必须指定父级目录，以 / 分割 ,例如 parentDirectory/childDirectory'
    );
    return;
  }

  const { parent, child } = getSplitString(fileName);
  createFile('page', `./pages/${parent}`, child);
  fs.mkdirSync(`./pages/${parent}` + `/${child}` + '/components');
  menuConfigHandler(fileName, menuName);
  routerHandler(fileName);
}

function generateComponent(fileName, componentOptions) {
  const { basic, business } = componentOptions;
  if (basic) {
    generateComponentBasic(fileName);
  } else if (business) {
    generateComponentBusiness(fileName);
  }
}

function generateComponentBasic(fileName) {
  createFile('componentBasic', './components/Basic', fileName);
}

function generateComponentBusiness(fileName) {
  createFile('componentBusiness', './components/Business', fileName);
}

function generate(options, actionName, fileName, menuName) {
  validate([
    {
      fn: () => !process.cwd().endsWith('/src'),
      message: '请在项目的 src 目录下运行！',
    },
    {
      fn: () => fileName.includes('-'),
      message: 'pages下文件必须以首字母大写+驼峰命名！',
    },
  ])(() => {
    fileName = formatFileName(fileName);
    switch (actionName) {
      case 'page':
      case 'p':
        generatePage(fileName, menuName);
        break;

      case 'component':
      case 'c':
        generateComponent(fileName, options);
        break;

      default:
        break;
    }
  });
}

function initCommandGenerate(program) {
  // ag g page xxx/xxx2 菜单名
  program
    .command('generate')
    .alias('g')
    .description('generate a page/components/api')
    .option('-ba, --basic', '创建 basic components')
    .option('-bu, --business', '创建 business components')
    .action((options) => {
      generate(options, ...process.argv.slice(3));
    });
}

module.exports = initCommandGenerate;

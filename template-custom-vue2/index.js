const fse = require('fs-extra');
const inquirer = require('inquirer');
const ejs = require('ejs');
const glob = require('glob');
const cp = require("child_process");

const WHITE_COMMAND = ['npm', 'cnpm', 'tnpm'];

async function install (options) {
  const projectInfo = await inquirer.prompt({
    type: 'input',
    name:'description',
    message: '请输入项目描述信息',
    default:'',
    validate: function (v) {
      const done = this.async();
      setTimeout(function () {
        if(!v) {
          done('请输入描述信息');
        }
        done(null, true);
      }, 0)
    }
  })
  options.description = projectInfo.description;
  try {
    const { sourcePath, targetPath } = options;
    fse.ensureDirSync(sourcePath);
    fse.ensureDirSync(targetPath);
    fse.copySync(sourcePath, targetPath);
  } catch (e) {
    throw e
  }
  const templateIgnore = options.ignore || [];
  const ignore = ['**/node_modules/**', ...templateIgnore];
  options.ignore = ignore
  await ejsRender(options);
  const { installCommand, startCommand, targetPath } = options;
  // 安装依赖
  await execCommand(installCommand, targetPath, '依赖安装失败');
  // 执行启动命令
 await execCommand(startCommand, targetPath, '启动失败');
}

async function execCommand (command, targetPath, errorMsg) {
  if(command) {
    const Cmd = command.split(' ');
    const cmd = checkCommand(Cmd[0]);
    const ags = Cmd.slice(1);
    const res = await execAsync(cmd, ags, {
      stdio: 'inherit',
      cwd: targetPath
    })
    if(res !== 0) {
      throw new Error(errorMsg);
    }
  }
}

async function ejsRender (options) {
  const dir = options.targetPath;
  const projectInfo = options;
  return new Promise((resolve, reject) => {
    glob("**", {
      cwd: dir,
      ignore: options.ignore,
      nodir: true
    },(err, files) => {
      if(err) {reject(err)}
      Promise.all(files.map(file => {
        const filePath = path.join(dir, file);
        return new Promise((res, rej)=>{
          ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
            if(err) {
              rej(err);
            } else {
              fse.writeFileSync(filePath, result)
              res(result);
            }
          })
        })
      })).then(()=>{
        resolve();
      }).catch((err)=>{
        reject(err);
      })
    })
  })
}

  // 检查白名单命令
  function checkCommand (cmd) {
    if(WHITE_COMMAND.includes(cmd)) {
      return cmd
    }
    return null
  }

  function execAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = exec(command,args,options);
        p.on('error', reject);
        p.on('exit', resolve);
    })
  }

  function exec(command,args,options) {
    const win32= process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(args) : args;

    return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = install;
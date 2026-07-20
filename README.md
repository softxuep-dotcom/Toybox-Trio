# Toybox Trio

原创 Three.js 3D 三同物收集游戏。旋转玩具堆、把三个相同玩具放入收纳槽，并救出箱底的方块宠物。

在线游玩：https://softxuep-dotcom.github.io/Toybox-Trio/

## 运行

```powershell
npm install
npm run dev
```

浏览器打开终端显示的本地地址。

## 构建

```powershell
npm run build
npm run preview
```

生产文件输出到 `dist/`。

构建产物使用相对资源路径，同一份 `dist/` 可部署到 GitHub Pages 的项目子目录，也可直接打包上传 Poki。

## 资产

精选 GLB 来自 Kenney Cube Pets、Toy Car Kit 和 Brick Kit，均为 CC0。许可证副本位于 `public/licenses/`。其余模型和全部音效由代码生成。

完整设计见 [DESIGN.md](./DESIGN.md)。

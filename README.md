# Toybox Trio

原创 Three.js + Rapier 3D 三同物收集游戏。旋转视角观察真实物理玩具堆，把三个相同玩具放入收纳槽，为本箱的主角玩具补充零件并完成修复。

第一箱是仅含 3 辆玩具车的短教学；玩家长时间未选择时才显示“点击车模型”提示。玩具先以 3D 模型飞入收纳槽，再切换为渲染图标并在三消时聚拢爆开；第二箱起进入随机牌库、朝向和物理堆叠的正式关卡。

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

## Poki 与多语言

入口页加载 Poki HTML5 SDK v2，游戏会依次发送初始化、加载完成、玩法开始/停止事件，并在开始、重试和下一关等自然节点请求 `commercialBreak`。失败后可由玩家主动选择 `rewardedBreak`：广告完整播放后把收纳槽末尾两个玩具放回 3D 玩具堆并继续，每关限用一次；广告未完成则不发放奖励。SDK 缺失、被拦截或初始化失败时仍可正常游玩。

界面按浏览器语言自动支持英语、法语、意大利语、德语、西班牙语、简体中文、日语、韩语、巴西葡语、俄语和土耳其语；未支持的语言回退英语。开发和验收时可使用 `?lang=de` 这类参数切换语言。

## 资产

玩法使用的精选 GLB 来自 Kenney Toy Car Kit、Brick Kit、Space Kit、Mini Arcade、Train Kit 和 Food Kit，均为 CC0。许可证副本位于 `public/licenses/`。其余模型和全部音效由代码生成；仓库中保留的 Cube Pets 历史素材不再由游戏加载。

完整设计见 [DESIGN.md](./DESIGN.md)。

当前 20 类可匹配玩具、模型来源和关卡轮换见 [TOY_CATALOG.md](./TOY_CATALOG.md)。

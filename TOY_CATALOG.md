# Toybox Trio 玩具目录

当前可匹配玩具共 **20 类**。所有类别都有真实 3D 渲染图标、颜色、物理碰撞体和程序化回退；GLB 加载失败时仍可继续完成关卡。

| # | 玩具 | 代码 ID | 游戏模型 | 来源与许可 | 首次出现 |
| ---: | --- | --- | --- | --- | --- |
| 1 | 弹力球 | `ball` | 程序化球体与装饰环 | 项目原创 | Box 2 |
| 2 | 玩具赛车 | `car` | GLB | Kenney Toy Car Kit，CC0 | Box 1 |
| 3 | 拼搭积木 | `brick` | GLB | Kenney Brick Kit，CC0 | Box 2 |
| 4 | 口袋火箭 | `rocket` | 程序化圆柱、圆锥与尾翼 | 项目原创 | Box 2 |
| 5 | 陀螺 | `top` | 程序化圆锥、圆环与手柄 | 项目原创 | Box 2 |
| 6 | 礼物盒 | `gift` | 程序化盒体、缎带与蝴蝶结 | 项目原创 | Box 2 |
| 7 | 小机器人 | `robot` | 程序化盒体、胶囊体与球体 | 项目原创 | Box 3 |
| 8 | 玩具鼓 | `drum` | 程序化圆柱与圆环 | 项目原创 | Box 3 |
| 9 | 发光星星 | `star` | 程序化挤压星形 | 项目原创 | Box 3 |
| 10 | 太空赛车 | `spaceship` | GLB | Kenney Space Kit，CC0 | Box 3 |
| 11 | 月球车 | `rover` | GLB | Kenney Space Kit，CC0 | Box 3 |
| 12 | 口袋外星人 | `alien` | GLB | Kenney Space Kit，CC0 | Box 3 |
| 13 | 迷你街机 | `arcade` | GLB | Kenney Mini Arcade，CC0 | Box 4 |
| 14 | 抓娃娃机 | `claw` | GLB | Kenney Mini Arcade，CC0 | Box 4 |
| 15 | 怪兽卡车 | `monster` | GLB | Kenney Toy Car Kit，CC0 | Box 3 |
| 16 | 玩具火车 | `train` | GLB | Kenney Train Kit，CC0 | Box 4 |
| 17 | 旋纹棒棒糖 | `lollipop` | GLB | Kenney Food Kit，CC0 | Box 4 |
| 18 | 玩具纸杯蛋糕 | `cupcake` | GLB | Kenney Food Kit，CC0 | Box 4 |
| 19 | 玩具香蕉 | `banana` | GLB | Kenney Food Kit，CC0 | Box 4 |
| 20 | 玩具菠萝 | `pineapple` | GLB | Kenney Food Kit，CC0 | Box 4 |

## 修复项目

每个玩具箱都有一个持续可见的主角玩具：Zip 赛车、Chug 火车、Nova 火箭、Pixel 街机和 Bolt 机器人。每次三消都会为它补充修复进度；清空玩具堆后，修好的主角玩具会移到箱子中央并启动。修复项目复用当前玩具模型，不参与本关的收纳槽规则。

## 托盘图标

`public/icons/toys/` 中的 20 张透明 PNG 直接由游戏正在使用的模型渲染，不经过 AI 重绘，因此场景、托盘和三消爆发中的造型保持一致。图标统一为正交相机、3/4 视角、柔光和紧凑透明裁边；`icon-renderer.html` 与 `src/icon-renderer.ts` 是可重复使用的渲染入口。棒棒糖使用正面角度，确保旋纹在小尺寸托盘中仍清晰可见。

## 关卡轮换

- Box 1：仅 3 辆玩具赛车；长时间未选择时显示点击提示，完成一次三消即通关。
- Box 2：6 类基础玩具，共 36 件，进入正式玩法。
- Box 3：7 类机器人、太空和车辆玩具，共 42 件。
- Box 4：9 类高辨识度玩具，共 54 件，加入街机、火车和五种过家家食物玩具。
- Box 5 起：从完整 20 类库中每关轮换 9 类，维持 54 件规模，不让物理堆无限膨胀。

## 包体与许可证

运行时加载 13 个精选玩具 GLB，`public/models/` 全部文件约 1.01 MB。仓库保留的 3 个 Cube Pets 历史素材不再由游戏加载。模型均随构建发布，不依赖第三方 CDN；许可证副本位于 `public/licenses/`。

官方资产页：

- [Kenney Toy Car Kit](https://kenney.nl/assets/toy-car-kit)
- [Kenney Brick Kit](https://kenney.nl/assets/brick-kit)
- [Kenney Space Kit](https://kenney.nl/assets/space-kit)
- [Kenney Mini Arcade](https://kenney.nl/assets/mini-arcade)
- [Kenney Train Kit](https://kenney.nl/assets/train-kit)
- [Kenney Food Kit](https://kenney.nl/assets/food-kit)
- [Kenney Cube Pets](https://kenney.nl/assets/cube-pets)

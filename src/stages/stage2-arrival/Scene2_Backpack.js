import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleImageToSquareSide,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { TEXT_HINT } from '../../utils/typography.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';

/** 第一人称检查背包：按 B 打开背包系统图，按 E 关闭 */
export default class Scene2Backpack extends Phaser.Scene {
  constructor() {
    super({ key: 'AR2BackpackScene' });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image('backpack', gameAssetUrl('backpack.png'));
    this.load.image('bagSystem', gameAssetUrl('bag system.png'));
    this.load.image('village1', gameAssetUrl('Village1.png'));
    this.load.image('notebook3', gameAssetUrl('notebook3.png'));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // 场景底层背景：Village1.png + 暗遮罩
    const sceneBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'village1').setOrigin(0.5, 0.5).setDepth(0);
    setTextureLinearByKey(this, 'village1');
    sceneBg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.5)
      .setDepth(1);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 20;

    const bag = this.add.image(cx, cy, 'backpack').setOrigin(0.5, 0.5).setDepth(2);
    setTextureLinearByKey(this, 'backpack');
    scaleImageToSquareSide(bag, GAME_HEIGHT * 0.9);
    bag.setBlendMode(Phaser.BlendModes.NORMAL);

    // 第二句台词时替换中央图为 notebook3
    const notebookCenter = this.add.image(cx, cy, 'notebook3').setOrigin(0.5, 0.5).setDepth(2).setVisible(false);
    setTextureLinearByKey(this, 'notebook3');
    scaleImageToSquareSide(notebookCenter, GAME_HEIGHT * 0.9);

    const setCenterImage = (lineIndex) => {
      const showNotebook = lineIndex >= 1;
      bag.setVisible(!showNotebook);
      notebookCenter.setVisible(showNotebook);
    };

    const hintText = this.add
      .text(cx, 48, 'Press B to open your pack.', {
        ...TEXT_HINT,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0.5)
      .setDepth(4800);

    // 背包系统覆盖层（深度 5900–6002）
    // 5900: Village1.png 背景
    // 5901: 暗遮罩（与场景一致 alpha 0.5）
    // 6001: bag system.png
    // 6002: "Press E" 提示
    const villageImg = this.add
      .image(cx, GAME_HEIGHT / 2, 'village1')
      .setOrigin(0.5, 0.5)
      .setDepth(5900)
      .setVisible(false);
    setTextureLinearByKey(this, 'village1');
    villageImg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    const bagOverlayDim = this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.5)
      .setDepth(5901)
      .setVisible(false);

    const bagSystemImg = this.add
      .image(cx, GAME_HEIGHT / 2, 'bagSystem')
      .setOrigin(0.5, 0.5)
      .setDepth(6001)
      .setVisible(false);
    setTextureLinearByKey(this, 'bagSystem');
    scaleImageToSquareSide(bagSystemImg, Math.min(GAME_WIDTH, GAME_HEIGHT) * 1.3);

    // 根据 bag system 显示尺寸计算各区域坐标
    const bagW = bagSystemImg.displayWidth;
    const bagH = bagSystemImg.displayHeight;
    const bagLeft = cx - bagW / 2;
    const bagTop  = GAME_HEIGHT / 2 - bagH / 2;

    // 左侧格子第一格（左上角）
    const slotCX   = bagLeft + bagW * 0.086;
    const slotCY   = bagTop  + bagH * 0.197;
    const slotSize = bagW * 0.072;

    const notebook3Img = this.add
      .image(slotCX, slotCY, 'notebook3')
      .setOrigin(0.5, 0.5)
      .setDepth(6003)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    setTextureLinearByKey(this, 'notebook3');
    notebook3Img.setDisplaySize(slotSize, slotSize);

    // 中央详情大图（点击 notebook3 时展示，高分辨率等比缩放）
    const detailCX = bagLeft + bagW * 0.505;
    const detailCY = GAME_HEIGHT / 2;
    const maxDetailW = bagW * 0.33;
    const maxDetailH = bagH * 0.82;

    const notebook3Detail = this.add
      .image(detailCX, detailCY, 'notebook3')
      .setOrigin(0.5, 0.5)
      .setDepth(6010)
      .setVisible(false);
    // 等比缩放：保持原始宽高比，铺满中央区域，不用 setDisplaySize 避免强制拉伸
    {
      const srcW = notebook3Detail.width;
      const srcH = notebook3Detail.height;
      const scale = Math.min(maxDetailW / srcW, maxDetailH / srcH);
      notebook3Detail.setScale(scale);
    }

    // 点击格子中的 notebook3 → 切换详情图
    notebook3Img.on('pointerdown', () => {
      notebook3Detail.setVisible(!notebook3Detail.visible);
    });
    // 点击详情图本身关闭
    notebook3Detail
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => notebook3Detail.setVisible(false));

    const closeHint = this.add
      .text(cx, GAME_HEIGHT - 36, 'Press E to close', {
        ...TEXT_HINT,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(6002)
      .setVisible(false);

    this._bagOpen = false;

    const openBagSystem = () => {
      if (this._bagOpen) return;
      this._bagOpen = true;
      // 显示背包图，隐藏对话框
      villageImg.setVisible(true);
      bagOverlayDim.setVisible(true);
      bagSystemImg.setVisible(true);
      notebook3Img.setVisible(true);
      closeHint.setVisible(true);
      notebook3Detail.setVisible(false); // 每次打开背包重置详情
      dialog.bg.setVisible(false);
      dialog.text.setVisible(false);
      dialog.arrow.setVisible(false);
    };

    const closeBagSystem = () => {
      if (!this._bagOpen) return;
      this._bagOpen = false;
      // 隐藏背包图，恢复对话框
      villageImg.setVisible(false);
      bagOverlayDim.setVisible(false);
      bagSystemImg.setVisible(false);
      notebook3Img.setVisible(false);
      notebook3Detail.setVisible(false);
      closeHint.setVisible(false);
      dialog.bg.setVisible(true);
      dialog.text.setVisible(true);
      dialog.arrow.setVisible(true);
    };

    this._closeBagSystem = closeBagSystem;
    this.input.keyboard.on('keydown-B', () => openBagSystem());
    this.input.keyboard.on('keydown-E', () => closeBagSystem());

    const dialog = createDialogBox(this, GENERIC_DIALOG);
    const lines = [
      'My bag… it came with me.',
      "I'm glad I wrote everything down.",
      'If I can gather the ingredients in time, I can stop Crimson Fever.',
    ];

    let index = 0;
    let ready = false;

    const showLine = (i) => {
      this._ar2LineIndex = i;
      ready = false;
      setCenterImage(i);
      dialog.say(lines[i], () => {
        ready = true;
      });
    };

    const advance = () => {
      if (!ready || this._bagOpen) return;
      index++;
      this._ar2LineIndex = index;
      if (index < lines.length) {
        showLine(index);
      } else {
        this.input.off('pointerdown', advance);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.AR3);
        });
      }
    };

    this._ar2Lines = lines;
    this._ar2Dialog = dialog;
    this._ar2ShowLine = showLine;
    this._ar2Advance = advance;

    const boot = this.sys.settings.data || {};
    const startIdx = typeof boot.ar2LineIndex === 'number' ? boot.ar2LineIndex : 0;
    if (startIdx >= lines.length) {
      let readyDone = false;
      this._ar2LineIndex = lines.length;
      dialog.say(lines[lines.length - 1], () => {
        readyDone = true;
      });
      const finishAr2 = () => {
        if (!readyDone || this._bagOpen) return;
        this.input.off('pointerdown', finishAr2);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.AR3);
        });
      };
      this.input.on('pointerdown', finishAr2);
      addSceneBackButton(this);
      return;
    }

    index = startIdx;
    this._ar2LineIndex = index;
    showLine(index);
    this.input.on('pointerdown', advance);
    addSceneBackButton(this);
  }

  getResumePayload() {
    return { ar2LineIndex: this._ar2LineIndex != null ? this._ar2LineIndex : 0 };
  }

  tryConsumeInternalBack() {
    if (this._bagOpen) {
      this._closeBagSystem && this._closeBagSystem();
      return true;
    }
    if (this._ar2LineIndex == null || this._ar2LineIndex <= 0) return false;
    this.input.off('pointerdown', this._ar2Advance);
    this._ar2LineIndex--;
    this._ar2ShowLine(this._ar2LineIndex);
    this.input.on('pointerdown', this._ar2Advance);
    return true;
  }
}
